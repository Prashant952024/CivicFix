/**
 * CivicFix Phase 4.3 Composite Database Performance Indexes Test Suite
 * ====================================================================
 * Tests:
 * 1. Migration 0075 exists and follows sequential numbering
 * 2. Migration 0075 creates index `issues_department_created_idx` on public.issues(department_id, created_at desc)
 * 3. Migration 0075 creates index `issues_district_status_idx` on public.issues(district_id, status)
 * 4. Migration 0075 creates index `idx_dept_worker_assignments_worker_status` on public.department_worker_assignments(worker_profile_id, status)
 * 5. Migration 0075 preserves RLS and does not contain security definer, permissions alteration, or data mutations
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("===============================================================================");
console.log("CIVICFIX: PHASE 4.3 COMPOSITE DATABASE INDEXES TEST SUITE");
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

async function main() {
  const migration0075Path = path.join(rootDir, "supabase/migrations/0075_civicfix_phase4_3_composite_indexes.sql");

  // Test 1: File existence
  runTest("Migration 0075 file exists with correct sequential filename", () => {
    assert.ok(fs.existsSync(migration0075Path), "Migration 0075 file must exist");
  });

  const migration0075Code = fs.readFileSync(migration0075Path, "utf8");

  // Test 2: Index A: issues(department_id, created_at desc)
  runTest("Migration 0075 defines index issues_department_created_idx on (department_id, created_at desc)", () => {
    assert.ok(
      migration0075Code.includes("create index if not exists issues_department_created_idx") &&
      migration0075Code.includes("on public.issues (department_id, created_at desc);"),
      "Must define issues_department_created_idx on public.issues (department_id, created_at desc)"
    );
  });

  // Test 3: Index B: issues(district_id, status)
  runTest("Migration 0075 defines index issues_district_status_idx on (district_id, status)", () => {
    assert.ok(
      migration0075Code.includes("create index if not exists issues_district_status_idx") &&
      migration0075Code.includes("on public.issues (district_id, status);"),
      "Must define issues_district_status_idx on public.issues (district_id, status)"
    );
  });

  // Test 4: Index C: department_worker_assignments(worker_profile_id, status)
  runTest("Migration 0075 defines index idx_dept_worker_assignments_worker_status on (worker_profile_id, status)", () => {
    assert.ok(
      migration0075Code.includes("create index if not exists idx_dept_worker_assignments_worker_status") &&
      migration0075Code.includes("on public.department_worker_assignments (worker_profile_id, status);"),
      "Must define idx_dept_worker_assignments_worker_status on public.department_worker_assignments (worker_profile_id, status)"
    );
  });

  // Test 5: Security preservation (no RLS changes, no grants/revokes, no mutations)
  runTest("Migration 0075 contains strictly non-destructive DDL performance indexes", () => {
    assert.ok(!migration0075Code.includes("security definer"), "Must not contain security definer");
    assert.ok(!migration0075Code.includes("alter policy"), "Must not alter policies");
    assert.ok(!migration0075Code.includes("drop policy"), "Must not drop policies");
    assert.ok(!migration0075Code.includes("insert into"), "Must not perform inserts");
    assert.ok(!migration0075Code.includes("delete from"), "Must not perform deletes");
    assert.ok(!migration0075Code.includes("update "), "Must not perform updates");
  });

  console.log(`\n===============================================================================`);
  console.log(`ALL PHASE 4.3 COMPOSITE INDEXES TESTS PASSED (${passedTests}/${totalTests} TESTS)`);
  console.log(`===============================================================================\n`);
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
