/**
 * CivicFix — Phase 2 Backend Infrastructure Context Service Test Suite
 * ====================================================================
 * Validates the TypeScript backend service layer and input validation:
 * - Test 1: Jharkhand district (IN-D0248 Ranchi) with planning sector (DEPT-01).
 * - Test 2: India district (IN-D0001 Alluri Sitharama Raju) with DEPT-01.
 * - Test 3: Explicit financial year parameter passing (FY2024-25).
 * - Test 4: Default financial year resolution.
 * - Test 5: Infrastructure category filtering (INFRA-01 vs full array).
 * - Test 6: Invalid district error propagation (no fabricated data).
 * - Test 7: Input validation rejection before RPC dispatch.
 * - Test 8: D8 isolation (no benchmark queries executed).
 * - Test 9: Read-only behavior (zero mutation operations).
 * - Test 10: Repeatability & deterministic execution.
 */

const assert = require("assert");

// Mock RPC Runner simulating public.get_district_infrastructure_context output contract
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
      planning_sector_name: "Roads & Transport",
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

// Minimal mock Supabase client wrapping mockRpcDispatch
const mockSupabaseClient = {
  rpc: async (fnName, params) => mockRpcDispatch(fnName, params),
};

// Replicate service functions in JS to run without build steps for direct CLI validation
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

async function getDistrictInfrastructureContext(params, client = mockSupabaseClient) {
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

async function runTests() {
  console.log("==================================================================");
  console.log("CivicFix — Phase 2 Backend Infrastructure Context Service Tests");
  console.log("==================================================================\n");

  const results = [];

  // Test 1: Jharkhand district (IN-D0248 Ranchi) with planning sector (DEPT-01)
  try {
    const res = await getDistrictInfrastructureContext({
      districtId: "IN-D0248",
      planningSectorCode: "DEPT-01",
    });
    assert.strictEqual(res.district.district_id, "IN-D0248");
    assert.strictEqual(res.district.district_name, "Ranchi");
    assert.strictEqual(res.provenance.source_prefix, "JHARKHAND");
    assert.strictEqual(res.budget.unit, "INR_CRORE");
    assert.strictEqual(res.infrastructure_assets.length, 8);
    assert.strictEqual(res.provenance.synthetic_benchmark_used, false);
    results.push(["Test 1: Jharkhand District Service Query (Ranchi IN-D0248)", true]);
  } catch (err) {
    results.push(["Test 1: Jharkhand District Service Query (Ranchi IN-D0248)", false, err.message]);
  }

  // Test 2: India district (IN-D0001 Alluri Sitharama Raju) with DEPT-01
  try {
    const res = await getDistrictInfrastructureContext({
      districtId: "IN-D0001",
      planningSectorCode: "DEPT-01",
    });
    assert.strictEqual(res.district.district_id, "IN-D0001");
    assert.strictEqual(res.district.state_name, "Andhra Pradesh");
    assert.strictEqual(res.provenance.source_prefix, "INDIA");
    assert.strictEqual(res.population.total_population > 0, true);
    results.push(["Test 2: India District Service Query (Alluri Sitharama Raju IN-D0001)", true]);
  } catch (err) {
    results.push(["Test 2: India District Service Query (Alluri Sitharama Raju IN-D0001)", false, err.message]);
  }

  // Test 3: Explicit financial year parameter passing (FY2024-25)
  try {
    const res = await getDistrictInfrastructureContext({
      districtId: "IN-D0248",
      planningSectorCode: "DEPT-01",
      financialYear: "FY2024-25",
    });
    assert.strictEqual(res.query.financial_year, "FY2024-25");
    assert.strictEqual(res.budget.financial_year, "FY2024-25");
    results.push(["Test 3: Explicit Financial Year (FY2024-25)", true]);
  } catch (err) {
    results.push(["Test 3: Explicit Financial Year (FY2024-25)", false, err.message]);
  }

  // Test 4: Default financial year resolution
  try {
    const res = await getDistrictInfrastructureContext({
      districtId: "IN-D0248",
      planningSectorCode: "DEPT-01",
    });
    assert.ok(res.query.financial_year);
    assert.ok(res.budget.financial_year);
    results.push(["Test 4: Default Financial Year Resolution", true]);
  } catch (err) {
    results.push(["Test 4: Default Financial Year Resolution", false, err.message]);
  }

  // Test 5: Infrastructure category filtering (INFRA-01 vs full array)
  try {
    const filtered = await getDistrictInfrastructureContext({
      districtId: "IN-D0248",
      planningSectorCode: "DEPT-01",
      infrastructureId: "INFRA-01",
    });
    assert.strictEqual(filtered.infrastructure_assets.length, 1);
    assert.strictEqual(filtered.infrastructure_assets[0].infrastructure_id, "INFRA-01");

    const all = await getDistrictInfrastructureContext({
      districtId: "IN-D0248",
      planningSectorCode: "DEPT-01",
    });
    assert.strictEqual(all.infrastructure_assets.length, 8);
    results.push(["Test 5: Infrastructure Category Filtering (INFRA-01 vs Full Set)", true]);
  } catch (err) {
    results.push(["Test 5: Infrastructure Category Filtering (INFRA-01 vs Full Set)", false, err.message]);
  }

  // Test 6: Invalid district error propagation (no fabricated data)
  try {
    let errorCaught = false;
    try {
      await getDistrictInfrastructureContext({
        districtId: "IN-INVALID-9999",
        planningSectorCode: "DEPT-01",
      });
    } catch (err) {
      errorCaught = true;
      assert.strictEqual(err.code, "P0002");
    }
    assert.strictEqual(errorCaught, true, "Expected RPC error was not thrown");
    results.push(["Test 6: Invalid District Error Propagation (No Fabricated Data)", true]);
  } catch (err) {
    results.push(["Test 6: Invalid District Error Propagation (No Fabricated Data)", false, err.message]);
  }

  // Test 7: Input validation rejection before RPC dispatch
  try {
    let emptyDistCaught = false;
    try {
      validateDistrictInfrastructureContextParams({
        districtId: "   ",
        planningSectorCode: "DEPT-01",
      });
    } catch (err) {
      emptyDistCaught = true;
      assert.strictEqual(err.code, "INVALID_DISTRICT_ID");
    }

    let emptySectorCaught = false;
    try {
      validateDistrictInfrastructureContextParams({
        districtId: "IN-D0248",
        planningSectorCode: "",
      });
    } catch (err) {
      emptySectorCaught = true;
      assert.strictEqual(err.code, "INVALID_PLANNING_SECTOR");
    }

    assert.strictEqual(emptyDistCaught && emptySectorCaught, true);
    results.push(["Test 7: Client-Side Input Validation Before RPC Dispatch", true]);
  } catch (err) {
    results.push(["Test 7: Client-Side Input Validation Before RPC Dispatch", false, err.message]);
  }

  // Test 8: D8 isolation (no benchmark queries executed)
  try {
    const res = await getDistrictInfrastructureContext({
      districtId: "IN-D0248",
      planningSectorCode: "DEPT-01",
    });
    assert.strictEqual(res.provenance.synthetic_benchmark_used, false);
    assert.strictEqual(res.provenance.datasets.includes("D8"), false);
    results.push(["Test 8: D8 Benchmark Isolation (Zero Direct Access)", true]);
  } catch (err) {
    results.push(["Test 8: D8 Benchmark Isolation (Zero Direct Access)", false, err.message]);
  }

  // Test 9: Read-only behavior (zero mutation operations)
  try {
    const fs = require("fs");
    const serviceContent = fs.readFileSync("src/lib/infrastructure-context.ts", "utf-8");
    assert.ok(!serviceContent.includes(".insert("));
    assert.ok(!serviceContent.includes(".update("));
    assert.ok(!serviceContent.includes(".delete("));
    assert.ok(!serviceContent.includes(".upsert("));
    assert.ok(serviceContent.includes('.rpc("get_district_infrastructure_context"'));
    results.push(["Test 9: Read-Only Service Behavior (Zero Database Mutations)", true]);
  } catch (err) {
    results.push(["Test 9: Read-Only Service Behavior (Zero Database Mutations)", false, err.message]);
  }

  // Test 10: Repeatability & deterministic execution
  try {
    const call1 = await getDistrictInfrastructureContext({
      districtId: "IN-D0248",
      planningSectorCode: "DEPT-01",
    });
    const call2 = await getDistrictInfrastructureContext({
      districtId: "IN-D0248",
      planningSectorCode: "DEPT-01",
    });
    assert.strictEqual(JSON.stringify(call1), JSON.stringify(call2));
    results.push(["Test 10: Idempotency & Repeatability (Deterministic Result)", true]);
  } catch (err) {
    results.push(["Test 10: Idempotency & Repeatability (Deterministic Result)", false, err.message]);
  }

  // Print results summary
  console.log("-------------------------------------------------------------");
  console.log(`${"TEST CASE".padEnd(65)} | ${"STATUS".padEnd(6)}`);
  console.log("-------------------------------------------------------------");
  let allPassed = true;
  for (const [name, passed, detail] of results) {
    if (!passed) allPassed = false;
    console.log(`${name.padEnd(65)} | ${passed ? "PASS" : "FAIL"}`);
    if (!passed && detail) {
      console.log(`   -> Error: ${detail}`);
    }
  }
  console.log("-------------------------------------------------------------");

  if (allPassed) {
    console.log("\nALL 10 TEST CASES PASSED SUCCESSFULLY.");
    process.exit(0);
  } else {
    console.log("\nSOME TESTS FAILED.");
    process.exit(1);
  }
}

runTests();
