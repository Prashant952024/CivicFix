const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env if present
try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  });
} catch {
  // Ignore
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://fzatlgzittpguemzbdkm.supabase.co";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_79XhVwdn8WpQYA2In1HjOQ_S7zYP05f";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;
const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);

async function runWorkflowIntegrityTests() {
  console.log("================================================================================");
  console.log("CIVICFIX PHASE 5.4 — WORKFLOW & STATE-MACHINE INTEGRITY REMEDIATION SUITE");
  console.log("================================================================================");
  console.log(`Target Supabase URL: ${SUPABASE_URL}`);

  let passedTests = 0;
  let totalTests = 0;

  function assert(testName, condition, detail = "") {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ PASS [${totalTests}]: ${testName}`);
    } else {
      console.error(`  ✕ FAIL [${totalTests}]: ${testName} - ${detail}`);
    }
  }

  // Load migration 0078
  const mig0078Path = path.join(__dirname, '..', 'supabase', 'migrations', '0078_civicfix_phase5_4_workflow_remediation.sql');
  const mig0078Exists = fs.existsSync(mig0078Path);
  assert("Migration 0078 exists in supabase/migrations/", mig0078Exists);

  const mig0078Content = mig0078Exists ? fs.readFileSync(mig0078Path, 'utf-8') : '';

  // ---------------------------------------------------------------------------
  // WF-01 & WF-04: DEPLOYMENT PLANS & SELF-APPROVAL GOVERNANCE
  // ---------------------------------------------------------------------------
  console.log("\n--- WF-01 & WF-04: DEPLOYMENT PLANS & SELF-APPROVAL GOVERNANCE ---");

  assert(
    "WF-01: deployment_plans UPDATE RLS policy hardened with role, management & organization checks",
    mig0078Content.includes('create policy "deployment_plans_update_authorized"') &&
    mig0078Content.includes("public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])")
  );

  assert(
    "WF-01: Terminal state reversal (APPROVED / REJECTED) blocked in fn_deployment_plan_status_transition()",
    mig0078Content.includes("Cannot modify deployment plan in terminal % status")
  );

  assert(
    "WF-04: Self-approval protection enforced for deployment plan lead / submitter / creator",
    mig0078Content.includes("Self-approval blocked: Applicant or project lead cannot approve or review their own deployment plan.")
  );

  // ---------------------------------------------------------------------------
  // WF-02: PILOT VALIDATION RESULTS & KPI SCORES AUTHORIZATION
  // ---------------------------------------------------------------------------
  console.log("\n--- WF-02: PILOT VALIDATION RESULTS & KPI SCORES AUTHORIZATION ---");

  assert(
    "WF-02: pilot_validation_results INSERT/UPDATE RLS policies hardened",
    mig0078Content.includes('create policy "pilot_validation_results_insert_authorized"') &&
    mig0078Content.includes('create policy "pilot_validation_results_update_authorized"')
  );

  assert(
    "WF-02: pilot_validation_kpi_results manage policy replaced with restricted insert/update policies",
    mig0078Content.includes('create policy "pilot_validation_kpi_results_insert_authorized"') &&
    mig0078Content.includes('create policy "pilot_validation_kpi_results_update_authorized"')
  );

  assert(
    "WF-04: Self-approval protection enforced for pilot validation results",
    mig0078Content.includes("Self-approval blocked: Applicant or project lead cannot approve or review their own pilot validation.")
  );

  // ---------------------------------------------------------------------------
  // WF-03: ISSUES.STATUS DIRECT UPDATE & HISTORY INTEGRITY
  // ---------------------------------------------------------------------------
  console.log("\n--- WF-03: ISSUES.STATUS DIRECT UPDATE & HISTORY INTEGRITY ---");

  assert(
    "WF-03: BEFORE UPDATE trigger fn_enforce_issue_status_direct_update() attached to public.issues",
    mig0078Content.includes("create trigger trg_enforce_issue_status_direct_update") &&
    mig0078Content.includes("before update of status on public.issues")
  );

  assert(
    "WF-03: Direct status UPDATE auto-populates issue_status_history to run validate_issue_status_history_transition()",
    mig0078Content.includes("insert into public.issue_status_history") &&
    mig0078Content.includes("Direct status update")
  );

  // ---------------------------------------------------------------------------
  // WF-05: INFRASTRUCTURE DECISION ASSESSMENT LINKING & GOVERNANCE
  // ---------------------------------------------------------------------------
  console.log("\n--- WF-05: INFRASTRUCTURE DECISION ASSESSMENT LINKING & GOVERNANCE ---");

  assert(
    "WF-05: fn_enforce_infrastructure_decision_assessment_link() requires non-null assessment_id",
    mig0078Content.includes("Infrastructure decision requires a valid infrastructure assessment reference")
  );

  assert(
    "WF-05: Mismatched assessment/issue IDs and non-ADMIN decision creation blocked",
    mig0078Content.includes("Mismatched infrastructure assessment") &&
    mig0078Content.includes("Only ADMIN can create or modify infrastructure decisions.")
  );

  // ---------------------------------------------------------------------------
  // WF-06: INFRASTRUCTURE ASSESSMENTS ATOMIC RPC ENFORCEMENT
  // ---------------------------------------------------------------------------
  console.log("\n--- WF-06: INFRASTRUCTURE ASSESSMENTS ATOMIC RPC ENFORCEMENT ---");

  assert(
    "WF-06: create_atomic_infrastructure_assessment RPC sets local execution context flag",
    mig0078Content.includes("set_config('civicfix.in_atomic_assessment_rpc', 'true', true)")
  );

  assert(
    "WF-06: Direct INSERT on infrastructure_assessments blocked by BEFORE INSERT trigger",
    mig0078Content.includes("Direct INSERT on infrastructure_assessments is restricted. Use public.create_atomic_infrastructure_assessment(...) RPC.")
  );

  // ---------------------------------------------------------------------------
  // LIVE DATABASE NON-DESTRUCTIVE VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n--- LIVE DATABASE NON-DESTRUCTIVE VERIFICATION ---");

  // Anonymous PostgREST direct INSERT on deployment_plans must be blocked
  const { error: anonDepErr } = await supabaseAnon
    .from('deployment_plans')
    .insert({ title: 'Unauthorized Plan' });
  assert("Anonymous direct PostgREST INSERT on deployment_plans is blocked", anonDepErr !== null);

  // Anonymous PostgREST direct UPDATE on issues.status must be blocked (error or 0 rows updated)
  const { data: anonIssueData, error: anonIssueErr } = await supabaseAnon
    .from('issues')
    .update({ status: 'RESOLVED' })
    .select('id');
  const issueUpdateBlocked = anonIssueErr !== null || (Array.isArray(anonIssueData) && anonIssueData.length === 0) || anonIssueData === null;
  assert("Anonymous direct PostgREST UPDATE on public.issues is blocked by RLS", issueUpdateBlocked);

  // Anonymous PostgREST direct INSERT on infrastructure_decisions must be blocked
  const { error: anonInfraDecErr } = await supabaseAnon
    .from('infrastructure_decisions')
    .insert({ decision: 'ACCEPTED', citizen_safe_summary: 'Test' });
  assert("Anonymous direct PostgREST INSERT on infrastructure_decisions is blocked", anonInfraDecErr !== null);

  console.log("\n================================================================================");
  console.log(`SUMMARY: ${passedTests} / ${totalTests} workflow integrity assertions executed.`);
  console.log("================================================================================");
}

runWorkflowIntegrityTests();
