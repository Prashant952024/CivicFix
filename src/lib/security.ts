/**
 * CivicFix Security & Input Hardening Utilities
 * ============================================
 * Provides robust validation, PostgREST filter escaping, and input boundary
 * checks to prevent SQL/PostgREST injection, query manipulation, and invalid identifier crashes.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DISTRICT_ID_REGEX = /^IN-D\d{4}$/;
const PLANNING_SECTOR_REGEX = /^DEPT-\d{2}$/;
const FINANCIAL_YEAR_REGEX = /^\d{4}-\d{2,4}$/;

/**
 * Validates whether the given value is a valid standard UUID (v1-v5 or general hex UUID).
 */
export function isValidUuid(val: unknown): val is string {
  if (typeof val !== "string") return false;
  return UUID_REGEX.test(val.trim());
}

/**
 * Validates whether the given value is a valid canonical District ID (e.g. "IN-D0248").
 */
export function isValidDistrictId(val: unknown): val is string {
  if (typeof val !== "string") return false;
  return DISTRICT_ID_REGEX.test(val.trim());
}

/**
 * Validates whether the given value is a valid Planning Sector Code (e.g. "DEPT-01").
 */
export function isValidPlanningSectorCode(val: unknown): val is string {
  if (typeof val !== "string") return false;
  return PLANNING_SECTOR_REGEX.test(val.trim());
}

/**
 * Validates whether the given value is a valid Financial Year (e.g. "2023-24" or "2023-2024").
 */
export function isValidFinancialYear(val: unknown): val is string {
  if (typeof val !== "string") return false;
  return FINANCIAL_YEAR_REGEX.test(val.trim());
}

/**
 * Sanitizes and caps a raw search query term to prevent DOS or memory exhaustion.
 */
export function sanitizeSearchTerm(term: unknown, maxLength = 200): string {
  if (typeof term !== "string") return "";
  return term.trim().slice(0, maxLength);
}

/**
 * Escapes special PostgREST characters for use inside a quoted filter literal (`"..."`).
 * In PostgREST syntax, enclosing a pattern in double quotes and escaping embedded quotes
 * and backslashes ensures commas, parentheses, dots, colons, and operators are treated
 * strictly as literal text, preventing filter tree injection or syntax breakage.
 */
export function escapePostgrestFilterTerm(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Constructs a safe PostgREST `.or()` clause for multi-column `ilike` searching.
 * Every column is wrapped in double quotes with wildcards: `col.ilike."%escaped_term%"`.
 *
 * Example:
 * buildPostgrestIlikeOr(["name", "city"], "Mumbai, South")
 * => `name.ilike."%Mumbai, South%",city.ilike."%Mumbai, South%"`
 */
export function buildPostgrestIlikeOr(
  columns: string[],
  term: string,
  maxLength = 200
): string {
  const sanitized = sanitizeSearchTerm(term, maxLength);
  if (!sanitized || columns.length === 0) return "";

  const escaped = escapePostgrestFilterTerm(sanitized);
  return columns.map((col) => `${col}.ilike."%${escaped}%"`).join(",");
}

/**
 * Asserts that a value is a valid UUID, throwing an Error if invalid.
 */
export function assertUuid(val: unknown, paramName = "id"): string {
  if (!isValidUuid(val)) {
    throw new Error(`Invalid ${paramName}: expected a valid UUID string.`);
  }
  return val.trim();
}
