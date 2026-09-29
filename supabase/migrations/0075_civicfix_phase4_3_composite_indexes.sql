-- ============================================================================
-- CivicFix Phase 4.3 Scalability: Composite Database Performance Indexes
-- ============================================================================
-- Description:
-- Adds justified composite indexes to optimize common query access patterns:
-- 1. issues(department_id, created_at DESC) -> Optimizes department-filtered chronological feeds & telemetry
-- 2. issues(district_id, status) -> Optimizes infrastructure district filtering & status checks
-- 3. department_worker_assignments(worker_profile_id, status) -> Optimizes worker task queues & active assignments
--
-- Security:
-- - Pure DDL performance indexes.
-- - No RLS modifications, no role alterations, no data mutations.
-- ============================================================================

-- 1. Optimize chronological issue feeds and telemetry filtered by department
create index if not exists issues_department_created_idx
  on public.issues (department_id, created_at desc);

-- 2. Optimize district-level infrastructure issue filtering and lifecycle status queries
create index if not exists issues_district_status_idx
  on public.issues (district_id, status);

-- 3. Optimize field worker active assignment queries filtered by worker profile and status
create index if not exists idx_dept_worker_assignments_worker_status
  on public.department_worker_assignments (worker_profile_id, status);
