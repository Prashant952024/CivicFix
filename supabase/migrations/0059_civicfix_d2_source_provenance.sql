-- ============================================================================
-- CivicFix Infrastructure Workflow: Migration 0059
-- Fix D2 Budget Source Provenance Uniqueness
-- ============================================================================
-- Description:
-- Updates the unique constraint on public.district_department_budgets to include
-- `source_dataset` alongside (district_id, planning_sector_code, financial_year, funding_source).
-- This enables full multi-source provenance support (e.g. INDIA_D2 national baseline
-- and JHARKHAND_D2 regional calibration) without record collisions or data loss.
-- ============================================================================

-- 1. Drop the previous 4-tuple unique constraint
alter table public.district_department_budgets
  drop constraint if exists district_dept_budget_unique;

-- 2. Add the 5-tuple source-aware unique constraint
alter table public.district_department_budgets
  add constraint district_dept_budget_unique
  unique (district_id, planning_sector_code, financial_year, funding_source, source_dataset);

-- 3. Update descriptive comment
comment on constraint district_dept_budget_unique on public.district_department_budgets
  is 'Ensures unique budget record per canonical district, planning sector, financial year, funding source stream, and source dataset provenance.';
