# CivicFix Role × Permission Matrix

This document provides a comprehensive audit of every major action in CivicFix, cross-referencing both **Frontend Route/UI Access** and **PostgreSQL Database Row-Level Security (RLS) & Trigger Enforcement**.

---

## Permission Matrix Legend
- **`✓`**: Fully Allowed (Frontend UI visible + Database RLS / Triggers permit mutation)
- **`RO`**: Read-Only Oversight (Frontend UI allows viewing; Database permits `SELECT` but denies `INSERT`/`UPDATE`/`DELETE`)
- **`✗`**: Strictly Denied (Hidden in Frontend UI and blocked by Database RLS / Triggers)
- **`~`**: Conditional / Scoped Access (Permitted only for own records, assigned department, or affiliated institution)

---

## Complete Role × Action Matrix

| Action / Operational Domain | Citizen | Municipal Officer | Department Manager | Field Worker | Admin | Innovation Manager | Institution (University) | Industry Partner | Database Enforcement Mechanism |
|---|---|---|---|---|---|---|---|---|---|
| **Submit New Issue (Text/Photo/Voice)** | **✓** | ✗ | ✗ | ✗ | **✓** | ✗ | ✗ | ✗ | RLS on `public.issues` (`reporter_profile_id = current_profile_id()`) |
| **View Public / Own Issues** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | RLS policy `issues_select_authorized` |
| **Inspect AI Triage Diagnostics** | ✗ | **✓** | **✓** | ✗ | **✓** | **✓** | ✗ | ✗ | RLS policy `issue_ai_analysis_select_authorized` |
| **Confirm / Override Classification (`final_issue_type`)** | ✗ | ✗ | ✗ | ✗ | **✓** | ✗ | ✗ | ✗ | Database trigger `enforce_issue_classification_authority()` on `public.issues` |
| **Assign Issue to Municipal Department** | ✗ | **✓** | ✗ | ✗ | **✓** | ✗ | ✗ | ✗ | RLS on `public.issue_department_assignments` |
| **Assign Field Worker to Issue** | ✗ | ✗ | **~** (Own Dept) | ✗ | **✓** | ✗ | ✗ | ✗ | RLS policy `dept_worker_assignments_insert_manager` |
| **Accept Task & Begin Work (`IN_PROGRESS`)** | ✗ | ✗ | ✗ | **~** (Assigned) | ✗ | ✗ | ✗ | ✗ | Trigger `enforce_worker_task_workflow()` |
| **Upload Resolution Photo Evidence** | ✗ | ✗ | ✗ | **~** (Assigned) | ✗ | ✗ | ✗ | ✗ | Storage RLS policy on `resolution-images` bucket |
| **Approve Completed Work (Manager Review)** | ✗ | ✗ | **~** (Own Dept) | ✗ | **✓** | ✗ | ✗ | ✗ | RLS on `public.issue_status_history` & `issues` |
| **Request Worker Rework (with Feedback)** | ✗ | ✗ | **~** (Own Dept) | ✗ | **✓** | ✗ | ✗ | ✗ | Trigger `enforce_manager_rework_transition()` |
| **Municipal Officer Final Sign-Off** | ✗ | **✓** | ✗ | ✗ | **✓** | ✗ | ✗ | ✗ | Trigger `enforce_issue_status_transition()` |
| **Citizen Ground Verification (`VERIFIED`)** | **~** (Reporter) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | RLS on `public.citizen_verifications` |
| **Reopen Issue (`UNRESOLVED`)** | **~** (Reporter) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | Trigger `sync_citizen_verification_status()` |
| **Formulate Innovation Challenge (with AI)** | ✗ | ✗ | ✗ | ✗ | **RO** | **✓** | ✗ | ✗ | RLS policy `innovation_challenges_insert_manager` (Migration 0052) |
| **Run University Matching Algorithm** | ✗ | ✗ | ✗ | ✗ | **RO** | **✓** | ✗ | ✗ | RLS policy `institution_match_runs_insert_manager` |
| **Dispatch Outreach Invitations** | ✗ | ✗ | ✗ | ✗ | **RO** | **✓** | ✗ | ✗ | RLS on `public.institution_invitations` |
| **Accept / Decline Challenge Invitation** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **~** (Affiliated Inst) | ✗ | RLS on `public.institution_invitations` (`status` update) |
| **Initialize Project Workspace** | ✗ | ✗ | ✗ | ✗ | **RO** | **✓** | **~** (Affiliated Inst) | ✗ | Trigger `validate_project_workspace_creation()` |
| **Manage Project Team Members** | ✗ | ✗ | ✗ | ✗ | **RO** | **RO** | **~** (Project Lead) | ✗ | Trigger `enforce_project_member_governance()` |
| **Author & Submit Research Proposal** | ✗ | ✗ | ✗ | ✗ | **RO** | **RO** | **~** (Project Lead) | ✗ | Trigger `trg_validate_research_proposal_creation` |
| **Review & Request Proposal Revision** | ✗ | ✗ | ✗ | ✗ | **RO** | **✓** | ✗ | ✗ | Trigger `trg_enforce_research_proposal_governance` |
| **Approve Research Proposal** | ✗ | ✗ | ✗ | ✗ | **RO** | **✓** | ✗ | ✗ | Trigger `trg_enforce_research_proposal_governance` |
| **Create Testbed Pilot Plan** | ✗ | ✗ | ✗ | ✗ | **RO** | **✓** | **~** (Affiliated Inst) | ✗ | RLS policy on `public.pilot_plans` |
| **Upload Live Sensor Telemetry** | ✗ | ✗ | ✗ | ✗ | **RO** | **✓** | **~** (Affiliated Inst) | ✗ | RLS on `public.pilot_metric_telemetry` |
| **Publish Validated Solution to Knowledge Hub** | ✗ | ✗ | ✗ | ✗ | **RO** | **✓** | ✗ | ✗ | RLS policy `solution_knowledge_insert_manager` |
| **Create Marketplace Listing** | ✗ | ✗ | ✗ | ✗ | **RO** | **RO** | **~** (Affiliated Inst) | ✗ | RLS policy on `public.marketplace_listings` |
| **Submit Marketplace Application** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **✓** | RLS policy on `public.marketplace_applications` |
| **Review Marketplace Application** | ✗ | ✗ | ✗ | ✗ | **RO** | **RO** | **~** (Listing Creator) | ✗ | RLS policy on `public.marketplace_applications` |
| **Provision / Delete Staff Users** | ✗ | ✗ | ✗ | ✗ | **✓** | ✗ | ✗ | ✗ | Edge Functions `admin-create-user` & `admin-delete-user` |
| **Manage Municipal Departments** | ✗ | ✗ | ✗ | ✗ | **✓** | ✗ | ✗ | ✗ | RLS on `public.departments` |
| **Manage Institution Registry Metadata** | ✗ | ✗ | ✗ | ✗ | **✓** | **RO** | **~** (Own Profile) | ✗ | RLS on `public.institutions` |
| **View Citywide 8D Analytics** | ✗ | ✗ | ✗ | ✗ | **✓** | **RO** (Innovation) | ✗ | ✗ | Scoped queries across status tables |

---

## Detailed Alignment Analysis: Frontend vs Database RLS

### 1. Admin vs Innovation Manager Boundary (Migration 0052)
- **Frontend**: In `/app/innovation/*`, if the logged-in user is `ADMIN`, the UI automatically displays `"Ecosystem Oversight (Read-Only)"` badges and hides mutation buttons (e.g., "Run Matching", "Generate AI Formulation", "Approve Proposal", "Authorize Pilot").
- **Database RLS**: Migration 0052 altered all mutation policies on `innovation_challenges`, `institution_match_runs`, `challenge_institution_selections`, `research_proposals`, `pilot_plans`, and `complex_solution_knowledge_base` to allow **`SELECT`** to `ADMIN`, but restrict **`INSERT` / `UPDATE` / `DELETE`** exclusively to `INNOVATION_MANAGER`.
- **Verdict**: **100% Aligned and Enforced at Both Layers**.

### 2. Issue Classification Authority Boundary
- **Frontend**: The "Approve Classification" and "Override Type" dropdowns appear only in the Admin Classification Queue (`/app/admin/classification`).
- **Database RLS**: Trigger `enforce_issue_classification_authority()` intercepts every `UPDATE` on `public.issues` and raises PostgreSQL Exception `23514` if any non-`ADMIN` attempts to alter `final_issue_type`.
- **Verdict**: **100% Aligned and Enforced at Both Layers**.

### 3. Field Worker Scoped Execution Boundary
- **Frontend**: Field workers can only view tasks assigned to their specific `profile_id` in `/app/worker/assigned-issues`.
- **Database RLS**: RLS policy on `public.issues` and `department_worker_assignments` restricts worker queries to `worker_profile_id = current_profile_id()`.
- **Verdict**: **100% Aligned and Enforced at Both Layers**.
