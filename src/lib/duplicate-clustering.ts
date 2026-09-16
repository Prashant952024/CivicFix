import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

export type IssueRow = Database["public"]["Tables"]["issues"]["Row"];
export type IssueDuplicateRow = Database["public"]["Tables"]["issue_duplicates"]["Row"];
export type ResolutionVerificationRow = Database["public"]["Tables"]["resolution_verifications"]["Row"];

export interface LinkedCitizenReport {
  id: string;
  title: string;
  description: string;
  category: string;
  status: Database["public"]["Enums"]["issue_status"];
  location_text: string | null;
  address_text: string | null;
  latitude: string | null;
  longitude: string | null;
  created_at: string;
  reporter_id: string;
  reporter_name?: string | null;
  images: Array<{
    id: string;
    storage_path: string;
    image_type: string;
  }>;
  verification?: ResolutionVerificationRow | null;
}

export interface DuplicateCandidateItem {
  id: string;
  duplicate_id: string;
  source_issue_id: string;
  duplicate_issue_id: string;
  candidate_issue_id: string;
  candidate_title: string;
  candidate_category: string | null;
  candidate_status: string;
  candidate_location_text: string | null;
  candidate_created_at: string;
  similarity_score: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  status: Database["public"]["Enums"]["duplicate_status"];
  detection_method: Database["public"]["Enums"]["duplicate_detection_method"];
  matching_signals: {
    distance_meters?: number | null;
    category_match_score?: number;
    time_diff_days?: number;
    text_similarity_score?: number;
    signals?: string[];
  };
  image_similarity_score?: number | null;
  image_signals?: Record<string, unknown>;
  candidate_image_url?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_notes?: string | null;
}

interface RawChildIssue {
  id: string;
  title: string;
  description: string;
  category: string;
  status: Database["public"]["Enums"]["issue_status"];
  location_text: string | null;
  address_text: string | null;
  latitude: string | null;
  longitude: string | null;
  created_at: string;
  reporter_profile_id: string;
  reporter?: { id: string; full_name: string | null } | null;
  issue_images?: Array<{ id: string; storage_path: string; image_type: string }> | null;
  resolution_verifications?: ResolutionVerificationRow[] | null;
}

interface RawCandidateIssue {
  id: string;
  title: string;
  category: string | null;
  status: string;
  location_text: string | null;
  address_text: string | null;
  created_at: string;
  issue_images?: Array<{ id: string; storage_path: string; image_type: string }> | null;
}

/**
 * Fetch all citizen reports clustered under a canonical operational issue
 */
export async function fetchLinkedReportsForCanonicalIssue(
  canonicalIssueId: string,
): Promise<LinkedCitizenReport[]> {
  try {
    const { data: childIssues, error } = await supabase
      .from("issues")
      .select(`
        id,
        title,
        description,
        category,
        status,
        location_text,
        address_text,
        latitude,
        longitude,
        created_at,
        reporter_profile_id,
        reporter:profiles!issues_reporter_profile_id_fkey(id, full_name),
        issue_images(id, storage_path, image_type),
        resolution_verifications(id, issue_id, citizen_id, result, feedback, created_at)
      `)
      .eq("canonical_issue_id", canonicalIssueId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching linked reports:", error);
      return [];
    }

    const typedChildren = (childIssues || []) as unknown as RawChildIssue[];

    return typedChildren.map((issue) => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      status: issue.status,
      location_text: issue.location_text,
      address_text: issue.address_text,
      latitude: issue.latitude,
      longitude: issue.longitude,
      created_at: issue.created_at,
      reporter_id: issue.reporter_profile_id,
      reporter_name: issue.reporter?.full_name || "Citizen Reporter",
      images: (issue.issue_images || []).map((img) => ({
        id: img.id,
        storage_path: img.storage_path,
        image_type: img.image_type,
      })),
      verification: Array.isArray(issue.resolution_verifications) && issue.resolution_verifications.length > 0
        ? issue.resolution_verifications[0]
        : null,
    }));
  } catch (err) {
    console.error("Unexpected error fetching linked reports:", err);
    return [];
  }
}

/**
 * Fetch duplicate candidate pairs for an issue
 */
export async function fetchDuplicateCandidates(
  issueId: string,
): Promise<DuplicateCandidateItem[]> {
  try {
    const { data: duplicates, error } = await supabase
      .from("issue_duplicates")
      .select(`
        id,
        source_issue_id,
        duplicate_issue_id,
        similarity_score,
        confidence_score,
        confidence,
        detection_method,
        status,
        matching_signals,
        image_similarity_score,
        image_signals,
        reviewed_at,
        reviewed_by,
        review_notes,
        source_issue:issues!issue_duplicates_source_issue_id_fkey(
          id, title, category, status, location_text, address_text, created_at,
          issue_images(id, storage_path, image_type)
        ),
        duplicate_issue:issues!issue_duplicates_duplicate_issue_id_fkey(
          id, title, category, status, location_text, address_text, created_at,
          issue_images(id, storage_path, image_type)
        )
      `)
      .or(`source_issue_id.eq.${issueId},duplicate_issue_id.eq.${issueId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching duplicate candidates:", error);
      return [];
    }

    const items: DuplicateCandidateItem[] = [];

    for (const raw of duplicates || []) {
      const isSource = raw.source_issue_id === issueId;
      const candidate = isSource ? raw.duplicate_issue : raw.source_issue;

      if (!candidate) continue;

      const candObj = candidate as unknown as RawCandidateIssue;
      const candImgs = Array.isArray(candObj.issue_images) ? candObj.issue_images : [];
      const firstImg = candImgs[0];
      let imgUrl: string | null = null;
      if (firstImg?.storage_path) {
        const { data: pubData } = supabase.storage.from("issue-images").getPublicUrl(firstImg.storage_path);
        imgUrl = pubData?.publicUrl || null;
      }

      const score = raw.similarity_score ?? raw.confidence_score ?? 0.5;
      const signals: Record<string, unknown> = raw.matching_signals ?? {};

      items.push({
        id: raw.id,
        duplicate_id: raw.id,
        source_issue_id: raw.source_issue_id,
        duplicate_issue_id: raw.duplicate_issue_id,
        candidate_issue_id: candObj.id,
        candidate_title: candObj.title,
        candidate_category: candObj.category,
        candidate_status: candObj.status,
        candidate_location_text: candObj.address_text || candObj.location_text || null,
        candidate_created_at: candObj.created_at,
        similarity_score: score,
        confidence: (raw.confidence as "HIGH" | "MEDIUM" | "LOW") || (score >= 0.8 ? "HIGH" : score >= 0.6 ? "MEDIUM" : "LOW"),
        status: raw.status,
        detection_method: raw.detection_method,
        matching_signals: {
          distance_meters: typeof signals.distance_meters === "number" ? signals.distance_meters : null,
          category_match_score: typeof signals.category_match_score === "number" ? signals.category_match_score : 0,
          time_diff_days: typeof signals.time_diff_days === "number" ? signals.time_diff_days : 0,
          text_similarity_score: typeof signals.text_similarity_score === "number" ? signals.text_similarity_score : 0,
          signals: Array.isArray(signals.signals) ? signals.signals : [],
        },
        image_similarity_score: raw.image_similarity_score,
        image_signals: (raw.image_signals as Record<string, unknown>) || {},
        candidate_image_url: imgUrl,
        reviewed_at: raw.reviewed_at,
        reviewed_by: raw.reviewed_by,
        review_notes: raw.review_notes,
      });
    }

    return items;
  } catch (err) {
    console.error("Unexpected error fetching duplicate candidates:", err);
    return [];
  }
}

/**
 * Confirm a duplicate candidate and link it to the canonical operational issue
 */
export async function confirmDuplicateAndLink(
  duplicateId: string,
  canonicalIssueId: string,
  childIssueId: string,
  reviewerProfileId: string,
  reviewNotes: string = "Confirmed duplicate civic problem clustered into canonical issue.",
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Update duplicate candidate review record
    const { error: dupError } = await supabase
      .from("issue_duplicates")
      .update({
        status: "CONFIRMED",
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerProfileId,
        review_notes: reviewNotes,
      })
      .eq("id", duplicateId);

    if (dupError) {
      return { success: false, error: dupError.message };
    }

    // 2. Link child issue to canonical issue
    const { data: updatedChild, error: linkError } = await supabase
      .from("issues")
      .update({
        canonical_issue_id: canonicalIssueId,
        duplicate_status: "CONFIRMED_DUPLICATE",
        merged_at: new Date().toISOString(),
        merged_by: reviewerProfileId,
      })
      .eq("id", childIssueId)
      .select("id, reporter_profile_id, title")
      .single();

    if (linkError) {
      return { success: false, error: linkError.message };
    }

    // 3. Send informational notification to the linked citizen reporter
    if (updatedChild?.reporter_profile_id) {
      const shortRef = canonicalIssueId.slice(0, 8).toUpperCase();
      await supabase.from("notifications").insert({
        recipient_profile_id: updatedChild.reporter_profile_id,
        notification_type: "SYSTEM",
        title: "Report Linked to Existing Civic Issue",
        message: `Your report has been linked to existing civic issue #${shortRef} affecting the same location. You will receive live updates as work progresses and can verify the resolution once completed.`,
        related_issue_id: childIssueId,
      });
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to confirm duplicate" };
  }
}

/**
 * Reject a duplicate candidate pair (mark as distinct issues)
 */
export async function rejectDuplicateCandidate(
  duplicateId: string,
  candidateIssueId: string,
  reviewerProfileId: string,
  reviewNotes: string = "Verified as a separate, distinct civic problem.",
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: dupError } = await supabase
      .from("issue_duplicates")
      .update({
        status: "REJECTED",
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerProfileId,
        review_notes: reviewNotes,
      })
      .eq("id", duplicateId);

    if (dupError) {
      return { success: false, error: dupError.message };
    }

    // Mark issue duplicate_status as KEPT_SEPARATE if not already linked
    await supabase
      .from("issues")
      .update({
        duplicate_status: "KEPT_SEPARATE",
      })
      .eq("id", candidateIssueId)
      .is("canonical_issue_id", null);

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to reject duplicate" };
  }
}
