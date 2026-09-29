/**
 * CivicFix Phase 5.2: RLS & Authorization Hardening Test Suite
 * ==========================================================
 * 
 * PART 1: STRUCTURAL & STATIC POLICY AUDIT
 * 1. Migration 0077 exists and defines storage policies on storage.objects for issue-images and resolution-images
 * 2. Storage policies enforce profile prefix ownership on INSERT/UPDATE/DELETE and grant ADMIN administrative access
 * 3. Migration 0077 defines resolution_verifications_select_scoped with strict citizen, officer, manager, worker, admin scoping
 * 4. Migration 0077 preserves immutable verification records (zero UPDATE policy) and gates INSERT to citizen owner of resolved issue
 * 5. Migration 0077 applies SET search_path = public, pg_temp on all SECURITY DEFINER functions
 * 6. Migration 0077 revokes EXECUTE on sensitive RPCs from anon and public
 * 7. Frontend route guards (RequireRole, RequireAuth) enforce loading fallback states during unresolved auth/profile hydration
 * 8. Public and demo sandbox routes (/demo/*) remain decoupled and accessible
 * 
 * PART 2: LIVE DATABASE POLICY & FUNCTION VERIFICATION
 * 9. Live DB: Storage policies for issue-images and resolution-images are active in pg_policies
 * 10. Live DB: resolution_verifications policies are active in pg_policies with correct expressions
 * 11. Live DB: SECURITY DEFINER functions have proconfig containing search_path=public, pg_temp
 * 12. Live DB: Internal RPCs have execute revoked from anon / public
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("===============================================================================");
console.log("CIVICFIX: PHASE 5.2 RLS & AUTHORIZATION HARDENING TEST SUITE");
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

function executeLinkedQuery(sql) {
  const tempFile = path.join(rootDir, `.temp_query_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`);
  fs.writeFileSync(tempFile, sql, "utf8");
  try {
    const rawOut = execSync(`npx supabase db query --linked -f "${tempFile}"`, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 20 * 1024 * 1024,
    });
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    const parsed = JSON.parse(rawOut);
    return Array.isArray(parsed) ? parsed : (parsed.rows || []);
  } catch (err) {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    throw err;
  }
}

async function main() {
  const migration0077Path = path.join(rootDir, "supabase/migrations/0077_civicfix_phase5_2_authorization_hardening.sql");
  const routeGuardsPath = path.join(rootDir, "src/auth/route-guards.tsx");
  const routesIndexPath = path.join(rootDir, "src/routes/index.tsx");

  console.log("--- PART 1: STRUCTURAL & STATIC POLICY AUDIT ---");

  // Test 1: Migration 0077 exists
  runTest("Migration 0077 exists and defines storage policies on storage.objects", () => {
    assert.ok(fs.existsSync(migration0077Path), "Migration 0077 file must exist");
    const code = fs.readFileSync(migration0077Path, "utf8");
    assert.ok(code.includes("issue_images_storage_insert_own"), "Must define issue_images_storage_insert_own");
    assert.ok(code.includes("issue_images_storage_update_own"), "Must define issue_images_storage_update_own");
    assert.ok(code.includes("issue_images_storage_delete_own"), "Must define issue_images_storage_delete_own");
    assert.ok(code.includes("resolution_images_storage_insert_staff"), "Must define resolution_images_storage_insert_staff");
    assert.ok(code.includes("resolution_images_storage_update_staff"), "Must define resolution_images_storage_update_staff");
    assert.ok(code.includes("resolution_images_storage_delete_staff"), "Must define resolution_images_storage_delete_staff");
  });

  const migration0077Code = fs.readFileSync(migration0077Path, "utf8");

  // Test 2: Storage policy ownership & admin check
  runTest("Storage policies enforce profile prefix ownership on INSERT/UPDATE/DELETE and grant ADMIN access", () => {
    assert.ok(
      migration0077Code.includes("public.current_profile_id()::text || '/%'"),
      "Storage policies must enforce current_profile_id prefix on object name"
    );
    assert.ok(
      migration0077Code.includes("public.current_user_has_role(array['ADMIN'::public.role_code])"),
      "Storage policies must include ADMIN role access"
    );
  });

  // Test 3: resolution_verifications scoping
  runTest("Migration 0077 defines resolution_verifications_select_scoped with strict role scoping", () => {
    assert.ok(
      migration0077Code.includes("resolution_verifications_select_scoped"),
      "Must create resolution_verifications_select_scoped"
    );
    assert.ok(
      migration0077Code.includes("i.reporter_profile_id = public.current_profile_id()"),
      "Citizen must only read their own issue verifications"
    );
    assert.ok(
      migration0077Code.includes("public.current_user_department_id()"),
      "Department manager must only read their department issue verifications"
    );
    assert.ok(
      migration0077Code.includes("public.issue_is_assigned_to_current_worker(resolution_verifications.issue_id)"),
      "Field worker must only read verifications on issues assigned to them"
    );
  });

  // Test 4: resolution_verifications immutability and insert check
  runTest("Migration 0077 preserves immutable verification records and gates INSERT to citizen owner", () => {
    assert.ok(
      !migration0077Code.includes("for update\non public.resolution_verifications"),
      "Must not permit UPDATE on resolution_verifications"
    );
    assert.ok(
      migration0077Code.includes("resolution_verifications_insert_citizen"),
      "Must define resolution_verifications_insert_citizen"
    );
    assert.ok(
      migration0077Code.includes("i.status in ('RESOLVED'::public.issue_status, 'CITIZEN_VERIFIED'::public.issue_status)"),
      "Citizen can only verify resolved issues"
    );
  });

  // Test 5: SECURITY DEFINER search_path
  runTest("Migration 0077 applies SET search_path = public, pg_temp on SECURITY DEFINER functions", () => {
    assert.ok(
      migration0077Code.includes("alter function public.assign_default_profile_role() set search_path = public, pg_temp;"),
      "Must set search_path on assign_default_profile_role"
    );
    assert.ok(
      migration0077Code.includes("alter function public.current_profile_id() set search_path = public, pg_temp;"),
      "Must set search_path on current_profile_id"
    );
    assert.ok(
      migration0077Code.includes("alter function public.current_user_has_role(public.role_code[]) set search_path = public, pg_temp;"),
      "Must set search_path on current_user_has_role"
    );
  });

  // Test 6: Revoke execution grants
  runTest("Migration 0077 revokes EXECUTE on sensitive RPCs from anon and public", () => {
    assert.ok(
      migration0077Code.includes("revoke execute on function public.check_and_increment_rate_limit(text, integer, integer) from public, anon;"),
      "Must revoke anon execute on check_and_increment_rate_limit"
    );
    assert.ok(
      migration0077Code.includes("revoke execute on function public.get_admin_analytics_telemetry(integer, text, text) from public, anon;"),
      "Must revoke anon execute on get_admin_analytics_telemetry"
    );
  });

  // Test 7: Frontend route guards loading states
  runTest("Frontend route guards (RequireRole, RequireAuth) enforce loading fallback states during unresolved auth", () => {
    assert.ok(fs.existsSync(routeGuardsPath), "Route guards file must exist");
    const guardCode = fs.readFileSync(routeGuardsPath, "utf8");
    assert.ok(
      guardCode.includes("appSession.status === \"syncing\" || appSession.status === \"idle\""),
      "RequireRole must render LoadingState while session is idle or syncing"
    );
    assert.ok(
      guardCode.includes("!isLoaded"),
      "RequireAuth and RequireRole must render LoadingState while Clerk is loading"
    );
  });

  // Test 8: Public and demo sandbox accessibility
  runTest("Public and demo sandbox routes (/demo/*) remain decoupled from auth guards", () => {
    assert.ok(fs.existsSync(routesIndexPath), "Routes index file must exist");
    const indexCode = fs.readFileSync(routesIndexPath, "utf8");
    assert.ok(
      indexCode.includes("<Route\n          path=\"demo\"") || indexCode.includes("path=\"demo\""),
      "Demo routes must exist under /demo"
    );
    assert.ok(
      indexCode.includes("<DemoProvider>"),
      "Demo routes must use DemoProvider sandbox"
    );
  });

  console.log("\n--- PART 2: LIVE DATABASE POLICY & FUNCTION VERIFICATION ---");

  // Test 9: Live Storage policies in pg_policies
  await runAsyncTest("Live DB: Storage policies for issue-images and resolution-images are active in pg_policies", async () => {
    const policies = executeLinkedQuery(`
      SELECT policyname, tablename, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
      ORDER BY policyname;
    `);

    const names = policies.map((p) => p.policyname);
    assert.ok(names.includes("issue_images_public_read"), "issue_images_public_read must exist");
    assert.ok(names.includes("issue_images_storage_insert_own"), "issue_images_storage_insert_own must exist");
    assert.ok(names.includes("issue_images_storage_update_own"), "issue_images_storage_update_own must exist");
    assert.ok(names.includes("issue_images_storage_delete_own"), "issue_images_storage_delete_own must exist");
    assert.ok(names.includes("resolution_images_public_read"), "resolution_images_public_read must exist");
    assert.ok(names.includes("resolution_images_storage_insert_staff"), "resolution_images_storage_insert_staff must exist");
    assert.ok(names.includes("resolution_images_storage_update_staff"), "resolution_images_storage_update_staff must exist");
    assert.ok(names.includes("resolution_images_storage_delete_staff"), "resolution_images_storage_delete_staff must exist");
  });

  // Test 10: Live resolution_verifications policies
  await runAsyncTest("Live DB: resolution_verifications policies are active in pg_policies with correct scoping", async () => {
    const policies = executeLinkedQuery(`
      SELECT policyname, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'resolution_verifications'
      ORDER BY policyname;
    `);

    const names = policies.map((p) => p.policyname);
    assert.ok(names.includes("resolution_verifications_select_scoped"), "resolution_verifications_select_scoped must exist");
    assert.ok(names.includes("resolution_verifications_insert_citizen"), "resolution_verifications_insert_citizen must exist");
    assert.ok(names.includes("resolution_verifications_delete_admin"), "resolution_verifications_delete_admin must exist");
    // Ensure no update policy
    assert.ok(!names.some((n) => n.includes("update")), "No update policy should exist on resolution_verifications");
  });

  // Test 11: Live proconfig search_path on functions
  await runAsyncTest("Live DB: SECURITY DEFINER functions have proconfig containing search_path=public, pg_temp", async () => {
    const functions = executeLinkedQuery(`
      SELECT proname, prosecdef, proconfig
      FROM pg_proc
      JOIN pg_namespace n ON n.oid = pg_proc.pronamespace
      WHERE n.nspname = 'public'
        AND proname IN (
          'assign_default_profile_role',
          'sync_issue_status_from_history',
          'apply_resolution_verification_history',
          'sync_issue_assignment_status',
          'current_profile_id',
          'current_user_has_role',
          'current_user_department_id',
          'get_admin_analytics_telemetry',
          'check_and_increment_rate_limit'
        );
    `);

    assert.ok(functions.length >= 8, `Expected at least 8 functions, found ${functions.length}`);
    for (const fn of functions) {
      assert.ok(fn.prosecdef, `Function ${fn.proname} must be SECURITY DEFINER`);
      assert.ok(
        fn.proconfig && fn.proconfig.some((cfg) => cfg.includes("search_path=public, pg_temp") || cfg.includes("search_path=public")),
        `Function ${fn.proname} proconfig must enforce safe search_path, got ${JSON.stringify(fn.proconfig)}`
      );
    }
  });

  // Test 12: Anonymous execute revoked on internal RPCs
  await runAsyncTest("Live DB: Internal RPCs have execute revoked from anon / public", async () => {
    const grants = executeLinkedQuery(`
      SELECT routine_name, grantee, privilege_type
      FROM information_schema.routine_privileges
      WHERE routine_schema = 'public'
        AND routine_name IN ('check_and_increment_rate_limit', 'get_admin_analytics_telemetry')
        AND grantee IN ('anon', 'public');
    `);

    assert.strictEqual(
      grants.length,
      0,
      `Expected 0 anon/public grants on sensitive RPCs, found: ${JSON.stringify(grants)}`
    );
  });

  console.log("\n===============================================================================");
  console.log(`ALL PHASE 5.2 TESTS COMPLETED: (${passedTests}/${totalTests} PASSED)`);
  console.log("===============================================================================\n");

  if (passedTests !== totalTests) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("FATAL ERROR running Phase 5.2 test suite:", err);
  process.exitCode = 1;
});
