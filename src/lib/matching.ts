import { supabase } from "@/lib/supabase";
import type {
  InstitutionMatchRunRow,
  InstitutionMatchRow,
  ChallengeInstitutionSelectionRow,
  InstitutionRow,
} from "@/types/database";

export interface MatchWithInstitution extends InstitutionMatchRow {
  institution: InstitutionRow;
}

export interface SelectionWithInstitution extends ChallengeInstitutionSelectionRow {
  institution: InstitutionRow;
}

export interface RunMatchingResponse {
  success: boolean;
  matchRunId: string;
  totalEvaluated: number;
  top10Count: number;
  durationMs: number;
  challengeStatus: string;
}

/**
 * Trigger the AI-assisted institution matching Edge Function for an innovation challenge.
 */
export async function runInstitutionMatching(
  challengeId: string,
  rerun: boolean = false
): Promise<RunMatchingResponse> {
  const response = await supabase.functions.invoke<RunMatchingResponse & { error?: string }>(
    "match-institutions",
    {
      body: {
        challengeId,
        rerun,
      },
    }
  );

  if (response.error) {
    const errorMsg =
      response.error instanceof Error
        ? response.error.message
        : "Failed to run institution matching";
    throw new Error(errorMsg);
  }

  if (response.data?.error) {
    throw new Error(response.data.error);
  }

  if (!response.data || !response.data.success) {
    throw new Error("Invalid response from matching service");
  }

  return response.data;
}

/**
 * Fetch the latest match run for a challenge.
 */
export async function fetchLatestMatchRun(
  challengeId: string
): Promise<InstitutionMatchRunRow | null> {
  const { data, error } = await supabase
    .from("institution_match_runs")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("fetchLatestMatchRun error:", error);
    throw error;
  }

  return data;
}

/**
 * Fetch all matches for a specific match run, ordered by rank ascending.
 * Includes joined institution record.
 */
export async function fetchMatchesForRun(
  matchRunId: string
): Promise<MatchWithInstitution[]> {
  const { data, error } = await supabase
    .from("institution_matches")
    .select(`
      *,
      institution:institutions(*)
    `)
    .eq("match_run_id", matchRunId)
    .order("rank", { ascending: true });

  if (error) {
    console.error("fetchMatchesForRun error:", error);
    throw error;
  }

  // Filter out any where institution join failed
  return (data ?? []).filter((m): m is MatchWithInstitution => Boolean(m.institution));
}

/**
 * Fetch existing selections for a challenge.
 */
export async function fetchChallengeSelections(
  challengeId: string
): Promise<SelectionWithInstitution[]> {
  const { data, error } = await supabase
    .from("challenge_institution_selections")
    .select(`
      *,
      institution:institutions(*)
    `)
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchChallengeSelections error:", error);
    throw error;
  }

  return (data ?? []).filter((s): s is SelectionWithInstitution => Boolean(s.institution));
}

export interface SelectionInput {
  institutionId: string;
  matchRunId?: string | null;
  selectionRank?: number | null;
  isManualOverride: boolean;
  overrideReason?: string | null;
}

/**
 * Save selected institutions for outreach (1 to 5).
 * Validates constraints (max 5, manual override must have >= 10 char reason).
 * Updates challenge status to INSTITUTIONS_SELECTED.
 */
export async function confirmInstitutionSelections(
  challengeId: string,
  selections: SelectionInput[]
): Promise<void> {
  if (selections.length === 0) {
    throw new Error("Please select at least 1 institution.");
  }
  if (selections.length > 5) {
    throw new Error("You can select at most 5 institutions.");
  }

  for (const s of selections) {
    if (s.isManualOverride) {
      if (!s.overrideReason || s.overrideReason.trim().length < 10) {
        throw new Error(
          "Manual override selections require a justification reason of at least 10 characters."
        );
      }
    }
  }

  // Get current user id from supabase auth/profile
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  let profileId: string | null = null;
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .maybeSingle();
    profileId = profile?.id ?? null;
  }

  if (!profileId) {
    // If no profile found by clerk_user_id, try fetching first admin or innovation manager profile for fallback
    const { data: fallbackProfile } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["INNOVATION_MANAGER", "ADMIN"])
      .limit(1)
      .maybeSingle();
    profileId = fallbackProfile?.id ?? null;
  }

  if (!profileId) {
    throw new Error("Could not identify current user profile for recording selection.");
  }

  // Delete existing selections for this challenge
  const { error: deleteError } = await supabase
    .from("challenge_institution_selections")
    .delete()
    .eq("challenge_id", challengeId);

  if (deleteError) {
    console.error("Error clearing existing selections:", deleteError);
    throw deleteError;
  }

  // Insert new selections
  const rowsToInsert = selections.map((s) => ({
    challenge_id: challengeId,
    institution_id: s.institutionId,
    match_run_id: s.matchRunId || null,
    selected_by: profileId,
    selection_rank: s.selectionRank ?? null,
    is_manual_override: s.isManualOverride,
    override_reason: s.overrideReason?.trim() || null,
    status: "SELECTED_FOR_OUTREACH" as const,
    selected_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from("challenge_institution_selections")
    .insert(rowsToInsert);

  if (insertError) {
    console.error("Error inserting selections:", insertError);
    throw insertError;
  }

  // Update challenge status to INSTITUTIONS_SELECTED
  const { error: challengeUpdateError } = await supabase
    .from("innovation_challenges")
    .update({
      status: "INSTITUTIONS_SELECTED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", challengeId);

  if (challengeUpdateError) {
    console.error("Error updating challenge status:", challengeUpdateError);
    throw challengeUpdateError;
  }
}

/**
 * Search active verified institutions not currently in the exclusion list.
 * Useful for the Manual Override picker.
 */
export async function searchEligibleInstitutions(
  term: string,
  excludeIds: string[] = []
): Promise<InstitutionRow[]> {
  let query = supabase
    .from("institutions")
    .select("*")
    .eq("verification_status", "VERIFIED")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(20);

  if (term.trim()) {
    const q = term.trim();
    query = query.or(
      `name.ilike.%${q}%,official_name.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%,acronym.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("searchEligibleInstitutions error:", error);
    throw error;
  }

  const excludeSet = new Set(excludeIds);
  return (data ?? []).filter((inst) => !excludeSet.has(inst.id));
}
