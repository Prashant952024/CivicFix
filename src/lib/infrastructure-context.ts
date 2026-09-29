/**
 * CivicFix Infrastructure Workflow: Backend Context Service
 * =========================================================
 * Clean, read-only backend service layer for querying district infrastructure
 * context from Datasets D1 to D7 via public.get_district_infrastructure_context RPC.
 *
 * Invariant Rules:
 * - Strictly read-only (invokes existing PostgreSQL RPC).
 * - Never constructs ad-hoc D1-D7 queries or duplicate aggregation.
 * - Enforces client-side parameter validation before database execution.
 * - Preserves database errors and role authorization without fabricating fallback data.
 * - Does not access Dataset D8 (benchmark-only).
 */

import { supabase as defaultSupabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DistrictInfrastructureContext,
  GetDistrictInfrastructureContextParams,
  IssueInfrastructureContextOptions,
  IssueInfrastructureContextResult,
  DepartmentPlanningSectorMapping,
} from "@/types/infrastructure-context";

export * from "@/types/infrastructure-context";

export class DistrictInfrastructureContextError extends Error {
  code?: string;
  details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "DistrictInfrastructureContextError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Validates query parameters before RPC dispatch.
 */
export function validateDistrictInfrastructureContextParams(
  params: GetDistrictInfrastructureContextParams
): {
  districtId: string;
  planningSectorCode: string;
  financialYear: string | null;
  infrastructureId: string | null;
} {
  if (!params || typeof params !== "object") {
    throw new DistrictInfrastructureContextError(
      "Query parameters object is required.",
      "INVALID_INPUT"
    );
  }

  const { districtId, planningSectorCode, financialYear, infrastructureId } = params;

  if (typeof districtId !== "string" || districtId.trim() === "") {
    throw new DistrictInfrastructureContextError(
      "Parameter 'districtId' must be a non-empty string (e.g. 'IN-D0248').",
      "INVALID_DISTRICT_ID"
    );
  }

  if (typeof planningSectorCode !== "string" || planningSectorCode.trim() === "") {
    throw new DistrictInfrastructureContextError(
      "Parameter 'planningSectorCode' must be a non-empty string (e.g. 'DEPT-01').",
      "INVALID_PLANNING_SECTOR"
    );
  }

  const trimmedFinancialYear =
    typeof financialYear === "string" && financialYear.trim() !== ""
      ? financialYear.trim()
      : null;

  const trimmedInfrastructureId =
    typeof infrastructureId === "string" && infrastructureId.trim() !== ""
      ? infrastructureId.trim()
      : null;

  return {
    districtId: districtId.trim(),
    planningSectorCode: planningSectorCode.trim(),
    financialYear: trimmedFinancialYear,
    infrastructureId: trimmedInfrastructureId,
  };
}

/**
 * Fetches structured factual D1-D7 infrastructure decision-support context
 * for a canonical district and planning sector via Supabase RPC.
 *
 * @param params Query parameters (districtId, planningSectorCode, optional financialYear, optional infrastructureId)
 * @param client Optional Supabase client instance (defaults to standard application client)
 * @returns Structured factual DistrictInfrastructureContext JSONB
 */
export async function getDistrictInfrastructureContext(
  params: GetDistrictInfrastructureContextParams,
  client: SupabaseClient = defaultSupabase
): Promise<DistrictInfrastructureContext> {
  const validated = validateDistrictInfrastructureContextParams(params);

  try {
    const { data, error } = await client.rpc("get_district_infrastructure_context", {
      p_district_id: validated.districtId,
      p_planning_sector_code: validated.planningSectorCode,
      p_financial_year: validated.financialYear,
      p_infrastructure_id: validated.infrastructureId,
    });

    if (error) {
      throw new DistrictInfrastructureContextError(
        error.message || "Failed to retrieve district infrastructure context from RPC.",
        error.code,
        error.details
      );
    }

    if (!data) {
      throw new DistrictInfrastructureContextError(
        `No infrastructure context returned for district '${validated.districtId}'.`,
        "NOT_FOUND"
      );
    }

    return data as DistrictInfrastructureContext;
  } catch (err: unknown) {
    if (err instanceof DistrictInfrastructureContextError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Unknown backend context service error.";
    throw new DistrictInfrastructureContextError(message, "RPC_EXECUTION_ERROR", err);
  }
}

/**
 * Resolves the primary planning sector code for a given municipal department ID.
 *
 * @param departmentId UUID of the municipal department
 * @param client Optional Supabase client instance
 * @returns Planning sector code (e.g. 'DEPT-01')
 */
export async function resolveIssuePlanningSector(
  departmentId: string,
  client: SupabaseClient = defaultSupabase
): Promise<string> {
  if (!departmentId || typeof departmentId !== "string" || departmentId.trim() === "") {
    throw new DistrictInfrastructureContextError(
      "Parameter 'departmentId' must be a valid non-empty string.",
      "INVALID_DEPARTMENT_ID"
    );
  }

  const trimmedDeptId = departmentId.trim();

  const { data, error } = await client
    .from("department_planning_sectors")
    .select("planning_sector_code, is_primary")
    .eq("department_id", trimmedDeptId)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new DistrictInfrastructureContextError(
      error.message || `Failed to query planning sector for department '${trimmedDeptId}'.`,
      error.code,
      error.details
    );
  }

  if (!data || !data.planning_sector_code) {
    throw new DistrictInfrastructureContextError(
      `No planning sector mapped for department '${trimmedDeptId}'.`,
      "PLANNING_SECTOR_NOT_FOUND"
    );
  }

  return data.planning_sector_code;
}

/**
 * Fetches structured factual D1-D7 infrastructure decision-support context
 * for an existing issue in the CivicFix database.
 *
 * Resolves:
 * 1. Target issue record from public.issues (validating district_id and department_id presence).
 * 2. Associated planning sector code from public.department_planning_sectors.
 * 3. Aggregated factual context via public.get_district_infrastructure_context RPC.
 *
 * @param issueId UUID of the target issue
 * @param options Optional overrides (financialYear, infrastructureId)
 * @param client Optional Supabase client instance
 * @returns Structured composite IssueInfrastructureContextResult
 */
export async function fetchIssueInfrastructureContext(
  issueId: string,
  options?: IssueInfrastructureContextOptions,
  client: SupabaseClient = defaultSupabase
): Promise<IssueInfrastructureContextResult> {
  if (!issueId || typeof issueId !== "string" || issueId.trim() === "") {
    throw new DistrictInfrastructureContextError(
      "Parameter 'issueId' must be a valid non-empty string.",
      "INVALID_ISSUE_ID"
    );
  }

  const trimmedIssueId = issueId.trim();

  // 1. Fetch issue metadata
  const { data: issue, error: issueError } = await client
    .from("issues")
    .select("id, title, description, district_id, department_id, status, final_issue_type, ai_issue_type")
    .eq("id", trimmedIssueId)
    .maybeSingle();

  if (issueError) {
    throw new DistrictInfrastructureContextError(
      issueError.message || `Failed to fetch issue '${trimmedIssueId}'.`,
      issueError.code,
      issueError.details
    );
  }

  if (!issue) {
    throw new DistrictInfrastructureContextError(
      `Issue '${trimmedIssueId}' not found.`,
      "ISSUE_NOT_FOUND"
    );
  }

  if (!issue.district_id) {
    throw new DistrictInfrastructureContextError(
      `Issue '${trimmedIssueId}' does not have a canonical district assigned.`,
      "MISSING_DISTRICT_ID"
    );
  }

  if (!issue.department_id) {
    throw new DistrictInfrastructureContextError(
      `Issue '${trimmedIssueId}' does not have an assigned department.`,
      "MISSING_DEPARTMENT_ID"
    );
  }

  // 2. Resolve planning sector code
  const planningSectorCode = await resolveIssuePlanningSector(issue.department_id, client);

  // 3. Query district infrastructure context via RPC
  const context = await getDistrictInfrastructureContext(
    {
      districtId: issue.district_id,
      planningSectorCode,
      financialYear: options?.financialYear,
      infrastructureId: options?.infrastructureId,
    },
    client
  );

  return {
    issue_id: issue.id,
    issue_title: issue.title,
    issue_status: issue.status,
    final_issue_type: issue.final_issue_type ?? null,
    district_id: issue.district_id,
    department_id: issue.department_id,
    planning_sector_code: planningSectorCode,
    context,
    fetched_at: new Date().toISOString(),
  };
}

