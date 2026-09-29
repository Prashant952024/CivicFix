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
