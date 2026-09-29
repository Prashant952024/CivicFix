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
  CanonicalDistrict,
  DistrictResolutionMethod,
  IssueInfrastructureReadinessResult,
  GpsDistrictResolutionResult,
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

/**
 * Lists all active canonical districts of India from public.districts master.
 */
export async function listCanonicalDistricts(
  client: SupabaseClient = defaultSupabase
): Promise<CanonicalDistrict[]> {
  const { data, error } = await client
    .from("districts")
    .select("id, district_name, state_name, state_code, country_code, canonical_source")
    .eq("is_active", true)
    .order("state_name", { ascending: true })
    .order("district_name", { ascending: true });

  if (error) {
    throw new DistrictInfrastructureContextError(
      error.message || "Failed to query canonical districts master.",
      error.code,
      error.details
    );
  }

  return (data ?? []) as CanonicalDistrict[];
}

/**
 * Validates the infrastructure assessment readiness for a given issue.
 * Returns missing fields without throwing, or detailed readiness summary.
 */
export async function validateIssueInfrastructureReadiness(
  issueId: string,
  client: SupabaseClient = defaultSupabase
): Promise<IssueInfrastructureReadinessResult> {
  if (!issueId || typeof issueId !== "string" || issueId.trim() === "") {
    throw new DistrictInfrastructureContextError(
      "Parameter 'issueId' must be a valid non-empty string.",
      "INVALID_ISSUE_ID"
    );
  }

  const trimmedIssueId = issueId.trim();

  // 1. Fetch issue with district and department relations
  const { data: issue, error: issueError } = await client
    .from("issues")
    .select(`
      id,
      district_id,
      district_resolution_method,
      department_id,
      district:districts!issues_district_id_fkey(id, district_name, state_name),
      department:departments!issues_department_id_fkey(id, name)
    `)
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

  const missingFields: Array<"district_id" | "department_id" | "planning_sector_code"> = [];

  if (!issue.district_id) {
    missingFields.push("district_id");
  }

  if (!issue.department_id) {
    missingFields.push("department_id");
  }

  let planningSectorCode: string | null = null;
  if (issue.department_id) {
    try {
      planningSectorCode = await resolveIssuePlanningSector(issue.department_id, client);
    } catch {
      missingFields.push("planning_sector_code");
    }
  } else {
    missingFields.push("planning_sector_code");
  }

  const districtData = issue.district as { district_name?: string } | null;
  const departmentData = issue.department as { name?: string } | null;

  return {
    ready: missingFields.length === 0,
    issue_id: issue.id,
    district_id: issue.district_id ?? null,
    district_name: districtData?.district_name ?? null,
    department_id: issue.department_id ?? null,
    department_name: departmentData?.name ?? null,
    planning_sector_code: planningSectorCode,
    missing_fields: missingFields,
    resolution_method: (issue.district_resolution_method as DistrictResolutionMethod) ?? null,
  };
}

/**
 * Resolves canonical district identity from GPS latitude/longitude using PostGIS point-in-polygon.
 * Invokes public.resolve_district_from_gps RPC.
 *
 * Invariants:
 * - Read-only STABLE execution.
 * - Handles latitude range [-90, 90] and longitude range [-180, 180].
 * - Returns null gracefully when point is outside all known canonical district polygons.
 * - Never guesses or fabricates fallback districts.
 */
export async function resolveDistrictFromGps(
  params: {
    latitude: number | string | null | undefined;
    longitude: number | string | null | undefined;
  },
  client: SupabaseClient = defaultSupabase
): Promise<GpsDistrictResolutionResult | null> {
  if (params.latitude === null || params.latitude === undefined || params.longitude === null || params.longitude === undefined) {
    return null;
  }

  const lat = typeof params.latitude === "string" ? parseFloat(params.latitude) : params.latitude;
  const lng = typeof params.longitude === "string" ? parseFloat(params.longitude) : params.longitude;

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  try {
    const { data, error } = await client
      .rpc("resolve_district_from_gps", {
        p_latitude: lat,
        p_longitude: lng,
      })
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.warn("GPS PostGIS district resolution RPC error:", error);
      }
      return null;
    }

    const resolved = data as {
      district_id?: string;
      district_name?: string;
      state_name?: string;
      state_code?: string | null;
    } | null;

    if (!resolved || !resolved.district_id || !resolved.district_name || !resolved.state_name) {
      return null;
    }

    return {
      district_id: resolved.district_id,
      district_name: resolved.district_name,
      state_name: resolved.state_name,
      state_code: resolved.state_code ?? null,
      resolution_method: "GPS_POSTGIS",
    };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("GPS resolution error:", err);
    }
    return null;
  }
}


