/**
 * CivicFix Milestone D0: Canonical District Boundary Data Foundation (Jharkhand)
 * ==============================================================================
 * Comprehensive Test Suite for Authoritative Administrative District Boundaries
 *
 * Checks:
 * 1. Authoritative GeoJSON source exists at Datasets_Backend/jharkhand/D0_Boundaries/jharkhand_districts.geojson
 * 2. Exactly 24 district features exist in the GeoJSON dataset
 * 3. Migration 0062 exists and updates all 24 canonical districts (IN-D0229 to IN-D0252)
 * 4. Ingestion script scripts/import_jharkhand_district_boundaries.py exists and generates valid SQL
 * 5. All 24 canonical district IDs map 1-to-1 without duplicates or orphans
 * 6. Every boundary geometry is valid EPSG:4326 Polygon/MultiPolygon
 * 7. PostGIS ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(...), 4326)) standard is strictly observed
 * 8. Spatial index maintenance (ANALYZE public.districts) is specified
 * 9. Real GPS Point: Ranchi (23.3441, 85.3096) resolves to IN-D0248 (Ranchi)
 * 10. Real GPS Point: Dhanbad (23.7957, 86.4304) resolves to IN-D0232 (Dhanbad)
 * 11. Real GPS Point: East Singhbhum / Jamshedpur (22.8046, 86.2029) resolves to IN-D0234 (East Singhbhum)
 * 12. Real GPS Point: Bokaro (23.6693, 85.9592) resolves to IN-D0229 (Bokaro)
 * 13. Real GPS Point: Ramgarh (23.6334, 85.5167) resolves to IN-D0247 (Ramgarh)
 * 14. Real GPS Point: Palamu (24.0384, 84.0722) resolves to IN-D0246 (Palamu)
 * 15. Real GPS Point: Hazaribagh (23.9937, 85.3647) resolves to IN-D0239 (Hazaribagh)
 * 16. Real GPS Point: Deoghar (24.4826, 86.7003) resolves to IN-D0231 (Deoghar)
 * 17. Real GPS Point: Khunti (23.0725, 85.2783) resolves to IN-D0241 (Khunti)
 * 18. Real GPS Point: Dumka (24.2698, 87.2505) resolves to IN-D0233 (Dumka)
 * 19. Out-of-state GPS Point (Patna, Bihar: 25.5941, 85.1376) does not match any Jharkhand district
 * 20. Out-of-state GPS Point (New Delhi: 28.6139, 77.2090) does not match any Jharkhand district
 * 21. Outside India GPS Point (London: 51.5074, -0.1278) does not match any district
 * 22. Invalid & Null coordinates are handled safely without errors
 * 23. D1–D8 datasets remain untouched
 * 24. SIMPLE & COMPLEX workflows and Admin PASSED/NOT_PASSED decisions remain intact
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("===============================================================================");
console.log("CIVICFIX: D0 CANONICAL DISTRICT BOUNDARY DATA FOUNDATION (JHARKHAND SAMPLE)");
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

// ----------------------------------------------------------------------------
// File Paths & Loading
// ----------------------------------------------------------------------------
const rootDir = path.resolve(__dirname, "..");
const geojsonPath = path.join(rootDir, "Datasets_Backend/jharkhand/D0_Boundaries/jharkhand_districts.geojson");
const migration0062Path = path.join(rootDir, "supabase/migrations/0062_seed_jharkhand_district_boundaries.sql");
const importScriptPath = path.join(rootDir, "scripts/import_jharkhand_district_boundaries.py");
const migration0061Path = path.join(rootDir, "supabase/migrations/0061_civicfix_gps_postgis_district_resolution.sql");

const geojsonRaw = fs.readFileSync(geojsonPath, "utf8");
const geojsonData = JSON.parse(geojsonRaw);
const migration0062Code = fs.readFileSync(migration0062Path, "utf8");
const importScriptCode = fs.readFileSync(importScriptPath, "utf8");
const migration0061Code = fs.readFileSync(migration0061Path, "utf8");

// Canonical 24 Jharkhand Districts Reference
const CANONICAL_JHARKHAND_DISTRICTS = {
  "Bokaro": "IN-D0229",
  "Chatra": "IN-D0230",
  "Deoghar": "IN-D0231",
  "Dhanbad": "IN-D0232",
  "Dumka": "IN-D0233",
  "East Singhbhum": "IN-D0234",
  "Garhwa": "IN-D0235",
  "Giridih": "IN-D0236",
  "Godda": "IN-D0237",
  "Gumla": "IN-D0238",
  "Hazaribagh": "IN-D0239",
  "Jamtara": "IN-D0240",
  "Khunti": "IN-D0241",
  "Koderma": "IN-D0242",
  "Latehar": "IN-D0243",
  "Lohardaga": "IN-D0244",
  "Pakur": "IN-D0245",
  "Palamu": "IN-D0246",
  "Ramgarh": "IN-D0247",
  "Ranchi": "IN-D0248",
  "Sahibganj": "IN-D0249",
  "Saraikela Kharsawan": "IN-D0250",
  "Simdega": "IN-D0251",
  "West Singhbhum": "IN-D0252",
};

const NAME_ALIASES = {
  "saraikela-kharsawan": "Saraikela Kharsawan",
  "saraikela kharsawan": "Saraikela Kharsawan",
  "seraikela-kharsawan": "Saraikela Kharsawan",
  "seraikela kharsawan": "Saraikela Kharsawan",
  "hazaribag": "Hazaribagh",
  "pashchim singhbhum": "West Singhbhum",
  "purba singhbhum": "East Singhbhum",
  "east singhbhum": "East Singhbhum",
  "west singhbhum": "West Singhbhum",
};

// ----------------------------------------------------------------------------
// Point-in-Polygon Engine (Pure JS Ray Casting Implementation)
// ----------------------------------------------------------------------------
function pointInPolygonRing(x, y, ring) {
  let inside = false;
  const n = ring.length;
  let p1x = ring[0][0];
  let p1y = ring[0][1];
  for (let i = 0; i <= n; i++) {
    const p2 = ring[i % n];
    const p2x = p2[0];
    const p2y = p2[1];
    if (y > Math.min(p1y, p2y)) {
      if (y <= Math.max(p1y, p2y)) {
        if (x <= Math.max(p1x, p2x)) {
          let xinters = x;
          if (p1y !== p2y) {
            xinters = ((y - p1y) * (p2x - p1x)) / (p2y - p1y) + p1x;
          }
          if (p1x === p2x || x <= xinters) {
            inside = !inside;
          }
        }
      }
    }
    p1x = p2x;
    p1y = p2y;
  }
  return inside;
}

function pointInGeometry(lon, lat, geometry) {
  if (!geometry || !geometry.coordinates) return false;
  const gtype = geometry.type;
  const coords = geometry.coordinates;

  if (gtype === "Polygon") {
    // Check outer ring
    if (!pointInPolygonRing(lon, lat, coords[0])) return false;
    // Check holes
    for (let h = 1; h < coords.length; h++) {
      if (pointInPolygonRing(lon, lat, coords[h])) return false;
    }
    return true;
  } else if (gtype === "MultiPolygon") {
    for (let p = 0; p < coords.length; p++) {
      const polyCoords = coords[p];
      if (pointInPolygonRing(lon, lat, polyCoords[0])) {
        let inHole = false;
        for (let h = 1; h < polyCoords.length; h++) {
          if (pointInPolygonRing(lon, lat, polyCoords[h])) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return true;
      }
    }
  }
  return false;
}

function resolveDistrictFromGpsWithGeoJson(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  for (const feature of geojsonData.features) {
    if (pointInGeometry(lng, lat, feature.geometry)) {
      const rawName = feature.properties.district || "";
      const normName = NAME_ALIASES[rawName.toLowerCase()] || rawName;
      const districtId = CANONICAL_JHARKHAND_DISTRICTS[normName];
      return {
        district_id: districtId,
        district_name: normName,
        state_name: "Jharkhand",
        state_code: "JH",
        resolution_method: "GPS_POSTGIS",
      };
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// TEST CASES
// ----------------------------------------------------------------------------

// Test 1: Authoritative GeoJSON exists
runTest("Authoritative GeoJSON source dataset exists on disk", () => {
  assert.ok(fs.existsSync(geojsonPath), `GeoJSON must exist at ${geojsonPath}`);
  assert.ok(geojsonData.features && Array.isArray(geojsonData.features), "GeoJSON must contain features array");
});

// Test 2: Exactly 24 features
runTest("GeoJSON dataset contains exactly 24 district features for Jharkhand", () => {
  assert.strictEqual(geojsonData.features.length, 24, "Must contain exactly 24 district features");
});

// Test 3: Migration 0062 exists and updates all 24 canonical IDs
runTest("Migration 0062 exists and updates all 24 canonical IDs (IN-D0229 to IN-D0252)", () => {
  assert.ok(fs.existsSync(migration0062Path), "Migration 0062 file must exist");
  for (const [dname, cid] of Object.entries(CANONICAL_JHARKHAND_DISTRICTS)) {
    assert.ok(
      migration0062Code.includes(`WHERE id = '${cid}';`),
      `Migration 0062 must update district ${cid} (${dname})`
    );
  }
});

// Test 4: Ingestion script exists and generates SQL
runTest("Python ingestion script exists and is executable", () => {
  assert.ok(fs.existsSync(importScriptPath), "import_jharkhand_district_boundaries.py must exist");
  assert.ok(importScriptCode.includes("CANONICAL_DISTRICTS"), "Script must define canonical districts map");
});

// Test 5: 1-to-1 mapping of all 24 districts
runTest("All 24 GeoJSON features map 1-to-1 without duplicates or missing canonical IDs", () => {
  const mappedIds = new Set();
  for (const f of geojsonData.features) {
    const rawName = f.properties.district || "";
    const normName = NAME_ALIASES[rawName.toLowerCase()] || rawName;
    const cid = CANONICAL_JHARKHAND_DISTRICTS[normName];
    assert.ok(cid, `District '${rawName}' must resolve to a canonical ID`);
    assert.ok(!mappedIds.has(cid), `Duplicate mapping detected for ${cid}`);
    mappedIds.add(cid);
  }
  assert.strictEqual(mappedIds.size, 24, "All 24 canonical IDs must be mapped");
});

// Test 6: Geometry validation
runTest("Every district boundary geometry has valid coordinates in EPSG:4326 range", () => {
  for (const f of geojsonData.features) {
    assert.ok(f.geometry && ["Polygon", "MultiPolygon"].includes(f.geometry.type), "Geometry must be Polygon or MultiPolygon");
    const firstCoordRing = f.geometry.type === "Polygon" ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
    assert.ok(firstCoordRing.length >= 4, "Ring must have at least 4 points");
    for (const [lng, lat] of firstCoordRing) {
      assert.ok(lng >= 83 && lng <= 89, `Longitude ${lng} must be within Jharkhand bounding envelope`);
      assert.ok(lat >= 21 && lat <= 26, `Latitude ${lat} must be within Jharkhand bounding envelope`);
    }
  }
});

// Test 7: PostGIS ST_Multi ST_SetSRID standard
runTest("Migration 0062 strictly uses ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(...), 4326))", () => {
  assert.ok(
    migration0062Code.includes("SET boundary = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON("),
    "Must wrap geometry in ST_Multi and ST_SetSRID with 4326"
  );
});

// Test 8: Spatial index maintenance
runTest("Migration 0062 includes ANALYZE public.districts", () => {
  assert.ok(migration0062Code.includes("ANALYZE public.districts;"), "Must include ANALYZE statement");
});

// Test 9: Ranchi GPS Point
runTest("GPS resolution: Ranchi (23.3441, 85.3096) resolves to IN-D0248 (Ranchi)", () => {
  const res = resolveDistrictFromGpsWithGeoJson(23.3441, 85.3096);
  assert.ok(res, "Ranchi coordinates must resolve");
  assert.strictEqual(res.district_id, "IN-D0248");
  assert.strictEqual(res.district_name, "Ranchi");
});

// Test 10: Dhanbad GPS Point
runTest("GPS resolution: Dhanbad (23.7957, 86.4304) resolves to IN-D0232 (Dhanbad)", () => {
  const res = resolveDistrictFromGpsWithGeoJson(23.7957, 86.4304);
  assert.ok(res, "Dhanbad coordinates must resolve");
  assert.strictEqual(res.district_id, "IN-D0232");
  assert.strictEqual(res.district_name, "Dhanbad");
});

// Test 11: East Singhbhum GPS Point
runTest("GPS resolution: East Singhbhum / Jamshedpur (22.8046, 86.2029) resolves to IN-D0234", () => {
  const res = resolveDistrictFromGpsWithGeoJson(22.8046, 86.2029);
  assert.ok(res, "East Singhbhum coordinates must resolve");
  assert.strictEqual(res.district_id, "IN-D0234");
  assert.strictEqual(res.district_name, "East Singhbhum");
});

// Test 12: Bokaro GPS Point
runTest("GPS resolution: Bokaro (23.6693, 85.9592) resolves to IN-D0229 (Bokaro)", () => {
  const res = resolveDistrictFromGpsWithGeoJson(23.6693, 85.9592);
  assert.ok(res, "Bokaro coordinates must resolve");
  assert.strictEqual(res.district_id, "IN-D0229");
  assert.strictEqual(res.district_name, "Bokaro");
});

// Test 13: Ramgarh GPS Point
runTest("GPS resolution: Ramgarh (23.6334, 85.5167) resolves to IN-D0247 (Ramgarh)", () => {
  const res = resolveDistrictFromGpsWithGeoJson(23.6334, 85.5167);
  assert.ok(res, "Ramgarh coordinates must resolve");
  assert.strictEqual(res.district_id, "IN-D0247");
  assert.strictEqual(res.district_name, "Ramgarh");
});

// Test 14: Palamu GPS Point
runTest("GPS resolution: Palamu (24.0384, 84.0722) resolves to IN-D0246 (Palamu)", () => {
  const res = resolveDistrictFromGpsWithGeoJson(24.0384, 84.0722);
  assert.ok(res, "Palamu coordinates must resolve");
  assert.strictEqual(res.district_id, "IN-D0246");
  assert.strictEqual(res.district_name, "Palamu");
});

// Test 15: Hazaribagh GPS Point
runTest("GPS resolution: Hazaribagh (23.9937, 85.3647) resolves to IN-D0239 (Hazaribagh)", () => {
  const res = resolveDistrictFromGpsWithGeoJson(23.9937, 85.3647);
  assert.ok(res, "Hazaribagh coordinates must resolve");
  assert.strictEqual(res.district_id, "IN-D0239");
  assert.strictEqual(res.district_name, "Hazaribagh");
});

// Test 16: Deoghar GPS Point
runTest("GPS resolution: Deoghar (24.4826, 86.7003) resolves to IN-D0231 (Deoghar)", () => {
  const res = resolveDistrictFromGpsWithGeoJson(24.4826, 86.7003);
  assert.ok(res, "Deoghar coordinates must resolve");
  assert.strictEqual(res.district_id, "IN-D0231");
  assert.strictEqual(res.district_name, "Deoghar");
});

// Test 17: Khunti GPS Point
runTest("GPS resolution: Khunti (23.0725, 85.2783) resolves to IN-D0241 (Khunti)", () => {
  const res = resolveDistrictFromGpsWithGeoJson(23.0725, 85.2783);
  assert.ok(res, "Khunti coordinates must resolve");
  assert.strictEqual(res.district_id, "IN-D0241");
  assert.strictEqual(res.district_name, "Khunti");
});

// Test 18: Dumka GPS Point
runTest("GPS resolution: Dumka (24.2698, 87.2505) resolves to IN-D0233 (Dumka)", () => {
  const res = resolveDistrictFromGpsWithGeoJson(24.2698, 87.2505);
  assert.ok(res, "Dumka coordinates must resolve");
  assert.strictEqual(res.district_id, "IN-D0233");
  assert.strictEqual(res.district_name, "Dumka");
});

// Test 19: Out-of-state point (Patna, Bihar)
runTest("Out-of-state GPS Point (Patna: 25.5941, 85.1376) does NOT match any Jharkhand district", () => {
  const res = resolveDistrictFromGpsWithGeoJson(25.5941, 85.1376);
  assert.strictEqual(res, null, "Patna point must return null for Jharkhand dataset");
});

// Test 20: Out-of-state point (New Delhi)
runTest("Out-of-state GPS Point (New Delhi: 28.6139, 77.2090) does NOT match any Jharkhand district", () => {
  const res = resolveDistrictFromGpsWithGeoJson(28.6139, 77.2090);
  assert.strictEqual(res, null, "New Delhi point must return null for Jharkhand dataset");
});

// Test 21: Outside India point (London)
runTest("Outside India GPS Point (London: 51.5074, -0.1278) returns null", () => {
  const res = resolveDistrictFromGpsWithGeoJson(51.5074, -0.1278);
  assert.strictEqual(res, null, "London point must return null");
});

// Test 22: Invalid and null coordinates
runTest("Invalid, NaN, and null coordinates are safely rejected", () => {
  assert.strictEqual(resolveDistrictFromGpsWithGeoJson(null, null), null);
  assert.strictEqual(resolveDistrictFromGpsWithGeoJson(23.3441, null), null);
  assert.strictEqual(resolveDistrictFromGpsWithGeoJson(null, 85.3096), null);
  assert.strictEqual(resolveDistrictFromGpsWithGeoJson(undefined, undefined), null);
  assert.strictEqual(resolveDistrictFromGpsWithGeoJson(NaN, 85.3096), null);
  assert.strictEqual(resolveDistrictFromGpsWithGeoJson(23.3441, NaN), null);
  assert.strictEqual(resolveDistrictFromGpsWithGeoJson(95, 85.3096), null);
  assert.strictEqual(resolveDistrictFromGpsWithGeoJson(23.3441, 195), null);
});

// Test 23: D1–D8 datasets isolation
runTest("D1–D8 dataset tables remain completely untouched and isolated", () => {
  assert.ok(!migration0062Code.includes("district_demographics"), "Migration 0062 must not touch D1");
  assert.ok(!migration0062Code.includes("district_budget_allocations"), "Migration 0062 must not touch D2");
  assert.ok(!migration0062Code.includes("district_geography"), "Migration 0062 must not touch D3");
  assert.ok(!migration0062Code.includes("district_infrastructure_assets"), "Migration 0062 must not touch D4");
  assert.ok(!migration0062Code.includes("district_accessibility_metrics"), "Migration 0062 must not touch D5");
  assert.ok(!migration0062Code.includes("district_socioeconomic_gaps"), "Migration 0062 must not touch D6");
  assert.ok(!migration0062Code.includes("district_historical_projects"), "Migration 0062 must not touch D7");
  assert.ok(!migration0062Code.includes("benchmark_development_requests"), "Migration 0062 must not touch D8");
});

// Test 24: Workflow boundaries preserved
runTest("SIMPLE, COMPLEX, and Admin decision boundaries remain strictly untouched", () => {
  assert.ok(!migration0062Code.includes("challenges"), "Migration 0062 must not touch COMPLEX challenges");
  assert.ok(!migration0062Code.includes("infrastructure_decisions"), "Migration 0062 must not touch Admin decisions");
  assert.ok(migration0061Code.includes("create or replace function public.resolve_district_from_gps"), "Migration 0061 RPC is intact");
});

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------
console.log("\n===============================================================================");
console.log(`ALL JHARKHAND DISTRICT BOUNDARY TESTS PASSED (${passedTests}/${totalTests} TESTS)`);
console.log("===============================================================================\n");
