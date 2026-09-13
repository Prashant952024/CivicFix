import { supabase } from "@/lib/supabase";
import type { Database, InstitutionInvitationRow, InstitutionRow } from "@/types/database";

type ChallengeRow = Database["public"]["Tables"]["innovation_challenges"]["Row"];

export type InvitationStatus = InstitutionInvitationRow["status"];

export interface ChallengeInvitationWithDetails extends InstitutionInvitationRow {
  institution: Pick<
    InstitutionRow,
    "id" | "name" | "official_name" | "institution_type" | "city" | "state" | "verification_status" | "acronym"
  >;
  invited_by_profile?: {
    id: string;
    full_name: string;
    email: string | null;
  } | null;
  responded_by_profile?: {
    id: string;
    full_name: string;
    email: string | null;
  } | null;
  match_evidence?: {
    overall_score: number;
    structured_score: number;
    ai_score: number | null;
    confidence: string;
    recommended_role: string | null;
    strengths: string[];
    match_explanation: string | null;
  } | null;
}

export interface InstitutionReceivedInvitation extends InstitutionInvitationRow {
  challenge: Pick<
    ChallengeRow,
    | "id"
    | "title"
    | "problem_statement"
    | "category"
    | "geographic_scope"
    | "required_domains"
    | "potential_technology_areas"
    | "objectives"
    | "expected_outcomes"
    | "constraints"
    | "research_requirements"
    | "success_criteria"
    | "status"
  >;
  invited_by_profile?: {
    id: string;
    full_name: string;
  } | null;
  match_evidence?: {
    overall_score: number;
    confidence: string;
    recommended_role: string | null;
    strengths: string[];
    match_explanation: string | null;
  } | null;
}

/**
 * Fetch all invitations dispatched for an innovation challenge.
 */
export async function fetchChallengeInvitations(
  challengeId: string
): Promise<ChallengeInvitationWithDetails[]> {
  const { data, error } = await supabase
    .from("institution_invitations")
    .select(`
      *,
      institution:institutions!institution_invitations_institution_id_fkey(
        id, name, official_name, institution_type, city, state, verification_status, acronym
      ),
      invited_by_profile:profiles!institution_invitations_invited_by_fkey(
        id, full_name, email
      ),
      responded_by_profile:profiles!institution_invitations_responded_by_fkey(
        id, full_name, email
      )
    `)
    .eq("challenge_id", challengeId)
    .order("invited_at", { ascending: false });

  if (error) {
    console.error("Error fetching challenge invitations:", error);
    throw error;
  }

  if (!data) return [];

  // Also query matches for these institutions to attach match evidence
  const institutionIds = data.map((inv) => inv.institution_id);
  const matchMap = new Map<string, ChallengeInvitationWithDetails["match_evidence"]>();

  if (institutionIds.length > 0) {
    const { data: matches } = await supabase
      .from("institution_matches")
      .select("institution_id, overall_score, structured_score, ai_score, confidence, recommended_role, strengths, match_explanation")
      .eq("challenge_id", challengeId)
      .in("institution_id", institutionIds);

    if (matches) {
      matches.forEach((m) => {
        matchMap.set(m.institution_id, {
          overall_score: Number(m.overall_score),
          structured_score: Number(m.structured_score),
          ai_score: m.ai_score ? Number(m.ai_score) : null,
          confidence: m.confidence,
          recommended_role: m.recommended_role,
          strengths: m.strengths || [],
          match_explanation: m.match_explanation,
        });
      });
    }
  }

  return (data as unknown as ChallengeInvitationWithDetails[]).map((inv) => ({
    ...inv,
    match_evidence: matchMap.get(inv.institution_id) || null,
  }));
}

export interface SendInvitationsParams {
  challengeId: string;
  message: string;
  clerkUserId?: string;
}

export interface SendInvitationsResult {
  success: boolean;
  createdCount: number;
  existingCount: number;
  totalSelected: number;
}

/**
 * Dispatch invitations to all selected institutions for an approved challenge.
 * Strictly enforces that only institutions with active selections receive invitations.
 */
export async function sendInstitutionInvitations(
  params: SendInvitationsParams
): Promise<SendInvitationsResult> {
  const { challengeId, message, clerkUserId } = params;

  if (!message || message.trim().length === 0) {
    throw new Error("Invitation message is required.");
  }

  // 1. Fetch Challenge & Verify State
  const { data: challenge, error: chError } = await supabase
    .from("innovation_challenges")
    .select("id, title, status, source_issue_id")
    .eq("id", challengeId)
    .single();

  if (chError || !challenge) {
    throw new Error("Innovation challenge not found.");
  }

  const eligibleChallengeStatuses = [
    "APPROVED",
    "INSTITUTIONS_SELECTED",
    "READY_FOR_INVITATION",
    "INVITATIONS_SENT",
  ];

  if (!eligibleChallengeStatuses.includes(challenge.status)) {
    throw new Error(
      `Cannot send invitations for challenge in status '${challenge.status}'. Challenge must be approved and have institutions selected.`
    );
  }

  // 2. Resolve caller profile
  let callerProfileId: string | null = null;
  if (clerkUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();
    callerProfileId = profile?.id ?? null;
  }

  if (!callerProfileId) {
    const { data: fallbackProfile } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["INNOVATION_MANAGER", "ADMIN"])
      .limit(1)
      .maybeSingle();
    callerProfileId = fallbackProfile?.id ?? null;
  }

  if (!callerProfileId) {
    throw new Error("Could not determine authenticated user profile for sending invitations.");
  }

  // 3. Fetch active selections for this challenge
  const { data: selections, error: selError } = await supabase
    .from("challenge_institution_selections")
    .select(`
      id,
      institution_id,
      institution:institutions!challenge_institution_selections_institution_id_fkey(
        id, name, verification_status, is_active
      )
    `)
    .eq("challenge_id", challengeId)
    .eq("status", "SELECTED_FOR_OUTREACH");

  if (selError) {
    console.error("Error fetching challenge selections:", selError);
    throw selError;
  }

  if (!selections || selections.length === 0) {
    throw new Error("No institutions have been selected for this challenge. Please select institutions first.");
  }

  // Verify selections count <= 5
  if (selections.length > 5) {
    throw new Error("Cannot send invitations to more than 5 institutions (governance limit exceeded).");
  }

  // 4. Check existing invitations (idempotency protection)
  const { data: existingInvitations, error: existError } = await supabase
    .from("institution_invitations")
    .select("institution_id, status")
    .eq("challenge_id", challengeId);

  if (existError) {
    console.error("Error checking existing invitations:", existError);
    throw existError;
  }

  const existingMap = new Map((existingInvitations || []).map((inv) => [inv.institution_id, inv.status]));

  // 5. Filter for eligible recipients not yet invited
  const invitationsToInsert: Array<{
    challenge_id: string;
    institution_id: string;
    selection_id: string;
    status: "SENT";
    invited_by: string;
    invitation_message: string;
    invited_at: string;
  }> = [];

  let existingCount = 0;

  for (const sel of selections) {
    const inst = sel.institution as unknown as { id: string; name: string; verification_status: string; is_active: boolean };
    
    // Invariant check: institution must be verified and active
    if (inst.verification_status !== "VERIFIED" || !inst.is_active) {
      console.warn(`Skipping unverified or inactive institution: ${inst.name}`);
      continue;
    }

    if (existingMap.has(sel.institution_id)) {
      existingCount++;
    } else {
      invitationsToInsert.push({
        challenge_id: challengeId,
        institution_id: sel.institution_id,
        selection_id: sel.id,
        status: "SENT",
        invited_by: callerProfileId,
        invitation_message: message.trim(),
        invited_at: new Date().toISOString(),
      });
    }
  }

  let createdCount = 0;

  if (invitationsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("institution_invitations")
      .insert(invitationsToInsert);

    if (insertError) {
      console.error("Error creating institution invitations:", insertError);
      throw insertError;
    }

    createdCount = invitationsToInsert.length;

    // 6. Send in-app notifications to coordinators of the invited institutions
    for (const inv of invitationsToInsert) {
      try {
        await notifyInstitutionOfInvitation({
          challengeId,
          challengeTitle: challenge.title,
          institutionId: inv.institution_id,
          sourceIssueId: challenge.source_issue_id,
        });
      } catch (notifErr) {
        console.warn(`Failed to dispatch in-app notification for institution ${inv.institution_id}:`, notifErr);
      }
    }
  }

  // 7. Update challenge status to INVITATIONS_SENT
  if (challenge.status !== "INVITATIONS_SENT") {
    const { error: updateError } = await supabase
      .from("innovation_challenges")
      .update({
        status: "INVITATIONS_SENT",
        updated_at: new Date().toISOString(),
      })
      .eq("id", challengeId);

    if (updateError) {
      console.warn("Notice: Challenge status update to INVITATIONS_SENT returned:", updateError);
    }
  }

  return {
    success: true,
    createdCount,
    existingCount,
    totalSelected: selections.length,
  };
}

/**
 * Cancel an active invitation (Innovation Manager or Admin action).
 */
export async function cancelInstitutionInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from("institution_invitations")
    .update({
      status: "CANCELLED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", invitationId);

  if (error) {
    console.error("Error cancelling invitation:", error);
    throw error;
  }
}

/**
 * Fetch all invitations received by a specific institution.
 */
export async function fetchInstitutionInvitations(
  institutionId: string
): Promise<InstitutionReceivedInvitation[]> {
  const { data, error } = await supabase
    .from("institution_invitations")
    .select(`
      *,
      challenge:innovation_challenges!institution_invitations_challenge_id_fkey(
        id, title, problem_statement, category, geographic_scope, required_domains,
        potential_technology_areas, objectives, expected_outcomes, constraints,
        research_requirements, success_criteria, status
      ),
      invited_by_profile:profiles!institution_invitations_invited_by_fkey(
        id, full_name
      )
    `)
    .eq("institution_id", institutionId)
    .order("invited_at", { ascending: false });

  if (error) {
    console.error("Error fetching institution invitations:", error);
    throw error;
  }

  if (!data) return [];

  // Attach match evidence for each challenge
  const challengeIds = data.map((d) => d.challenge_id);
  const matchMap = new Map<string, InstitutionReceivedInvitation["match_evidence"]>();

  if (challengeIds.length > 0) {
    const { data: matches } = await supabase
      .from("institution_matches")
      .select("challenge_id, overall_score, confidence, recommended_role, strengths, match_explanation")
      .eq("institution_id", institutionId)
      .in("challenge_id", challengeIds);

    if (matches) {
      matches.forEach((m) => {
        matchMap.set(m.challenge_id, {
          overall_score: Number(m.overall_score),
          confidence: m.confidence,
          recommended_role: m.recommended_role,
          strengths: m.strengths || [],
          match_explanation: m.match_explanation,
        });
      });
    }
  }

  return (data as unknown as InstitutionReceivedInvitation[]).map((inv) => ({
    ...inv,
    match_evidence: matchMap.get(inv.challenge_id) || null,
  }));
}

export interface RespondToInvitationParams {
  invitationId: string;
  decision: "ACCEPTED" | "REJECTED";
  note?: string;
  reason?: string;
  clerkUserId?: string;
}

/**
 * Respond to an invitation (Accept or Decline).
 * Only authorized institution members can respond to invitations for their institution.
 */
export async function respondToInvitation(
  params: RespondToInvitationParams
): Promise<void> {
  const { invitationId, decision, note, reason, clerkUserId } = params;

  if (decision === "REJECTED") {
    const trimmedReason = (reason || "").trim();
    if (trimmedReason.length < 10) {
      throw new Error("A meaningful rejection reason (minimum 10 characters) is required.");
    }
  }

  // Resolve caller profile
  let callerProfileId: string | null = null;
  if (clerkUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();
    callerProfileId = profile?.id ?? null;
  }

  // Fetch current invitation to verify state and get manager to notify
  const { data: currentInv, error: fetchError } = await supabase
    .from("institution_invitations")
    .select(`
      id,
      challenge_id,
      institution_id,
      status,
      invited_by,
      institution:institutions!institution_invitations_institution_id_fkey(name),
      challenge:innovation_challenges!institution_invitations_challenge_id_fkey(title, source_issue_id)
    `)
    .eq("id", invitationId)
    .single();

  if (fetchError || !currentInv) {
    throw new Error("Invitation record not found.");
  }

  if (["ACCEPTED", "REJECTED", "CANCELLED"].includes(currentInv.status)) {
    throw new Error(`This invitation has already been ${currentInv.status.toLowerCase()}.`);
  }

  // Update invitation record (Postgres RLS will enforce that caller owns the institution)
  const updatePayload: {
    status: "ACCEPTED" | "REJECTED";
    responded_at: string;
    responded_by: string | null;
    response_note: string | null;
    rejection_reason: string | null;
    updated_at: string;
  } = {
    status: decision,
    responded_at: new Date().toISOString(),
    responded_by: callerProfileId,
    response_note: decision === "ACCEPTED" ? (note?.trim() || null) : null,
    rejection_reason: decision === "REJECTED" ? (reason?.trim() || null) : null,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("institution_invitations")
    .update(updatePayload)
    .eq("id", invitationId);

  if (updateError) {
    console.error("Error updating invitation response:", updateError);
    throw updateError;
  }

  // Notify the Innovation Manager who sent the invitation
  if (currentInv.invited_by) {
    try {
      const instName = currentInv.institution?.name || "An institution";
      const chalTitle = currentInv.challenge?.title || "Innovation Challenge";
      const sourceIssueId = currentInv.challenge?.source_issue_id;

      await supabase.from("notifications").insert({
        recipient_profile_id: currentInv.invited_by,
        notification_type: "SYSTEM",
        title: `${instName} ${decision === "ACCEPTED" ? "accepted" : "declined"} outreach invitation`,
        message: `${instName} has ${decision === "ACCEPTED" ? "accepted" : "declined"} the collaboration invitation for "${chalTitle}".${decision === "REJECTED" && reason ? ` Reason: "${reason.trim()}"` : ""}`,
        related_issue_id: sourceIssueId || null,
        created_at: new Date().toISOString(),
      });
    } catch (notifErr) {
      console.warn("Failed to notify manager of invitation response:", notifErr);
    }
  }
}

/**
 * Helper to dispatch in-app notifications to all coordinators of an invited institution.
 */
async function notifyInstitutionOfInvitation(params: {
  challengeId: string;
  challengeTitle: string;
  institutionId: string;
  sourceIssueId?: string | null;
}): Promise<void> {
  const { challengeTitle, institutionId, sourceIssueId } = params;

  // Find recipient profiles for this institution (institution members or profile.institution_id)
  const [membersRes, profilesRes] = await Promise.all([
    supabase
      .from("institution_members")
      .select("profile_id")
      .eq("institution_id", institutionId),
    supabase
      .from("profiles")
      .select("id")
      .eq("institution_id", institutionId),
  ]);

  const recipientIds = new Set<string>();
  membersRes.data?.forEach((m) => recipientIds.add(m.profile_id));
  profilesRes.data?.forEach((p) => recipientIds.add(p.id));

  if (recipientIds.size === 0) return;

  const notificationsToInsert = Array.from(recipientIds).map((profileId) => ({
    recipient_profile_id: profileId,
    notification_type: "SYSTEM" as const,
    title: `Collaboration Invitation: ${challengeTitle}`,
    message: `Your institution has been invited by CivicFix Innovation Management to collaborate on the innovation challenge "${challengeTitle}". Review the challenge dossier to accept or decline.`,
    related_issue_id: sourceIssueId || null,
    created_at: new Date().toISOString(),
  }));

  await supabase.from("notifications").insert(notificationsToInsert);
}
