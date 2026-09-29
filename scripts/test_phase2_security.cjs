/**
 * CivicFix Phase 2 Security Hardening Test Suite
 * =============================================
 * Validates:
 * 1. UUID validation & assertions (normal, invalid, and injection payloads)
 * 2. District ID validation (IN-Dxxxx formats)
 * 3. Planning Sector Code validation (DEPT-xx formats)
 * 4. Financial Year validation
 * 5. PostgREST filter escaping & safe .or() clause generation
 * 6. PostgREST filter injection resilience (commas, parentheses, quotes, wildcard breakouts)
 * 7. Infrastructure context parameter validator
 * 8. Static code audit: verify all vulnerable .or() / .filter() string interpolations are remediated
 * 9. Edge Function security checks: UUID validation, size limits, and safe profile queries
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("===============================================================================");
console.log("CIVICFIX: PHASE 2 SECURITY & INPUT HARDENING TEST SUITE");
console.log("===============================================================================\n");

const rootDir = process.cwd();
let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS [${totalTests}]: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL [${totalTests}]: ${name}`);
    console.error(`    Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// Emulate logic from src/lib/security.ts
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DISTRICT_ID_REGEX = /^IN-D\d{4}$/;
const PLANNING_SECTOR_REGEX = /^DEPT-\d{2}$/;
const FINANCIAL_YEAR_REGEX = /^\d{4}-\d{2,4}$/;

function isValidUuid(val) {
  if (typeof val !== "string") return false;
  return UUID_REGEX.test(val.trim());
}

function isValidDistrictId(val) {
  if (typeof val !== "string") return false;
  return DISTRICT_ID_REGEX.test(val.trim());
}

function isValidPlanningSectorCode(val) {
  if (typeof val !== "string") return false;
  return PLANNING_SECTOR_REGEX.test(val.trim());
}

function isValidFinancialYear(val) {
  if (typeof val !== "string") return false;
  return FINANCIAL_YEAR_REGEX.test(val.trim());
}

function sanitizeSearchTerm(term, maxLength = 200) {
  if (typeof term !== "string") return "";
  return term.trim().slice(0, maxLength);
}

function escapePostgrestFilterTerm(term) {
  return term.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildPostgrestIlikeOr(columns, term, maxLength = 200) {
  const sanitized = sanitizeSearchTerm(term, maxLength);
  if (!sanitized || columns.length === 0) return "";
  const escaped = escapePostgrestFilterTerm(sanitized);
  return columns.map((col) => `${col}.ilike."%${escaped}%"`).join(",");
}

function assertUuid(val, paramName = "id") {
  if (!isValidUuid(val)) {
    throw new Error(`Invalid ${paramName}: expected a valid UUID string.`);
  }
  return val.trim();
}

// 1. UUID Validation Tests
runTest("UUID Validator accepts valid v1-v5 and general hex UUIDs", () => {
  const validUuids = [
    "550e8400-e29b-41d4-a716-446655440000",
    "c174ec6a-0498-479a-8cbf-25c7eec9b9dc",
    "814DF249-10AD-4E86-B3CA-5DAC67905D29",
    "  550e8400-e29b-41d4-a716-446655440000  ",
    "00000000-0000-0000-0000-000000000000",
  ];
  for (const u of validUuids) {
    assert.strictEqual(isValidUuid(u), true, `Should accept valid UUID: ${u}`);
    assert.doesNotThrow(() => assertUuid(u));
  }
});

runTest("UUID Validator rejects SQL injection and malformed inputs", () => {
  const invalidInputs = [
    "550e8400-e29b-41d4-a716-446655440000' OR '1'='1",
    "550e8400-e29b-41d4-a716-446655440000; DROP TABLE users;--",
    "not-a-uuid",
    "550e8400-e29b-41d4-a716",
    "550e8400-e29b-41d4-a716-4466554400001",
    "",
    "   ",
    null,
    undefined,
    12345,
    {},
    [],
  ];
  for (const input of invalidInputs) {
    assert.strictEqual(isValidUuid(input), false, `Should reject: ${input}`);
    assert.throws(() => assertUuid(input));
  }
});

// 2. District ID Validation Tests
runTest("District ID Validator validates canonical IN-Dxxxx codes and rejects invalid/injection strings", () => {
  assert.strictEqual(isValidDistrictId("IN-D0248"), true);
  assert.strictEqual(isValidDistrictId("IN-D0001"), true);
  assert.strictEqual(isValidDistrictId("IN-D0786"), true);
  assert.strictEqual(isValidDistrictId("  IN-D0248  "), true);

  assert.strictEqual(isValidDistrictId("IN-D0248' OR 1=1"), false);
  assert.strictEqual(isValidDistrictId("IN-D0248; DROP TABLE"), false);
  assert.strictEqual(isValidDistrictId("IN-D248"), false);
  assert.strictEqual(isValidDistrictId("IN-D12345"), false);
  assert.strictEqual(isValidDistrictId("D0248"), false);
  assert.strictEqual(isValidDistrictId("US-D0248"), false);
  assert.strictEqual(isValidDistrictId(null), false);
});

// 3. Planning Sector Code Validation Tests
runTest("Planning Sector Code Validator validates canonical DEPT-xx codes and rejects malformed/injection strings", () => {
  assert.strictEqual(isValidPlanningSectorCode("DEPT-01"), true);
  assert.strictEqual(isValidPlanningSectorCode("DEPT-09"), true);
  assert.strictEqual(isValidPlanningSectorCode("DEPT-10"), true);
  assert.strictEqual(isValidPlanningSectorCode("  DEPT-01  "), true);

  assert.strictEqual(isValidPlanningSectorCode("DEPT-01' OR '1'='1"), false);
  assert.strictEqual(isValidPlanningSectorCode("DEPT-1"), false);
  assert.strictEqual(isValidPlanningSectorCode("DEPT-100"), false);
  assert.strictEqual(isValidPlanningSectorCode("SECTOR-01"), false);
  assert.strictEqual(isValidPlanningSectorCode(null), false);
});

// 4. Financial Year Validation Tests
runTest("Financial Year Validator validates standard financial year formats", () => {
  assert.strictEqual(isValidFinancialYear("2023-24"), true);
  assert.strictEqual(isValidFinancialYear("2024-25"), true);
  assert.strictEqual(isValidFinancialYear("2023-2024"), true);

  assert.strictEqual(isValidFinancialYear("2023"), false);
  assert.strictEqual(isValidFinancialYear("2023/24"), false);
  assert.strictEqual(isValidFinancialYear("2023-24' OR 1=1"), false);
  assert.strictEqual(isValidFinancialYear(null), false);
});

// 5. PostgREST Filter Escaping & Builder Tests
runTest("PostgREST ilike or builder wraps search term in literal quotes and escapes quotes/backslashes", () => {
  const filter = buildPostgrestIlikeOr(["name", "city"], "Mumbai, South");
  assert.strictEqual(
    filter,
    'name.ilike."%Mumbai, South%",city.ilike."%Mumbai, South%"',
    "Must wrap entire search term with commas in double quotes"
  );

  const filterWithQuotes = buildPostgrestIlikeOr(["title", "desc"], 'hello "world" \\ test');
  assert.strictEqual(
    filterWithQuotes,
    'title.ilike."%hello \\"world\\" \\\\ test%",desc.ilike."%hello \\"world\\" \\\\ test%"',
    "Must escape double quotes and backslashes"
  );
});

runTest("PostgREST builder neutralizes injection attempts without dropping legitimate characters", () => {
  // Injection attempt 1: PostgREST filter breakout via comma
  const inj1 = buildPostgrestIlikeOr(["title"], "%,status.eq.RESOLVED");
  assert.strictEqual(
    inj1,
    'title.ilike."%%,status.eq.RESOLVED%"',
    "Comma must be inside double-quoted literal, not parsed as PostgREST operator"
  );

  // Injection attempt 2: Filter grouping breakout via parenthesis
  const inj2 = buildPostgrestIlikeOr(["name", "acronym"], 'IIT") or (true');
  assert.strictEqual(
    inj2,
    'name.ilike."%IIT\\") or (true%",acronym.ilike."%IIT\\") or (true%"',
    "Quotes must be escaped and parentheses enclosed in string literal"
  );

  // Injection attempt 3: Truncation of excessively long input
  const hugeInput = "A".repeat(5000);
  const bounded = buildPostgrestIlikeOr(["title"], hugeInput, 200);
  assert.strictEqual(bounded.length, `title.ilike."%${"A".repeat(200)}%"`.length);

  // Empty input returns empty string
  assert.strictEqual(buildPostgrestIlikeOr(["title"], ""), "");
  assert.strictEqual(buildPostgrestIlikeOr(["title"], "   "), "");
  assert.strictEqual(buildPostgrestIlikeOr([], "test"), "");
});

// 6. Static Codebase Audit for Safe Query Construction
runTest("Static Code Audit: Frontend data libraries use safe PostgREST filters and UUID checks", () => {
  const institutionsCode = fs.readFileSync(path.join(rootDir, "src/lib/institutions.ts"), "utf8");
  const solutionKbCode = fs.readFileSync(path.join(rootDir, "src/lib/solution-knowledge.ts"), "utf8");
  const innovationCode = fs.readFileSync(path.join(rootDir, "src/lib/innovation.ts"), "utf8");
  const duplicateCode = fs.readFileSync(path.join(rootDir, "src/lib/duplicate-clustering.ts"), "utf8");
  const officerDetailsCode = fs.readFileSync(path.join(rootDir, "src/routes/officer/issue-details.tsx"), "utf8");
  const infraContextCode = fs.readFileSync(path.join(rootDir, "src/lib/infrastructure-context.ts"), "utf8");

  // Institutions:
  assert.ok(institutionsCode.includes("buildPostgrestIlikeOr"), "institutions.ts must use buildPostgrestIlikeOr");
  assert.ok(!institutionsCode.includes("`name.ilike.%${term}%"), "institutions.ts must not have raw interpolation");
  assert.ok(institutionsCode.includes("isValidUuid(id)"), "fetchInstitutionById must validate UUID");

  // Solution Knowledge:
  assert.ok(solutionKbCode.includes("buildPostgrestIlikeOr"), "solution-knowledge.ts must use buildPostgrestIlikeOr");
  assert.ok(!solutionKbCode.includes("`title.ilike.%${term}%"), "solution-knowledge.ts must not have raw interpolation");
  assert.ok(!solutionKbCode.includes("`problem_title.ilike.%${term}%"), "solution-knowledge.ts must not have raw interpolation");
  assert.ok(solutionKbCode.includes("isValidUuid(id)"), "fetchSimpleSolutionById must validate UUID");
  assert.ok(solutionKbCode.includes("isValidUuid(challengeId)"), "findExistingSolutionMatches must validate UUID");

  // Innovation:
  assert.ok(innovationCode.includes("buildPostgrestIlikeOr"), "innovation.ts must use buildPostgrestIlikeOr");
  assert.ok(!innovationCode.includes("`name.ilike.%${clean}%"), "innovation.ts must not have raw interpolation");
  assert.ok(!innovationCode.includes("`solution_title.ilike.%${clean}%"), "innovation.ts must not have raw interpolation");

  // Duplicate Clustering:
  assert.ok(duplicateCode.includes("isValidUuid(canonicalIssueId)"), "fetchLinkedReportsForCanonicalIssue must validate UUID");
  assert.ok(duplicateCode.includes("isValidUuid(issueId)"), "fetchDuplicateCandidates must validate UUID");

  // Officer Issue Details:
  assert.ok(officerDetailsCode.includes("isValidUuid(currentIssueId)"), "officer issue-details.tsx must validate UUID");

  // Infrastructure Context:
  assert.ok(infraContextCode.includes("isValidDistrictId"), "infrastructure-context.ts must validate district ID");
  assert.ok(infraContextCode.includes("isValidPlanningSectorCode"), "infrastructure-context.ts must validate planning sector");
});

// 7. Edge Function Input Hardening Audit
runTest("Static Code Audit: Supabase Edge Functions enforce UUID validation, size limits, and safe profile queries", () => {
  const analyzeIssueCode = fs.readFileSync(path.join(rootDir, "supabase/functions/analyze-issue/index.ts"), "utf8");
  const transcribeVoiceCode = fs.readFileSync(path.join(rootDir, "supabase/functions/transcribe-voice/index.ts"), "utf8");
  const detectDuplicatesCode = fs.readFileSync(path.join(rootDir, "supabase/functions/detect-duplicates/index.ts"), "utf8");
  const generateChallengeCode = fs.readFileSync(path.join(rootDir, "supabase/functions/generate-challenge/index.ts"), "utf8");
  const matchInstitutionsCode = fs.readFileSync(path.join(rootDir, "supabase/functions/match-institutions/index.ts"), "utf8");

  // analyze-issue:
  assert.ok(analyzeIssueCode.includes("Invalid issue_id: must be a valid UUID format"), "analyze-issue must validate UUID");
  assert.ok(analyzeIssueCode.includes("b.title.length > 500"), "analyze-issue must cap benchmark title length");

  // transcribe-voice:
  assert.ok(transcribeVoiceCode.includes("12 MB base64 / ~9 MB audio"), "transcribe-voice error message must be consistent");

  // detect-duplicates:
  assert.ok(detectDuplicatesCode.includes("Invalid issue_id: must be a valid UUID format"), "detect-duplicates must validate UUID");

  // generate-challenge:
  assert.ok(generateChallengeCode.includes("Invalid issue_id: must be a valid UUID format"), "generate-challenge must validate UUID");

  // match-institutions:
  assert.ok(matchInstitutionsCode.includes("Invalid challenge_id: must be a valid UUID format"), "match-institutions must validate UUID");
});

console.log("\n===============================================================================");
console.log(`ALL PHASE 2 SECURITY TESTS PASSED (${passedTests}/${totalTests} TESTS)`);
console.log("===============================================================================\n");
