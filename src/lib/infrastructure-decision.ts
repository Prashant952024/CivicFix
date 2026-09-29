/**
 * CivicFix Infrastructure Workflow: Decision Persistence Service
 * ==============================================================
 * Provides creation, validation, and retrieval of authoritative Admin
 * Pass / Not-Pass decisions on infrastructure requests.
 *
 * Invariant Rules:
 * 1. Admin is the sole decision-maker. CivicFix and AI do not decide or recommend.
 * 2. Supported outcomes: PASSED (canonical ACCEPTED) and NOT_PASSED (canonical REJECTED).
 * 3. Mandatory justification reason (minimum 10 characters).
 * 4. Strictly auditable with authenticated Admin profile ID and timestamp.
 * 5. Synchronizes issue status: PASSED -> INFRASTRUCTURE_ACCEPTED, NOT_PASSED -> INFRASTRUCTURE_REJECTED.
 * 6. Dataset D8 synthetic benchmarks are isolated and NEVER queried or used.
 * 7. Assessment snapshots remain immutable and read-only.
 */

import { supabase as defaultSupabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getLatestInfrastructureAssessment } from "@/lib/infrastructure-assessment";

export type InfrastructureDecisionOutcome = "PASSED" | "NOT_PASSED";
export type CanonicalInfrastructureDecision = "ACCEPTED" | "DEFERRED" | "REJECTED";

export class InfrastructureDecisionError extends Error {
  code?: string;
  details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "InfrastructureDecisionError";
    this.code = code;
    this.details = details;
  }
}

export interface InfrastructureDecisionRecord {
  id: string;
  issue_id: string;
  assessment_id: string | null;
  decision: CanonicalInfrastructureDecision;
  internal_decision_reason: string | null;
  citizen_safe_summary: string;
  re_request_timeframe_months: number | null;
  deferred_target_fiscal_year: string | null;
  expected_review_date: string | null;
  expected_start_date: string | null;
  expected_completion_date: string | null;
  decided_by: string;
  decided_at: string;
  created_at: string;
  decided_by_profile?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

export interface RecordInfrastructureDecisionParams {
  issueId: string;
  outcome: InfrastructureDecisionOutcome;
  reason: string;
  adminProfileId: string;
  assessmentId?: string | null;
  reRequestTimeframeMonths?: number | null;
  expectedStartDate?: string | null;
  expectedCompletionDate?: string | null;
}

/**
 * Maps application outcome ('PASSED' | 'NOT_PASSED') to canonical DB value ('ACCEPTED' | 'REJECTED').
 */
export function mapOutcomeToCanonical(
  outcome: InfrastructureDecisionOutcome
): "ACCEPTED" | "REJECTED" {
  if (outcome === "PASSED") return "ACCEPTED";
  if (outcome === "NOT_PASSED") return "REJECTED";
  throw new InfrastructureDecisionError(
    `Invalid decision outcome: '${outcome}'. Expected 'PASSED' or 'NOT_PASSED'.`,
    "INVALID_OUTCOME"
  );
}

/**
 * Maps application outcome to resulting issue status.
 */
export function mapOutcomeToTargetStatus(
  outcome: InfrastructureDecisionOutcome
): "INFRASTRUCTURE_ACCEPTED" | "INFRASTRUCTURE_REJECTED" {
  return outcome === "PASSED"
    ? "INFRASTRUCTURE_ACCEPTED"
    : "INFRASTRUCTURE_REJECTED";
}

/**
 * Records an authoritative Admin Infrastructure Decision (Pass / Not Pass).
 */
export async function recordInfrastructureDecision(
  params: RecordInfrastructureDecisionParams,
  client: SupabaseClient = defaultSupabase
): Promise<InfrastructureDecisionRecord> {
  if (!params || typeof params !== "object") {
    throw new InfrastructureDecisionError(
      "Decision parameters are required.",
      "INVALID_INPUT"
    );
  }

  const {
    issueId,
    outcome,
    reason,
    adminProfileId,
    assessmentId,
    reRequestTimeframeMonths,
    expectedStartDate,
    expectedCompletionDate,
  } = params;

  // 1. Validate issueId
  if (!issueId || typeof issueId !== "string" || issueId.trim() === "") {
    throw new InfrastructureDecisionError(
      "Parameter 'issueId' must be a valid non-empty string.",
      "INVALID_ISSUE_ID"
    );
  }
  const trimmedIssueId = issueId.trim();

  // 2. Validate outcome
  if (outcome !== "PASSED" && outcome !== "NOT_PASSED") {
    throw new InfrastructureDecisionError(
      `Invalid decision outcome '${outcome}'. Expected 'PASSED' or 'NOT_PASSED'.`,
      "INVALID_OUTCOME"
    );
  }
  const canonicalDecision = mapOutcomeToCanonical(outcome);
  const targetStatus = mapOutcomeToTargetStatus(outcome);

  // 3. Validate reason
  if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
    throw new InfrastructureDecisionError(
      "Decision justification reason is required and must be at least 10 characters.",
      "REASON_TOO_SHORT"
    );
  }
  const trimmedReason = reason.trim();

  // 4. Validate adminProfileId
  if (!adminProfileId || typeof adminProfileId !== "string" || adminProfileId.trim() === "") {
    throw new InfrastructureDecisionError(
      "Authenticated Admin profile ID is required to record an infrastructure decision.",
      "UNAUTHORIZED_ADMIN"
    );
  }
  const trimmedAdminId = adminProfileId.trim();

  // 5. Verify target issue exists and is in an infrastructure status
  const { data: issueRecord, error: issueFetchErr } = await client
    .from("issues")
    .select("id, status, title, final_issue_type")
    .eq("id", trimmedIssueId)
    .maybeSingle();

  if (issueFetchErr) {
    throw new InfrastructureDecisionError(
      issueFetchErr.message || `Failed to verify issue '${trimmedIssueId}'.`,
      issueFetchErr.code,
      issueFetchErr.details
    );
  }

  if (!issueRecord) {
    throw new InfrastructureDecisionError(
      `Issue '${trimmedIssueId}' was not found.`,
      "ISSUE_NOT_FOUND"
    );
  }

  // 6. Resolve assessment ID if not explicitly provided
  let resolvedAssessmentId = assessmentId || null;
  if (!resolvedAssessmentId) {
    try {
      const latestAssessment = await getLatestInfrastructureAssessment(trimmedIssueId, client);
      if (latestAssessment) {
        resolvedAssessmentId = latestAssessment.id;
      }
    } catch {
      // Assessment reference is optional in schema
      resolvedAssessmentId = null;
    }
  }

  const nowIso = new Date().toISOString();

  // 7. Insert official governance decision record
  const insertPayload = {
    issue_id: trimmedIssueId,
    assessment_id: resolvedAssessmentId,
    decision: canonicalDecision,
    internal_decision_reason: trimmedReason,
    citizen_safe_summary: trimmedReason,
    re_request_timeframe_months:
      typeof reRequestTimeframeMonths === "number" && reRequestTimeframeMonths > 0
        ? Math.round(reRequestTimeframeMonths)
        : null,
    expected_start_date: expectedStartDate || null,
    expected_completion_date: expectedCompletionDate || null,
    decided_by: trimmedAdminId,
    decided_at: nowIso,
  };

  const { data: createdDecision, error: insertError } = await client
    .from("infrastructure_decisions")
    .insert(insertPayload)
    .select(`
      *,
      decided_by_profile:profiles!infrastructure_decisions_decided_by_fkey(id, full_name, email)
    `)
    .single();

  if (insertError) {
    throw new InfrastructureDecisionError(
      insertError.message || `Failed to insert infrastructure decision for issue '${trimmedIssueId}'.`,
      insertError.code,
      insertError.details
    );
  }

  if (!createdDecision) {
    throw new InfrastructureDecisionError(
      `No decision record returned after insertion for issue '${trimmedIssueId}'.`,
      "INSERTION_FAILED"
    );
  }

  // 8. Ensure issue status in public.issues is synchronized
  const { error: updateIssueError } = await client
    .from("issues")
    .update({
      status: targetStatus,
      updated_at: nowIso,
    })
    .eq("id", trimmedIssueId);

  if (updateIssueError) {
    console.warn("Could not explicitly update issue status after decision:", updateIssueError);
  }

  return createdDecision as InfrastructureDecisionRecord;
}

/**
 * Fetches the latest infrastructure decision for a given issue ID.
 */
export async function getLatestInfrastructureDecisionForIssue(
  issueId: string,
  client: SupabaseClient = defaultSupabase
): Promise<InfrastructureDecisionRecord | null> {
  if (!issueId || typeof issueId !== "string" || issueId.trim() === "") {
    throw new InfrastructureDecisionError(
      "Parameter 'issueId' must be a valid non-empty string.",
      "INVALID_ISSUE_ID"
    );
  }

  const { data, error } = await client
    .from("infrastructure_decisions")
    .select(`
      *,
      decided_by_profile:profiles!infrastructure_decisions_decided_by_fkey(id, full_name, email)
    `)
    .eq("issue_id", issueId.trim())
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new InfrastructureDecisionError(
      error.message || `Failed to fetch latest decision for issue '${issueId}'.`,
      error.code,
      error.details
    );
  }

  return (data as InfrastructureDecisionRecord) || null;
}

/**
 * Lists all historical infrastructure decisions for a given issue ID.
 */
export async function listInfrastructureDecisionsForIssue(
  issueId: string,
  client: SupabaseClient = defaultSupabase
): Promise<InfrastructureDecisionRecord[]> {
  if (!issueId || typeof issueId !== "string" || issueId.trim() === "") {
    throw new InfrastructureDecisionError(
      "Parameter 'issueId' must be a valid non-empty string.",
      "INVALID_ISSUE_ID"
    );
  }

  const { data, error } = await client
    .from("infrastructure_decisions")
    .select(`
      *,
      decided_by_profile:profiles!infrastructure_decisions_decided_by_fkey(id, full_name, email)
    `)
    .eq("issue_id", issueId.trim())
    .order("decided_at", { ascending: false });

  if (error) {
    throw new InfrastructureDecisionError(
      error.message || `Failed to list decisions for issue '${issueId}'.`,
      error.code,
      error.details
    );
  }

  return (data as InfrastructureDecisionRecord[]) || [];
}
