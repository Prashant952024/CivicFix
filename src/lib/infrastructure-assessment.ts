/**
 * CivicFix Infrastructure Workflow: Assessment Persistence Service
 * =================================================================
 * Provides creation, versioning, and retrieval of multi-dataset (D1–D7)
 * decision-support snapshot dossiers in public.infrastructure_assessments.
 *
 * Invariant Rules:
 * 1. Read-only retrieval of D1–D7 factual context via fetchIssueInfrastructureContext.
 * 2. Immutable snapshotting: Persists exact D1–D7 data state at assessment time.
 * 3. Safe Versioning: Increments assessment_version and maintains unique is_latest=true.
 * 4. Zero Hallucination / Zero Fabrication: Derived metrics left NULL unless factually known.
 * 5. Strict D8 isolation: synthetic_benchmark_used is strictly false.
 * 6. Preserves existing RLS and database error codes.
 */

import { supabase as defaultSupabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchIssueInfrastructureContext,
  DistrictInfrastructureContextError,
} from "@/lib/infrastructure-context";
import type {
  DistrictInfrastructureContext,
  IssueInfrastructureContextResult,
} from "@/types/infrastructure-context";

export class InfrastructureAssessmentError extends Error {
  code?: string;
  details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "InfrastructureAssessmentError";
    this.code = code;
    this.details = details;
  }
}

export interface InfrastructureAssessmentRecord {
  id: string;
  issue_id: string;
  district_id: string;
  planning_sector_code: string;
  assessment_version: number;
  is_latest: boolean;
  estimated_project_cost_crore: number | null;
  estimated_project_duration_months: number | null;
  estimated_beneficiaries: number | null;
  affected_households: number | null;
  data_completeness_score: number | null;
  demographic_context: Record<string, unknown>;
  budget_context: Record<string, unknown>;
  geography_context: Record<string, unknown>;
  infrastructure_context: Record<string, unknown>;
  accessibility_context: Record<string, unknown>;
  socioeconomic_context: Record<string, unknown>;
  historical_cost_context: Record<string, unknown>;
  similar_requests_context: Record<string, unknown>;
  feasibility_indicators: Record<string, unknown>;
  sustainability_indicators: Record<string, unknown>;
  risks_and_missing_info: string[];
  assessment_summary: string | null;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerateInfrastructureAssessmentOptions {
  financialYear?: string | null;
  infrastructureId?: string | null;
  assessmentSummary?: string | null;
  risksAndMissingInfo?: string[];
  feasibilityIndicators?: Record<string, unknown>;
  sustainabilityIndicators?: Record<string, unknown>;
  estimatedProjectCostCrore?: number | null;
  estimatedProjectDurationMonths?: number | null;
  estimatedBeneficiaries?: number | null;
  affectedHouseholds?: number | null;
}

export interface GenerateAndSaveInfrastructureAssessmentParams {
  issueId: string;
  generatedByProfileId?: string | null;
  options?: GenerateInfrastructureAssessmentOptions;
}

/**
 * Calculates a factual, deterministic data completeness score (0 to 100)
 * based on presence of key attributes across D1 to D7 snapshots.
 */
export function calculateDataCompletenessScore(context: DistrictInfrastructureContext): number {
  if (!context) return 0;

  let totalPoints = 0;
  let earnedPoints = 0;

  // D1 Population (15 points)
  totalPoints += 15;
  if (context.population && context.population.total_population > 0) earnedPoints += 10;
  if (context.population && context.population.total_households > 0) earnedPoints += 5;

  // D2 Budget (20 points)
  totalPoints += 20;
  if (context.budget && typeof context.budget.allocated_budget_crore === "number") earnedPoints += 10;
  if (context.budget && typeof context.budget.unspent_budget_crore === "number") earnedPoints += 10;

  // D3 Geography (15 points)
  totalPoints += 15;
  if (context.geography && typeof context.geography.centroid_latitude === "number") earnedPoints += 10;
  if (context.geography && context.geography.area_sq_km) earnedPoints += 5;

  // D4 Infrastructure Assets (20 points)
  totalPoints += 20;
  if (Array.isArray(context.infrastructure_assets) && context.infrastructure_assets.length > 0) {
    earnedPoints += 20;
  }

  // D5 Accessibility (10 points)
  totalPoints += 10;
  if (context.accessibility && typeof context.accessibility.overall_accessibility_gap_score === "number") {
    earnedPoints += 10;
  }

  // D6 Socioeconomic Gaps (10 points)
  totalPoints += 10;
  if (context.socioeconomic && typeof context.socioeconomic.overall_development_context_score === "number") {
    earnedPoints += 10;
  }

  // D7 Historical Projects (10 points)
  totalPoints += 10;
  if (context.historical_projects && typeof context.historical_projects.project_count === "number") {
    earnedPoints += 10;
  }

  return Math.round((earnedPoints / totalPoints) * 100);
}

/**
 * Generates a purely factual, deterministic assessment summary from D1-D7 baseline data.
 */
export function generateDeterministicAssessmentSummary(
  context: DistrictInfrastructureContext,
  issueTitle: string
): string {
  const districtName = context.district.district_name;
  const stateName = context.district.state_name;
  const pop = context.population.total_population ? context.population.total_population.toLocaleString("en-IN") : "N/A";
  const sector = context.budget.planning_sector_name;
  const unspent = context.budget.unspent_budget_crore;
  const assetCount = Array.isArray(context.infrastructure_assets) ? context.infrastructure_assets.length : 0;
  const histCount = context.historical_projects.project_count;

  return `Infrastructure decision-support assessment compiled for issue "${issueTitle}" located in ${districtName}, ${stateName} (Population: ${pop}). Planning sector "${sector}" has ${unspent} Cr available budget for new capital works. Identified ${assetCount} infrastructure asset categories and ${histCount} historical project execution precedents.`;
}

/**
 * Retrieves the current active (is_latest = true) assessment for a given issue ID.
 */
export async function getLatestInfrastructureAssessment(
  issueId: string,
  client: SupabaseClient = defaultSupabase
): Promise<InfrastructureAssessmentRecord | null> {
  if (!issueId || typeof issueId !== "string" || issueId.trim() === "") {
    throw new InfrastructureAssessmentError(
      "Parameter 'issueId' must be a valid non-empty string.",
      "INVALID_ISSUE_ID"
    );
  }

  const { data, error } = await client
    .from("infrastructure_assessments")
    .select("*")
    .eq("issue_id", issueId.trim())
    .eq("is_latest", true)
    .maybeSingle();

  if (error) {
    throw new InfrastructureAssessmentError(
      error.message || `Failed to fetch latest assessment for issue '${issueId}'.`,
      error.code,
      error.details
    );
  }

  return (data as InfrastructureAssessmentRecord) || null;
}

/**
 * Lists all historical assessment versions for a given issue ID, ordered newest first.
 */
export async function listInfrastructureAssessmentsForIssue(
  issueId: string,
  client: SupabaseClient = defaultSupabase
): Promise<InfrastructureAssessmentRecord[]> {
  if (!issueId || typeof issueId !== "string" || issueId.trim() === "") {
    throw new InfrastructureAssessmentError(
      "Parameter 'issueId' must be a valid non-empty string.",
      "INVALID_ISSUE_ID"
    );
  }

  const { data, error } = await client
    .from("infrastructure_assessments")
    .select("*")
    .eq("issue_id", issueId.trim())
    .order("assessment_version", { ascending: false });

  if (error) {
    throw new InfrastructureAssessmentError(
      error.message || `Failed to list assessments for issue '${issueId}'.`,
      error.code,
      error.details
    );
  }

  return (data as InfrastructureAssessmentRecord[]) || [];
}

/**
 * Generates and saves a versioned Infrastructure Assessment snapshot for an existing civic issue.
 *
 * Steps:
 * 1. Validates input arguments.
 * 2. Retrieves factual D1–D7 context via fetchIssueInfrastructureContext.
 * 3. Determines the next sequential version number.
 * 4. Demotes previous latest assessment version (is_latest = false) to maintain index integrity.
 * 5. Persists the multi-dataset snapshot into public.infrastructure_assessments with is_latest = true.
 *
 * @param params Issue ID, optional author profile ID, and optional contextual overrides.
 * @param client Optional Supabase client instance (defaults to standard application client).
 * @returns Persisted InfrastructureAssessmentRecord.
 */
export async function generateAndSaveInfrastructureAssessment(
  params: GenerateAndSaveInfrastructureAssessmentParams,
  client: SupabaseClient = defaultSupabase
): Promise<InfrastructureAssessmentRecord> {
  if (!params || typeof params !== "object") {
    throw new InfrastructureAssessmentError(
      "Parameters object is required.",
      "INVALID_INPUT"
    );
  }

  const { issueId, generatedByProfileId, options } = params;

  if (!issueId || typeof issueId !== "string" || issueId.trim() === "") {
    throw new InfrastructureAssessmentError(
      "Parameter 'issueId' must be a valid non-empty string.",
      "INVALID_ISSUE_ID"
    );
  }

  const trimmedIssueId = issueId.trim();

  // 1. Fetch factual D1–D7 context for the issue
  let issueContext: IssueInfrastructureContextResult;
  try {
    issueContext = await fetchIssueInfrastructureContext(
      trimmedIssueId,
      {
        financialYear: options?.financialYear,
        infrastructureId: options?.infrastructureId,
      },
      client
    );
  } catch (err: unknown) {
    if (err instanceof DistrictInfrastructureContextError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Failed to retrieve issue infrastructure context.";
    throw new InfrastructureAssessmentError(message, "CONTEXT_RETRIEVAL_ERROR", err);
  }

  // 2. Determine next assessment version
  const { data: existingVersions, error: versionError } = await client
    .from("infrastructure_assessments")
    .select("assessment_version")
    .eq("issue_id", trimmedIssueId)
    .order("assessment_version", { ascending: false })
    .limit(1);

  if (versionError) {
    throw new InfrastructureAssessmentError(
      versionError.message || `Failed to check existing assessment versions for issue '${trimmedIssueId}'.`,
      versionError.code,
      versionError.details
    );
  }

  const latestVersionNumber =
    Array.isArray(existingVersions) && existingVersions.length > 0
      ? existingVersions[0].assessment_version
      : 0;

  const nextVersion = latestVersionNumber + 1;

  // 3. Demote existing latest assessment (to satisfy idx_infra_assessments_latest unique constraint)
  if (latestVersionNumber > 0) {
    const { error: demoteError } = await client
      .from("infrastructure_assessments")
      .update({
        is_latest: false,
        updated_at: new Date().toISOString(),
      })
      .eq("issue_id", trimmedIssueId)
      .eq("is_latest", true);

    if (demoteError) {
      throw new InfrastructureAssessmentError(
        demoteError.message || `Failed to demote prior assessment version for issue '${trimmedIssueId}'.`,
        demoteError.code,
        demoteError.details
      );
    }
  }

  // 4. Construct factual snapshot payloads
  const ctx = issueContext.context;
  const completenessScore = calculateDataCompletenessScore(ctx);
  const summary =
    options?.assessmentSummary?.trim() ||
    generateDeterministicAssessmentSummary(ctx, issueContext.issue_title);

  const insertPayload = {
    issue_id: trimmedIssueId,
    district_id: issueContext.district_id,
    planning_sector_code: issueContext.planning_sector_code,
    assessment_version: nextVersion,
    is_latest: true,
    estimated_project_cost_crore:
      typeof options?.estimatedProjectCostCrore === "number"
        ? options.estimatedProjectCostCrore
        : null,
    estimated_project_duration_months:
      typeof options?.estimatedProjectDurationMonths === "number"
        ? Math.round(options.estimatedProjectDurationMonths)
        : null,
    estimated_beneficiaries:
      typeof options?.estimatedBeneficiaries === "number"
        ? Math.round(options.estimatedBeneficiaries)
        : null,
    affected_households:
      typeof options?.affectedHouseholds === "number"
        ? Math.round(options.affectedHouseholds)
        : null,
    data_completeness_score: completenessScore,
    demographic_context: ctx.population as unknown as Record<string, unknown>,
    budget_context: ctx.budget as unknown as Record<string, unknown>,
    geography_context: ctx.geography as unknown as Record<string, unknown>,
    infrastructure_context: {
      assets: ctx.infrastructure_assets,
      count: ctx.infrastructure_assets.length,
      filtered_category: ctx.query.infrastructure_id,
    } as unknown as Record<string, unknown>,
    accessibility_context: ctx.accessibility as unknown as Record<string, unknown>,
    socioeconomic_context: ctx.socioeconomic as unknown as Record<string, unknown>,
    historical_cost_context: ctx.historical_projects as unknown as Record<string, unknown>,
    similar_requests_context: {
      notice: "D8 synthetic benchmark isolated from operational decision support.",
      synthetic_benchmark_used: false,
    },
    feasibility_indicators: options?.feasibilityIndicators || {},
    sustainability_indicators: options?.sustainabilityIndicators || {},
    risks_and_missing_info: Array.isArray(options?.risksAndMissingInfo)
      ? options.risksAndMissingInfo
      : [],
    assessment_summary: summary,
    generated_by: generatedByProfileId || null,
  };

  // 5. Insert new latest assessment record
  const { data: createdRecord, error: insertError } = await client
    .from("infrastructure_assessments")
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    throw new InfrastructureAssessmentError(
      insertError.message || `Failed to create infrastructure assessment for issue '${trimmedIssueId}'.`,
      insertError.code,
      insertError.details
    );
  }

  if (!createdRecord) {
    throw new InfrastructureAssessmentError(
      `No assessment record returned after insertion for issue '${trimmedIssueId}'.`,
      "INSERTION_FAILED"
    );
  }

  return createdRecord as InfrastructureAssessmentRecord;
}

/**
 * Assigns or updates the canonical district (and optionally department) on an issue.
 * Enforces valid resolution method: 'CITIZEN_SELECTED' | 'AI_ADDRESS_PARSED' | 'ADMIN_MANUAL'
 */
export async function assignIssueDistrict(
  params: {
    issueId: string;
    districtId: string;
    method?: "CITIZEN_SELECTED" | "AI_ADDRESS_PARSED" | "ADMIN_MANUAL";
    departmentId?: string | null;
  },
  client: SupabaseClient = defaultSupabase
): Promise<void> {
  const { issueId, districtId, method = "ADMIN_MANUAL", departmentId } = params;

  if (!issueId || typeof issueId !== "string" || issueId.trim() === "") {
    throw new InfrastructureAssessmentError(
      "Parameter 'issueId' must be a valid non-empty string.",
      "INVALID_ISSUE_ID"
    );
  }

  if (!districtId || typeof districtId !== "string" || districtId.trim() === "") {
    throw new InfrastructureAssessmentError(
      "Parameter 'districtId' must be a valid non-empty string.",
      "INVALID_DISTRICT_ID"
    );
  }

  const validMethods = ["CITIZEN_SELECTED", "AI_ADDRESS_PARSED", "ADMIN_MANUAL"];
  if (!validMethods.includes(method)) {
    throw new InfrastructureAssessmentError(
      `Invalid district resolution method '${method}'. Must be one of: ${validMethods.join(", ")}.`,
      "INVALID_RESOLUTION_METHOD"
    );
  }

  const trimmedIssueId = issueId.trim();
  const trimmedDistrictId = districtId.trim();

  // 1. Verify district exists in master
  const { data: districtRow, error: districtError } = await client
    .from("districts")
    .select("id, district_name, state_name")
    .eq("id", trimmedDistrictId)
    .maybeSingle();

  if (districtError) {
    throw new InfrastructureAssessmentError(
      districtError.message || `Failed to verify district '${trimmedDistrictId}'.`,
      districtError.code,
      districtError.details
    );
  }

  if (!districtRow) {
    throw new InfrastructureAssessmentError(
      `District '${trimmedDistrictId}' does not exist in canonical districts master.`,
      "INVALID_DISTRICT_ID"
    );
  }

  // 2. Prepare payload
  const updatePayload: Record<string, unknown> = {
    district_id: trimmedDistrictId,
    district_resolution_method: method,
    updated_at: new Date().toISOString(),
  };

  if (departmentId !== undefined) {
    const trimmedDeptId = departmentId ? departmentId.trim() : null;
    if (trimmedDeptId) {
      // Verify department exists
      const { data: deptRow, error: deptError } = await client
        .from("departments")
        .select("id")
        .eq("id", trimmedDeptId)
        .maybeSingle();

      if (deptError || !deptRow) {
        throw new InfrastructureAssessmentError(
          `Department '${trimmedDeptId}' does not exist.`,
          "INVALID_DEPARTMENT_ID"
        );
      }
      updatePayload.department_id = trimmedDeptId;
    }
  }

  // 3. Update issue record
  const { error: updateError } = await client
    .from("issues")
    .update(updatePayload)
    .eq("id", trimmedIssueId);

  if (updateError) {
    throw new InfrastructureAssessmentError(
      updateError.message || `Failed to assign district to issue '${trimmedIssueId}'.`,
      updateError.code,
      updateError.details
    );
  }
}
