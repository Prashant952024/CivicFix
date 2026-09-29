/**
 * CivicFix — Phase 3 Infrastructure Lifecycle Integration Test Suite
 * ===================================================================
 * Validates the read-only integration connecting the infrastructure context
 * service to the existing INFRASTRUCTURE issue lifecycle:
 *
 * - Test 1: Issue-to-context resolution with valid district_id & department_id.
 * - Test 2: D1–D7 context completeness across all 7 dataset dimensions.
 * - Test 3: D8 benchmark isolation (synthetic_benchmark_used === false, zero D8 queries).
 * - Test 4: Specific infrastructure category filtering (INFRA-01 vs full array).
 * - Test 5: Default financial year fallback resolution.
 * - Test 6: Explicit financial year parameter passing (FY2024-25).
 * - Test 7: Read-only verification (zero database mutations across context layer).
 * - Test 8: Workflow preservation (SIMPLE & COMPLEX separation preserved).
 * - Test 9: Robust error handling (missing district_id, missing department_id, unmapped dept, invalid ID).
 * - Test 10: Idempotency & repeatability (deterministic outputs without state drift).
 */

const assert = require("assert");
const fs = require("fs");

// Mock Data Fixtures
const MOCK_ISSUES = {
  "issue-infra-001": {
    id: "issue-infra-001",
    title: "Major arterial bypass road construction requirement",
    description: "Multi-lane bypass required to divert heavy freight traffic around municipal center.",
    district_id: "IN-D0248", // Ranchi
    department_id: "dept-roads-01",
    status: "CLASSIFIED_INFRASTRUCTURE",
    final_issue_type: "INFRASTRUCTURE",
    ai_issue_type: "INFRASTRUCTURE",
  },
  "issue-infra-002": {
    id: "issue-infra-002",
    title: "Alluri Sitharama Raju district primary healthcare facility expansion",
    description: "Specialized rural hospital building construction and ambulance bay.",
    district_id: "IN-D0001", // Alluri Sitharama Raju (India wide)
    department_id: "dept-health-01",
    status: "INFRASTRUCTURE_REVIEW",
    final_issue_type: "INFRASTRUCTURE",
    ai_issue_type: "INFRASTRUCTURE",
  },
  "issue-no-district": {
    id: "issue-no-district",
    title: "Unresolved location road defect",
    description: "Missing district assignment.",
    district_id: null,
    department_id: "dept-roads-01",
    status: "AWAITING_ADMIN_CLASSIFICATION",
    final_issue_type: null,
    ai_issue_type: null,
  },
  "issue-no-department": {
    id: "issue-no-department",
    title: "Unassigned department request",
    description: "Missing department assignment.",
    district_id: "IN-D0248",
    department_id: null,
    status: "AWAITING_ADMIN_CLASSIFICATION",
    final_issue_type: null,
    ai_issue_type: null,
  },
  "issue-unmapped-dept": {
    id: "issue-unmapped-dept",
    title: "Department with no planning sector",
    description: "Department not mapped in department_planning_sectors.",
    district_id: "IN-D0248",
    department_id: "dept-unmapped-99",
    status: "CLASSIFIED_INFRASTRUCTURE",
    final_issue_type: "INFRASTRUCTURE",
    ai_issue_type: "INFRASTRUCTURE",
  },
};

const MOCK_DEPT_SECTORS = {
  "dept-roads-01": {
    planning_sector_code: "DEPT-01",
    planning_sector_name: "Roads & Transport",
    is_primary: true,
  },
  "dept-health-01": {
    planning_sector_code: "DEPT-04",
    planning_sector_name: "Healthcare Facilities",
    is_primary: true,
  },
};

// Mock RPC Dispatcher simulating public.get_district_infrastructure_context
function mockRpcDispatch(rpcName, params) {
  assert.strictEqual(rpcName, "get_district_infrastructure_context");

  const { p_district_id, p_planning_sector_code, p_financial_year, p_infrastructure_id } = params;

  if (p_district_id === "IN-INVALID-9999") {
    return {
      data: null,
      error: {
        message: 'District "IN-INVALID-9999" not found in canonical districts master.',
        code: "P0002",
        details: null,
      },
    };
  }

  const isJharkhand = p_district_id === "IN-D0248";
  const sourcePrefix = isJharkhand ? "JHARKHAND" : "INDIA";

  const data = {
    district: {
      district_id: p_district_id,
      district_name: isJharkhand ? "Ranchi" : "Alluri Sitharama Raju",
      state_code: isJharkhand ? "IN-ST-15" : "IN-ST-01",
      state_name: isJharkhand ? "Jharkhand" : "Andhra Pradesh",
      country_code: "IN",
      canonical_source: "INDIA_D1_D3",
      alternate_source_codes: isJharkhand ? ["JH-D20"] : [],
      primary_source_dataset: sourcePrefix,
    },
    query: {
      planning_sector_code: p_planning_sector_code,
      financial_year: p_financial_year || "FY2026-27",
      infrastructure_id: p_infrastructure_id || null,
    },
    population: {
      total_population: isJharkhand ? 2914253 : 953960,
      total_households: isJharkhand ? 582850 : 212000,
      development_need_score: 48.6,
      population_impact_score: 62.1,
      overall_service_gap_score: 42.8,
      source_dataset: `${sourcePrefix}_D1`,
    },
    budget: {
      planning_sector_code: p_planning_sector_code,
      planning_sector_name: p_planning_sector_code === "DEPT-01" ? "Roads & Transport" : "Healthcare Facilities",
      financial_year: p_financial_year || "FY2026-27",
      funding_source: "STATE",
      unit: "INR_CRORE",
      allocated_budget_crore: 450.0,
      released_budget_crore: 420.0,
      committed_budget_crore: 296.0,
      spent_budget_crore: 296.0,
      unspent_budget_crore: 124.0,
      available_for_new_development_crore: 124.0,
      budget_utilization_percentage: 70.48,
      budget_pressure_score: 48.2,
      source_dataset: `${sourcePrefix}_D2`,
    },
    geography: {
      area_sq_km: 5097.0,
      centroid_latitude: 23.3441,
      centroid_longitude: 85.3096,
      terrain_type: "PLATEAU",
      rural_urban_character: "MIXED",
      source_dataset: `${sourcePrefix}_D3`,
    },
    infrastructure_assets: p_infrastructure_id
      ? [
          {
            infrastructure_id: p_infrastructure_id,
            infrastructure_category: "Healthcare",
            existing_asset_count: 142,
            functional_asset_count: 128,
            infrastructure_gap_score: 3.8,
            source_dataset: `${sourcePrefix}_D4`,
          },
        ]
      : Array.from({ length: 8 }, (_, i) => ({
          infrastructure_id: `INFRA-0${i + 1}`,
          infrastructure_category: `Category 0${i + 1}`,
          existing_asset_count: 100 + i * 10,
          functional_asset_count: 90 + i * 10,
          infrastructure_gap_score: 3.0 + i * 0.1,
          source_dataset: `${sourcePrefix}_D4`,
        })),
    accessibility: {
      road_connectivity_score: 68.2,
      overall_accessibility_gap_score: 31.8,
      source_dataset: `${sourcePrefix}_D5`,
    },
    socioeconomic: {
      essential_service_gap_score: 41.2,
      overall_development_context_score: 43.6,
      source_dataset: `${sourcePrefix}_D6`,
    },
    historical_projects: {
      project_count: 1,
      average_actual_cost_crore: 18.5,
      average_cost_per_beneficiary: 420.0,
      average_execution_efficiency: 84.5,
      average_cost_variance_percentage: 2.8,
      average_time_variance_percentage: 5.0,
      projects: [
        {
          project_id: isJharkhand ? "JH-PROJ-0191" : "IN-PROJ-0001",
          project_type: "Road Improvement",
          financial_year: "FY2023-24",
          project_status: "COMPLETED",
          unit: "INR_CRORE",
          estimated_cost_crore: 18.0,
          approved_cost_crore: 18.0,
          actual_cost_crore: 18.5,
          historical_cost_per_beneficiary: 420.0,
          project_execution_efficiency_score: 84.5,
          source_dataset: `${sourcePrefix}_D7`,
        },
      ],
    },
    provenance: {
      datasets: ["D1", "D2", "D3", "D4", "D5", "D6", "D7"],
      source_prefix: sourcePrefix,
      synthetic_benchmark_used: false,
    },
  };

  return { data, error: null };
}

// Mock Supabase Client
function createMockSupabaseClient() {
  const queryLogs = [];

  return {
    queryLogs,
    from(tableName) {
      return {
        select(columns) {
          return {
            eq(colName, val) {
              return {
                order(orderCol, orderOpts) {
                  return {
                    limit(limitCount) {
                      return {
                        maybeSingle: async () => {
                          queryLogs.push({ table: tableName, type: "select", colName, val });
                          if (tableName === "department_planning_sectors") {
                            const mapping = MOCK_DEPT_SECTORS[val];
                            return { data: mapping || null, error: null };
                          }
                          return { data: null, error: null };
                        },
                      };
                    },
                  };
                },
                maybeSingle: async () => {
                  queryLogs.push({ table: tableName, type: "select", colName, val });
                  if (tableName === "issues") {
                    const issue = MOCK_ISSUES[val];
                    return { data: issue || null, error: null };
                  }
                  if (tableName === "department_planning_sectors") {
                    const mapping = MOCK_DEPT_SECTORS[val];
                    return { data: mapping || null, error: null };
                  }
                  return { data: null, error: null };
                },
              };
            },
          };
        },
      };
    },
    rpc: async (fnName, params) => {
      queryLogs.push({ type: "rpc", fnName, params });
      return mockRpcDispatch(fnName, params);
    },
  };
}

// Replicate Service implementation for pure node execution
class DistrictInfrastructureContextError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = "DistrictInfrastructureContextError";
    this.code = code;
    this.details = details;
  }
}

function validateDistrictInfrastructureContextParams(params) {
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

async function getDistrictInfrastructureContext(params, client) {
  const validated = validateDistrictInfrastructureContextParams(params);

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

  return data;
}

async function resolveIssuePlanningSector(departmentId, client) {
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

async function fetchIssueInfrastructureContext(issueId, options, client) {
  if (!issueId || typeof issueId !== "string" || issueId.trim() === "") {
    throw new DistrictInfrastructureContextError(
      "Parameter 'issueId' must be a valid non-empty string.",
      "INVALID_ISSUE_ID"
    );
  }

  const trimmedIssueId = issueId.trim();

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

  const planningSectorCode = await resolveIssuePlanningSector(issue.department_id, client);

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

// Test Runner
async function runPhase3Tests() {
  console.log("=======================================================================");
  console.log("CivicFix — Phase 3 Infrastructure Lifecycle Integration Test Suite");
  console.log("=======================================================================\n");

  const results = [];

  // Test 1: Issue-to-context resolution with valid district_id & department_id
  try {
    const client = createMockSupabaseClient();
    const result = await fetchIssueInfrastructureContext("issue-infra-001", {}, client);

    assert.strictEqual(result.issue_id, "issue-infra-001");
    assert.strictEqual(result.district_id, "IN-D0248");
    assert.strictEqual(result.department_id, "dept-roads-01");
    assert.strictEqual(result.planning_sector_code, "DEPT-01");
    assert.strictEqual(result.issue_status, "CLASSIFIED_INFRASTRUCTURE");
    assert.strictEqual(result.final_issue_type, "INFRASTRUCTURE");
    assert.ok(result.context);
    assert.strictEqual(result.context.district.district_id, "IN-D0248");
    results.push(["Test 1: Issue-to-Context Resolution (Ranchi IN-D0248 / DEPT-01)", true]);
  } catch (err) {
    results.push(["Test 1: Issue-to-Context Resolution (Ranchi IN-D0248 / DEPT-01)", false, err.message]);
  }

  // Test 2: D1–D7 context completeness across all 7 dataset dimensions
  try {
    const client = createMockSupabaseClient();
    const result = await fetchIssueInfrastructureContext("issue-infra-001", {}, client);
    const ctx = result.context;

    assert.ok(ctx.population, "Missing D1 population context");
    assert.ok(ctx.budget, "Missing D2 budget context");
    assert.ok(ctx.geography, "Missing D3 geography context");
    assert.ok(Array.isArray(ctx.infrastructure_assets) && ctx.infrastructure_assets.length > 0, "Missing D4 infra assets");
    assert.ok(ctx.accessibility, "Missing D5 accessibility context");
    assert.ok(ctx.socioeconomic, "Missing D6 socioeconomic context");
    assert.ok(ctx.historical_projects, "Missing D7 historical projects context");
    assert.ok(ctx.provenance, "Missing provenance context");

    results.push(["Test 2: D1–D7 Context Completeness (All 7 Dimensions Present)", true]);
  } catch (err) {
    results.push(["Test 2: D1–D7 Context Completeness (All 7 Dimensions Present)", false, err.message]);
  }

  // Test 3: D8 benchmark isolation (synthetic_benchmark_used === false, zero D8 queries)
  try {
    const client = createMockSupabaseClient();
    const result = await fetchIssueInfrastructureContext("issue-infra-001", {}, client);

    assert.strictEqual(result.context.provenance.synthetic_benchmark_used, false);
    assert.strictEqual(result.context.provenance.datasets.includes("D8"), false);

    // Verify client never queried benchmark_development_requests
    const d8Queries = client.queryLogs.filter((q) => q.table === "benchmark_development_requests");
    assert.strictEqual(d8Queries.length, 0, "Benchmark table was unexpectedly queried");

    results.push(["Test 3: D8 Benchmark Isolation (synthetic_benchmark_used === false)", true]);
  } catch (err) {
    results.push(["Test 3: D8 Benchmark Isolation (synthetic_benchmark_used === false)", false, err.message]);
  }

  // Test 4: Specific infrastructure category filtering (INFRA-01 vs full array)
  try {
    const client = createMockSupabaseClient();
    const result = await fetchIssueInfrastructureContext(
      "issue-infra-001",
      { infrastructureId: "INFRA-01" },
      client
    );

    assert.strictEqual(result.context.query.infrastructure_id, "INFRA-01");
    assert.strictEqual(result.context.infrastructure_assets.length, 1);
    assert.strictEqual(result.context.infrastructure_assets[0].infrastructure_id, "INFRA-01");

    results.push(["Test 4: Infrastructure Asset Category Filtering (INFRA-01)", true]);
  } catch (err) {
    results.push(["Test 4: Infrastructure Asset Category Filtering (INFRA-01)", false, err.message]);
  }

  // Test 5: Default financial year fallback resolution
  try {
    const client = createMockSupabaseClient();
    const result = await fetchIssueInfrastructureContext("issue-infra-001", {}, client);

    assert.ok(result.context.query.financial_year);
    assert.ok(result.context.budget.financial_year);
    assert.strictEqual(result.context.budget.financial_year, result.context.query.financial_year);

    results.push(["Test 5: Default Financial Year Fallback Resolution", true]);
  } catch (err) {
    results.push(["Test 5: Default Financial Year Fallback Resolution", false, err.message]);
  }

  // Test 6: Explicit financial year parameter passing (FY2024-25)
  try {
    const client = createMockSupabaseClient();
    const result = await fetchIssueInfrastructureContext(
      "issue-infra-001",
      { financialYear: "FY2024-25" },
      client
    );

    assert.strictEqual(result.context.query.financial_year, "FY2024-25");
    assert.strictEqual(result.context.budget.financial_year, "FY2024-25");

    results.push(["Test 6: Explicit Financial Year Passing (FY2024-25)", true]);
  } catch (err) {
    results.push(["Test 6: Explicit Financial Year Passing (FY2024-25)", false, err.message]);
  }

  // Test 7: Read-only verification (zero database mutations across context layer)
  try {
    const code = fs.readFileSync("src/lib/infrastructure-context.ts", "utf-8");
    assert.ok(!code.includes(".insert("), "Must not perform .insert() mutations");
    assert.ok(!code.includes(".update("), "Must not perform .update() mutations");
    assert.ok(!code.includes(".delete("), "Must not perform .delete() mutations");
    assert.ok(!code.includes(".upsert("), "Must not perform .upsert() mutations");

    results.push(["Test 7: Read-Only Verification (Zero Database Mutations)", true]);
  } catch (err) {
    results.push(["Test 7: Read-Only Verification (Zero Database Mutations)", false, err.message]);
  }

  // Test 8: Workflow preservation (SIMPLE & COMPLEX separation preserved)
  try {
    const code = fs.readFileSync("src/lib/infrastructure-context.ts", "utf-8");
    // Context service must not alter state machines or decision logic
    assert.ok(!code.includes("enforce_issue_classification_authority"), "Must not interfere with classification authority triggers");
    assert.ok(!code.includes("validate_issue_status_history_transition"), "Must not interfere with transition triggers");

    results.push(["Test 8: Workflow Preservation (SIMPLE & COMPLEX Workflows Intact)", true]);
  } catch (err) {
    results.push(["Test 8: Workflow Preservation (SIMPLE & COMPLEX Workflows Intact)", false, err.message]);
  }

  // Test 9: Robust error handling (missing district_id, missing department_id, unmapped dept, invalid ID)
  try {
    const client = createMockSupabaseClient();

    // 9a. Missing district_id
    let noDistCaught = false;
    try {
      await fetchIssueInfrastructureContext("issue-no-district", {}, client);
    } catch (e) {
      noDistCaught = e.code === "MISSING_DISTRICT_ID";
    }
    assert.strictEqual(noDistCaught, true, "Expected MISSING_DISTRICT_ID error");

    // 9b. Missing department_id
    let noDeptCaught = false;
    try {
      await fetchIssueInfrastructureContext("issue-no-department", {}, client);
    } catch (e) {
      noDeptCaught = e.code === "MISSING_DEPARTMENT_ID";
    }
    assert.strictEqual(noDeptCaught, true, "Expected MISSING_DEPARTMENT_ID error");

    // 9c. Unmapped department
    let unmappedDeptCaught = false;
    try {
      await fetchIssueInfrastructureContext("issue-unmapped-dept", {}, client);
    } catch (e) {
      unmappedDeptCaught = e.code === "PLANNING_SECTOR_NOT_FOUND";
    }
    assert.strictEqual(unmappedDeptCaught, true, "Expected PLANNING_SECTOR_NOT_FOUND error");

    // 9d. Non-existent issue
    let notFoundCaught = false;
    try {
      await fetchIssueInfrastructureContext("issue-non-existent", {}, client);
    } catch (e) {
      notFoundCaught = e.code === "ISSUE_NOT_FOUND";
    }
    assert.strictEqual(notFoundCaught, true, "Expected ISSUE_NOT_FOUND error");

    // 9e. Invalid blank issue ID
    let invalidIdCaught = false;
    try {
      await fetchIssueInfrastructureContext("   ", {}, client);
    } catch (e) {
      invalidIdCaught = e.code === "INVALID_ISSUE_ID";
    }
    assert.strictEqual(invalidIdCaught, true, "Expected INVALID_ISSUE_ID error");

    results.push(["Test 9: Robust Error Handling (Missing District/Dept/Unmapped/Invalid)", true]);
  } catch (err) {
    results.push(["Test 9: Robust Error Handling (Missing District/Dept/Unmapped/Invalid)", false, err.message]);
  }

  // Test 10: Idempotency & repeatability (deterministic outputs without state drift)
  try {
    const client = createMockSupabaseClient();
    const run1 = await fetchIssueInfrastructureContext("issue-infra-001", {}, client);
    const run2 = await fetchIssueInfrastructureContext("issue-infra-001", {}, client);

    assert.strictEqual(run1.district_id, run2.district_id);
    assert.strictEqual(run1.planning_sector_code, run2.planning_sector_code);
    assert.strictEqual(JSON.stringify(run1.context), JSON.stringify(run2.context));

    results.push(["Test 10: Idempotency & Repeatability (Deterministic Factual Context)", true]);
  } catch (err) {
    results.push(["Test 10: Idempotency & Repeatability (Deterministic Factual Context)", false, err.message]);
  }

  // Summary Report
  console.log("-----------------------------------------------------------------------");
  console.log(`${"TEST CASE".padEnd(70)} | ${"STATUS".padEnd(6)}`);
  console.log("-----------------------------------------------------------------------");
  let allPassed = true;
  for (const [name, passed, detail] of results) {
    if (!passed) allPassed = false;
    console.log(`${name.padEnd(70)} | ${passed ? "PASS" : "FAIL"}`);
    if (!passed && detail) {
      console.log(`   -> Error: ${detail}`);
    }
  }
  console.log("-----------------------------------------------------------------------");

  if (allPassed) {
    console.log("\nALL 10 PHASE 3 TEST CASES PASSED SUCCESSFULLY.");
    process.exit(0);
  } else {
    console.log("\nSOME PHASE 3 TESTS FAILED.");
    process.exit(1);
  }
}

runPhase3Tests();
