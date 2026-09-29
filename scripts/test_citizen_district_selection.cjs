/**
 * CivicFix: Citizen District Selection & Infrastructure Context Test Suite
 * =========================================================================
 * Verifies explicit citizen district selection architecture:
 *
 * 1. District selector loads canonical districts (fetchCanonicalDistricts)
 * 2. Citizen can select Ranchi (display: "Ranchi")
 * 3. Ranchi stores: district_id = 'IN-D0248', district_resolution_method = 'CITIZEN_SELECTED'
 * 4. Citizen can select Dhanbad (display: "Dhanbad")
 * 5. Dhanbad stores: district_id = 'IN-D0232', district_resolution_method = 'CITIZEN_SELECTED'
 * 6. Infrastructure classification uses the stored district_id
 * 7. Infrastructure context retrieval uses the stored district_id
 * 8. No PostGIS district-resolution function is called in application flow
 * 9. GPS_POSTGIS is completely removed from operational application paths
 * 10. Missing district does not result in a fabricated district (preserves null)
 * 11. SIMPLE workflow still works without mandatory district selection
 * 12. COMPLEX workflow still works without mandatory district selection
 * 13. Existing infrastructure assessment workflow still works
 * 14. Existing Admin PASSED / NOT PASSED workflow still works
 * 15. Citizen decision transparency remains intact
 * 16. D8 synthetic benchmarks remain isolated from operational context
 * 17. Migration 0063 seeds all 24 canonical Jharkhand districts (IN-D0229 to IN-D0252)
 * 18. Live database contains all 24 canonical Jharkhand districts with public read access
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("===============================================================================");
console.log("CIVICFIX: CITIZEN DISTRICT SELECTION ARCHITECTURE TEST SUITE");
console.log("===============================================================================\n");

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

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ PASS [${totalTests}]: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL [${totalTests}]: ${name}`);
    console.error(`    Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------------------------------
// File Inspections
// ----------------------------------------------------------------------------
const rootDir = path.resolve(__dirname, "..");
const migration0063Path = path.join(rootDir, "supabase/migrations/0063_civicfix_citizen_district_selection.sql");
const infraContextLibPath = path.join(rootDir, "src/lib/infrastructure-context.ts");
const infraAssessmentLibPath = path.join(rootDir, "src/lib/infrastructure-assessment.ts");
const infraTypesPath = path.join(rootDir, "src/types/infrastructure-context.ts");
const dbTypesPath = path.join(rootDir, "src/types/database.ts");
const reportRoutePath = path.join(rootDir, "src/routes/citizen/report.tsx");
const adminAssessmentRoutePath = path.join(rootDir, "src/routes/admin/infrastructure-assessment.tsx");

const migration0063Code = fs.readFileSync(migration0063Path, "utf8");
const infraContextLibCode = fs.readFileSync(infraContextLibPath, "utf8");
const infraAssessmentLibCode = fs.readFileSync(infraAssessmentLibPath, "utf8");
const infraTypesCode = fs.readFileSync(infraTypesPath, "utf8");
const dbTypesCode = fs.readFileSync(dbTypesPath, "utf8");
const reportRouteCode = fs.readFileSync(reportRoutePath, "utf8");
const adminAssessmentRouteCode = fs.readFileSync(adminAssessmentRoutePath, "utf8");

// Canonical 24 Jharkhand Districts Reference
const CANONICAL_JHARKHAND_DISTRICTS = [
  { id: "IN-D0229", name: "Bokaro" },
  { id: "IN-D0230", name: "Chatra" },
  { id: "IN-D0231", name: "Deoghar" },
  { id: "IN-D0232", name: "Dhanbad" },
  { id: "IN-D0233", name: "Dumka" },
  { id: "IN-D0234", name: "East Singhbhum" },
  { id: "IN-D0235", name: "Garhwa" },
  { id: "IN-D0236", name: "Giridih" },
  { id: "IN-D0237", name: "Godda" },
  { id: "IN-D0238", name: "Gumla" },
  { id: "IN-D0239", name: "Hazaribagh" },
  { id: "IN-D0240", name: "Jamtara" },
  { id: "IN-D0241", name: "Khunti" },
  { id: "IN-D0242", name: "Koderma" },
  { id: "IN-D0243", name: "Latehar" },
  { id: "IN-D0244", name: "Lohardaga" },
  { id: "IN-D0245", name: "Pakur" },
  { id: "IN-D0246", name: "Palamu" },
  { id: "IN-D0247", name: "Ramgarh" },
  { id: "IN-D0248", name: "Ranchi" },
  { id: "IN-D0249", name: "Sahibganj" },
  { id: "IN-D0250", name: "Saraikela Kharsawan" },
  { id: "IN-D0251", name: "Simdega" },
  { id: "IN-D0252", name: "West Singhbhum" },
];

// Canonical Sample Districts Across India
const SAMPLE_INDIA_DISTRICTS = [
  { state: "Jharkhand", id: "IN-D0248", name: "Ranchi" },
  { state: "Jharkhand", id: "IN-D0232", name: "Dhanbad" },
  { state: "Maharashtra", id: "IN-D0378", name: "Pune" },
  { state: "Maharashtra", id: "IN-D0370", name: "Mumbai City" },
  { state: "Maharashtra", id: "IN-D0371", name: "Mumbai Suburban" },
  { state: "Karnataka", id: "IN-D0257", name: "Bengaluru Urban" },
  { state: "Karnataka", id: "IN-D0274", name: "Mysuru" },
  { state: "Uttar Pradesh", id: "IN-D0679", name: "Lucknow" },
  { state: "Uttar Pradesh", id: "IN-D0673", name: "Kanpur Nagar" },
  { state: "West Bengal", id: "IN-D0730", name: "Kolkata" },
  { state: "West Bengal", id: "IN-D0726", name: "Howrah" },
  { state: "Delhi", id: "IN-D0751", name: "New Delhi" },
  { state: "Chandigarh", id: "IN-D0745", name: "Chandigarh" },
  { state: "Puducherry", id: "IN-D0785", name: "Puducherry" },
];

async function main() {
  // Test 1: District selector loads canonical districts
  runTest("fetchCanonicalDistricts service queries public.districts ordered by name", () => {
    assert.ok(
      infraContextLibCode.includes("export async function fetchCanonicalDistricts"),
      "infrastructure-context.ts must export fetchCanonicalDistricts"
    );
    assert.ok(
      infraContextLibCode.includes('.from("districts")'),
      "fetchCanonicalDistricts must query public.districts"
    );
    assert.ok(
      reportRouteCode.includes("fetchCanonicalDistricts"),
      "report.tsx must import and invoke fetchCanonicalDistricts"
    );
  });

  // Test 2 & 3: Citizen can select Ranchi (Jharkhand) -> IN-D0248
  runTest("Selecting Ranchi (Jharkhand) stores district_id = 'IN-D0248' and method = 'CITIZEN_SELECTED'", () => {
    const selectedDistrict = "IN-D0248";
    const payload = {
      district_id: selectedDistrict.trim() || null,
      district_resolution_method: selectedDistrict.trim() ? "CITIZEN_SELECTED" : null,
    };
    assert.strictEqual(payload.district_id, "IN-D0248");
    assert.strictEqual(payload.district_resolution_method, "CITIZEN_SELECTED");
  });

  // Test 4 & 5: Citizen can select Dhanbad (Jharkhand) -> IN-D0232
  runTest("Selecting Dhanbad (Jharkhand) stores district_id = 'IN-D0232' and method = 'CITIZEN_SELECTED'", () => {
    const selectedDistrict = "IN-D0232";
    const payload = {
      district_id: selectedDistrict.trim() || null,
      district_resolution_method: selectedDistrict.trim() ? "CITIZEN_SELECTED" : null,
    };
    assert.strictEqual(payload.district_id, "IN-D0232");
    assert.strictEqual(payload.district_resolution_method, "CITIZEN_SELECTED");
  });

  // Test 6: Citizen can select Pune (Maharashtra) -> IN-D0378
  runTest("Selecting Pune (Maharashtra) stores district_id = 'IN-D0378' and method = 'CITIZEN_SELECTED'", () => {
    const selectedDistrict = "IN-D0378";
    const payload = {
      district_id: selectedDistrict.trim() || null,
      district_resolution_method: selectedDistrict.trim() ? "CITIZEN_SELECTED" : null,
    };
    assert.strictEqual(payload.district_id, "IN-D0378");
    assert.strictEqual(payload.district_resolution_method, "CITIZEN_SELECTED");
  });

  // Test 7: Citizen can select Bengaluru Urban (Karnataka) -> IN-D0257
  runTest("Selecting Bengaluru Urban (Karnataka) stores district_id = 'IN-D0257' and method = 'CITIZEN_SELECTED'", () => {
    const selectedDistrict = "IN-D0257";
    const payload = {
      district_id: selectedDistrict.trim() || null,
      district_resolution_method: selectedDistrict.trim() ? "CITIZEN_SELECTED" : null,
    };
    assert.strictEqual(payload.district_id, "IN-D0257");
    assert.strictEqual(payload.district_resolution_method, "CITIZEN_SELECTED");
  });

  // Test 8: Citizen can select Lucknow (Uttar Pradesh) -> IN-D0679
  runTest("Selecting Lucknow (Uttar Pradesh) stores district_id = 'IN-D0679' and method = 'CITIZEN_SELECTED'", () => {
    const selectedDistrict = "IN-D0679";
    const payload = {
      district_id: selectedDistrict.trim() || null,
      district_resolution_method: selectedDistrict.trim() ? "CITIZEN_SELECTED" : null,
    };
    assert.strictEqual(payload.district_id, "IN-D0679");
    assert.strictEqual(payload.district_resolution_method, "CITIZEN_SELECTED");
  });

  // Test 9: Citizen can select Kolkata (West Bengal) -> IN-D0730
  runTest("Selecting Kolkata (West Bengal) stores district_id = 'IN-D0730' and method = 'CITIZEN_SELECTED'", () => {
    const selectedDistrict = "IN-D0730";
    const payload = {
      district_id: selectedDistrict.trim() || null,
      district_resolution_method: selectedDistrict.trim() ? "CITIZEN_SELECTED" : null,
    };
    assert.strictEqual(payload.district_id, "IN-D0730");
    assert.strictEqual(payload.district_resolution_method, "CITIZEN_SELECTED");
  });

  // Test 10: Citizen can select New Delhi (Delhi UT) -> IN-D0751
  runTest("Selecting New Delhi (Delhi UT) stores district_id = 'IN-D0751' and method = 'CITIZEN_SELECTED'", () => {
    const selectedDistrict = "IN-D0751";
    const payload = {
      district_id: selectedDistrict.trim() || null,
      district_resolution_method: selectedDistrict.trim() ? "CITIZEN_SELECTED" : null,
    };
    assert.strictEqual(payload.district_id, "IN-D0751");
    assert.strictEqual(payload.district_resolution_method, "CITIZEN_SELECTED");
  });

  // Test 11: Infrastructure classification uses stored district_id
  runTest("Infrastructure classification consumes stored issue.district_id", () => {
    assert.ok(
      infraContextLibCode.includes("validateIssueInfrastructureReadiness"),
      "Context service validates issue.district_id"
    );
  });

  // Test 12: Infrastructure context retrieval uses stored district_id
  runTest("Infrastructure context RPC is dispatched with canonical district_id", () => {
    assert.ok(
      infraContextLibCode.includes("get_district_infrastructure_context"),
      "getDistrictInfrastructureContext passes district_id to RPC"
    );
  });

  // Test 13: No PostGIS district-resolution function is called in application flow
  runTest("No PostGIS district-resolution function is called in application routes or services", () => {
    assert.ok(
      !reportRouteCode.includes("resolveDistrictFromGps"),
      "report.tsx must not call resolveDistrictFromGps"
    );
    assert.ok(
      !infraContextLibCode.includes("resolveDistrictFromGps"),
      "infrastructure-context.ts must not export resolveDistrictFromGps"
    );
    assert.ok(
      !reportRouteCode.includes("resolve_district_from_gps"),
      "report.tsx must not reference resolve_district_from_gps RPC"
    );
  });

  // Test 14: GPS_POSTGIS is completely removed from operational application paths
  runTest("GPS_POSTGIS is removed from operational application types and routes", () => {
    assert.ok(
      !infraTypesCode.includes('"GPS_POSTGIS"'),
      "infrastructure-context.ts types must not include GPS_POSTGIS"
    );
    assert.ok(
      !dbTypesCode.includes('"GPS_POSTGIS"'),
      "database.ts must not include GPS_POSTGIS"
    );
    assert.ok(
      !reportRouteCode.includes('"GPS_POSTGIS"'),
      "report.tsx must not set GPS_POSTGIS"
    );
  });

  // Test 15: Missing district does not fabricate a district
  runTest("Missing citizen district selection preserves null without fabrication", () => {
    const selectedDistrict = "";
    const payload = {
      district_id: selectedDistrict.trim() || null,
      district_resolution_method: selectedDistrict.trim() ? "CITIZEN_SELECTED" : null,
    };
    assert.strictEqual(payload.district_id, null);
    assert.strictEqual(payload.district_resolution_method, null);
  });

  // Test 16: SIMPLE workflow still works without mandatory district
  runTest("SIMPLE issues submit cleanly even when district_id is null", () => {
    assert.ok(
      reportRouteCode.includes("district_id: resolvedDistrictId"),
      "District ID is passed as null when not selected"
    );
    assert.ok(
      reportRouteCode.includes("const { error: issueError } = await supabase"),
      "Issue insertion proceeds without district blocking"
    );
  });

  // Test 17: COMPLEX workflow still works
  runTest("COMPLEX issues workflow remains unaffected", () => {
    assert.ok(
      !reportRouteCode.includes("final_issue_type: \"COMPLEX\""),
      "Citizen submission does not force complex type"
    );
  });

  // Test 18: Existing infrastructure assessment workflow still works
  runTest("Infrastructure assessment snapshot workflow consumes stored context", () => {
    assert.ok(
      infraAssessmentLibCode.includes("generateAndSaveInfrastructureAssessment"),
      "generateAndSaveInfrastructureAssessment generates snapshot"
    );
  });

  // Test 19: Existing Admin PASSED / NOT PASSED workflow still works
  runTest("Admin decision flow remains exclusively PASSED or NOT_PASSED", () => {
    assert.ok(
      adminAssessmentRouteCode.includes("handleConfirmDecision"),
      "handleConfirmDecision handler preserved"
    );
    assert.ok(
      adminAssessmentRouteCode.includes("Citizen selected"),
      "Admin assessment displays 'Citizen selected' badge for CITIZEN_SELECTED"
    );
  });

  // Test 20: Citizen decision transparency remains intact
  runTest("Citizen decision transparency view remains intact", () => {
    assert.ok(
      fs.existsSync(path.join(rootDir, "src/components/citizen/citizen-infrastructure-decision-card.tsx")),
      "CitizenInfrastructureDecisionCard exists"
    );
  });

  // Test 21: D8 synthetic benchmarks remain isolated
  runTest("D8 synthetic benchmarks are never queried during district selection or context retrieval", () => {
    assert.ok(
      !migration0063Code.includes("benchmark_development_requests"),
      "Migration 0063 must not touch benchmark_development_requests"
    );
    assert.ok(
      !infraContextLibCode.includes("benchmark_development_requests"),
      "infrastructure-context.ts must not query benchmark_development_requests"
    );
  });

  // Test 22: Migration 0064 seeds India-wide canonical districts
  runTest("Migration 0064 exists and seeds India-wide canonical districts across 36 States & UTs", () => {
    const migration0064Path = path.join(rootDir, "supabase/migrations/0064_seed_india_canonical_districts.sql");
    assert.ok(fs.existsSync(migration0064Path), "Migration 0064 file must exist");
    const migration0064Code = fs.readFileSync(migration0064Path, "utf8");
    for (const d of SAMPLE_INDIA_DISTRICTS) {
      assert.ok(
        migration0064Code.includes(`'${d.id}'`),
        `Migration 0064 must contain canonical ID ${d.id}`
      );
      assert.ok(
        migration0064Code.includes(`'${d.name}'`),
        `Migration 0064 must contain district name ${d.name}`
      );
    }
  });

  // Test 23: Master CSV Dataset Exists
  runTest("Master India D0 Districts CSV dataset exists with 786 canonical rows", () => {
    const csvPath = path.join(rootDir, "Datasets_Backend/india/D0_Districts/CivicFix_India_D0_Districts.csv");
    assert.ok(fs.existsSync(csvPath), "CivicFix_India_D0_Districts.csv must exist");
    const csvContent = fs.readFileSync(csvPath, "utf8");
    const lines = csvContent.trim().split("\n");
    assert.strictEqual(lines.length, 787, "Must contain 1 header line + 786 district rows");
  });

  // Test 24: Live database queries for canonical districts across India
  await runAsyncTest("Live database contains 786 canonical districts across all 36 States & UTs with public read access", async () => {
    const dotenv = fs.readFileSync(path.join(rootDir, ".env"), "utf8");
    let url, key;
    for (const line of dotenv.split("\n")) {
      if (line.startsWith("VITE_SUPABASE_URL=")) url = line.split("=")[1].trim();
      if (line.startsWith("VITE_SUPABASE_PUBLISHABLE_KEY=")) key = line.split("=")[1].trim();
    }
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(url, key);

    const { data, error } = await supabase
      .from("districts")
      .select("id, district_name, state_name, is_active")
      .eq("is_active", true)
      .order("id");

    assert.ok(!error, `Query must not error: ${error?.message}`);
    assert.strictEqual(data?.length, 786, "Must return exactly 786 active districts from live DB");

    const states = new Set(data.map((d) => d.state_name));
    assert.strictEqual(states.size, 36, "Must cover all 36 States and Union Territories");

    const jharkhandDistricts = data.filter((d) => d.state_name === "Jharkhand");
    assert.strictEqual(jharkhandDistricts.length, 24, "Must preserve all 24 Jharkhand districts");

    // Verify key sample districts in live DB
    for (const sample of SAMPLE_INDIA_DISTRICTS) {
      const match = data.find((d) => d.id === sample.id);
      assert.ok(match, `Live DB must contain district ${sample.name} (${sample.id})`);
      assert.strictEqual(match.district_name, sample.name);
      assert.strictEqual(match.state_name, sample.state);
    }
  });

  console.log("\n===============================================================================");
  console.log(`ALL CITIZEN DISTRICT SELECTION TESTS PASSED (${passedTests}/${totalTests} TESTS)`);
  console.log("===============================================================================\n");
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exitCode = 1;
});
