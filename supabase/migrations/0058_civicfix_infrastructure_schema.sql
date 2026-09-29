-- Migration 0058: CivicFix Infrastructure & Capital Development Workflow Schema
-- Implements:
-- 1. Updated check constraints for 3-way issue classification (SIMPLE, COMPLEX, INFRASTRUCTURE)
-- 2. District reference columns on public.issues
-- 3. Canonical Districts Master (786 unique districts of India including Jharkhand subset)
-- 4. Canonical Reference Tables for Datasets D1 to D7 with Data Provenance
-- 5. Synthetic Benchmark Table for Dataset D8 (Testing & Reference only)
-- 6. Operational Department to Planning Sector Mapping Bridge
-- 7. Infrastructure Decision-Support Assessments (Versioned Factual Dossier)
-- 8. Infrastructure Administrative Decisions (Official Governance Ledger)
-- 9. Updated Status Transition & Classification Authority Guards
-- 10. Synchronized Decision-to-Status Transition Trigger
-- 11. Strict Row-Level Security (RLS) & Performance Indexes

-- ============================================================================
-- PART 1: EXTEND CLASSIFICATION CHECK CONSTRAINTS
-- ============================================================================

do $$
begin
  -- Drop existing inline check constraints on classification columns
  if exists (
    select 1 from pg_constraint
    where conname = 'issues_ai_issue_type_check'
      and conrelid = 'public.issues'::regclass
  ) then
    alter table public.issues drop constraint issues_ai_issue_type_check;
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'issues_final_issue_type_check'
      and conrelid = 'public.issues'::regclass
  ) then
    alter table public.issues drop constraint issues_final_issue_type_check;
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'issue_ai_analysis_issue_type_check'
      and conrelid = 'public.issue_ai_analysis'::regclass
  ) then
    alter table public.issue_ai_analysis drop constraint issue_ai_analysis_issue_type_check;
  end if;
end $$;

alter table public.issues
  add constraint issues_ai_issue_type_check
  check (ai_issue_type is null or ai_issue_type in ('SIMPLE', 'COMPLEX', 'INFRASTRUCTURE'));

alter table public.issues
  add constraint issues_final_issue_type_check
  check (final_issue_type is null or final_issue_type in ('SIMPLE', 'COMPLEX', 'INFRASTRUCTURE'));

alter table public.issue_ai_analysis
  add constraint issue_ai_analysis_issue_type_check
  check (issue_type is null or issue_type in ('SIMPLE', 'COMPLEX', 'INFRASTRUCTURE'));

-- ============================================================================
-- PART 2: CANONICAL DISTRICTS MASTER TABLE (D3 Foundation)
-- ============================================================================

create table if not exists public.districts (
  id text primary key,                                               -- Canonical Code: 'IN-D0001' to 'IN-D0786'
  country_code text not null default 'IN',
  state_code text,                                                   -- e.g. 'IN-ST-15', 'JH'
  state_name text not null,                                          -- e.g. 'Jharkhand', 'Maharashtra'
  district_name text not null,                                       -- e.g. 'Ranchi', 'Bokaro'
  official_district_code text,                                       -- Census / LGD code (e.g. '330')
  canonical_source text not null default 'INDIA_D1_D3',
  alternate_source_codes text[] not null default '{}',               -- e.g. ARRAY['JH-D20']
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.districts is 'Authoritative master of all 786 canonical districts of India, providing unified geographic identity for D1-D8 datasets and civic issue location resolution.';

create index if not exists idx_districts_name_lower on public.districts (lower(district_name));
create index if not exists idx_districts_state on public.districts (state_name);

-- ============================================================================
-- PART 3: EXTEND PUBLIC.ISSUES WITH DISTRICT RESOLUTION COLUMNS
-- ============================================================================

alter table public.issues
  add column if not exists district_id text references public.districts(id) on update cascade on delete set null,
  add column if not exists district_resolution_method text check (
    district_resolution_method is null or district_resolution_method in ('CITIZEN_SELECTED', 'AI_ADDRESS_PARSED', 'ADMIN_MANUAL')
  );

create index if not exists idx_issues_district_id on public.issues (district_id) where district_id is not null;

comment on column public.issues.district_id is 'Canonical district where the reported civic or infrastructure issue is physically located.';
comment on column public.issues.district_resolution_method is 'Method used to determine the canonical district: CITIZEN_SELECTED, AI_ADDRESS_PARSED, or ADMIN_MANUAL.';

-- ============================================================================
-- PART 4: DATASET D1 — DISTRICT DEMOGRAPHICS & POPULATION
-- ============================================================================

create table if not exists public.district_demographics (
  id uuid primary key default gen_random_uuid(),
  district_id text not null references public.districts(id) on update cascade on delete cascade,
  total_population bigint not null check (total_population > 0),
  male_population bigint,
  female_population bigint,
  rural_population bigint,
  urban_population bigint,
  children_0_14 bigint,
  working_age_population_15_59 bigint,
  elderly_population_60_plus bigint,
  total_households bigint not null check (total_households > 0),
  average_household_size numeric(4, 2),
  sc_population bigint default 0,
  st_population bigint default 0,
  literacy_rate_percentage numeric(5, 2),
  worker_participation_rate_percentage numeric(5, 2),
  households_with_electricity_percentage numeric(5, 2),
  households_with_piped_water_percentage numeric(5, 2),
  households_with_toilet_percentage numeric(5, 2),
  healthcare_access_score numeric(5, 2),
  education_access_score numeric(5, 2),
  water_access_score numeric(5, 2),
  electricity_access_score numeric(5, 2),
  overall_service_gap_score numeric(5, 2),
  development_need_score numeric(5, 2),
  population_impact_score numeric(5, 2),
  source_dataset text not null default 'INDIA_D1',
  source_record_id text,
  reconciled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint district_demographics_district_source_unique unique (district_id, source_dataset)
);

comment on table public.district_demographics is 'Canonical district-level demographic context and vulnerable population metrics derived from Dataset D1 for infrastructure decision support.';
create index if not exists idx_demographics_district_id on public.district_demographics (district_id);

-- ============================================================================
-- PART 5: DATASET D2 — DISTRICT DEPARTMENTAL BUDGETS (STATE + CENTRAL)
-- ============================================================================

create table if not exists public.district_department_budgets (
  id uuid primary key default gen_random_uuid(),
  district_id text not null references public.districts(id) on update cascade on delete cascade,
  planning_sector_code text not null,                                -- e.g. 'DEPT-01' to 'DEPT-10'
  planning_sector_name text not null,                                -- e.g. 'Roads & Transport'
  financial_year text not null,                                      -- e.g. 'FY2024-25'
  funding_source text not null default 'STATE' check (funding_source in ('STATE', 'CENTRAL', 'COMBINED', 'OTHER')),
  allocated_budget_crore numeric(12, 2) not null default 0,
  released_budget_crore numeric(12, 2) not null default 0,
  committed_budget_crore numeric(12, 2) not null default 0,
  spent_budget_crore numeric(12, 2) not null default 0,
  unspent_budget_crore numeric(12, 2) not null default 0,
  available_for_new_development_crore numeric(12, 2) not null default 0,
  budget_utilization_percentage numeric(5, 2),
  budget_commitment_percentage numeric(5, 2),
  budget_pressure_score numeric(5, 2),
  source_dataset text not null default 'INDIA_D2',
  source_record_id text,
  reconciled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint district_dept_budget_unique unique (district_id, planning_sector_code, financial_year, funding_source),
  constraint budget_hierarchy_check check (
    (spent_budget_crore <= released_budget_crore or released_budget_crore = 0)
    and (released_budget_crore <= allocated_budget_crore or allocated_budget_crore = 0)
  )
);

comment on table public.district_department_budgets is 'District departmental budget allocations, expenditures, and unspent funds per financial year and funding stream (State/Central) derived from Dataset D2.';
create index if not exists idx_budgets_lookup on public.district_department_budgets (district_id, planning_sector_code, financial_year);

-- ============================================================================
-- PART 6: DATASET D3 — DISTRICT GEOGRAPHY & SPATIAL ATTRIBUTES
-- ============================================================================

create table if not exists public.district_geography (
  id uuid primary key default gen_random_uuid(),
  district_id text not null references public.districts(id) on update cascade on delete cascade,
  area_sq_km numeric(10, 2),
  centroid_latitude numeric(9, 6) not null,
  centroid_longitude numeric(9, 6) not null,
  north_extent numeric(9, 6),
  south_extent numeric(9, 6),
  east_extent numeric(9, 6),
  west_extent numeric(9, 6),
  north_south_extent_km numeric(8, 2),
  east_west_extent_km numeric(8, 2),
  geographic_region text,
  rural_urban_character text,
  terrain_type text,
  density_category text,
  district_headquarters text,
  neighboring_districts text[] not null default '{}',
  neighbor_count integer not null default 0,
  source_dataset text not null default 'INDIA_D3',
  source_record_id text,
  reconciled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint district_geography_district_source_unique unique (district_id, source_dataset)
);

comment on table public.district_geography is 'District geographic characteristics, centroid coordinates, and administrative terrain context derived from Dataset D3.';
create index if not exists idx_geography_district_id on public.district_geography (district_id);

-- ============================================================================
-- PART 7: DATASET D4 — DISTRICT INFRASTRUCTURE ASSETS & DEFICIT SCORES
-- ============================================================================

create table if not exists public.district_infrastructure_assets (
  id uuid primary key default gen_random_uuid(),
  district_id text not null references public.districts(id) on update cascade on delete cascade,
  infrastructure_id text not null,                                   -- e.g. 'INFRA-01' to 'INFRA-08'
  infrastructure_category text not null,                             -- e.g. 'Healthcare', 'Roads & Transport'
  infrastructure_type text,
  existing_asset_count integer not null default 0,
  functional_asset_count integer not null default 0,
  total_capacity numeric(12, 2),
  current_utilization numeric(12, 2),
  utilization_percentage numeric(5, 2),
  population_coverage_percentage numeric(5, 2),
  average_condition_score numeric(5, 2),
  infrastructure_gap_score numeric(5, 2) not null,
  additional_capacity_needed text,
  source_dataset text not null default 'INDIA_D4',
  source_record_id text,
  reconciled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint district_infra_asset_unique unique (district_id, infrastructure_id, source_dataset)
);

comment on table public.district_infrastructure_assets is 'District existing physical infrastructure inventory, functional asset capacity, and deficit gap metrics derived from Dataset D4.';
create index if not exists idx_infra_assets_lookup on public.district_infrastructure_assets (district_id, infrastructure_category);

-- ============================================================================
-- PART 8: DATASET D5 — DISTRICT ACCESSIBILITY & CONNECTIVITY METRICS
-- ============================================================================

create table if not exists public.district_accessibility_metrics (
  id uuid primary key default gen_random_uuid(),
  district_id text not null references public.districts(id) on update cascade on delete cascade,
  road_connectivity_score numeric(5, 2),
  paved_road_coverage_percentage numeric(5, 2),
  all_weather_access_percentage numeric(5, 2),
  public_transport_connectivity_score numeric(5, 2),
  average_travel_time_minutes numeric(6, 2),
  average_distance_to_service_center_km numeric(6, 2),
  remote_population_percentage numeric(5, 2),
  service_accessibility_score numeric(5, 2),
  transport_access_gap_score numeric(5, 2),
  remote_area_access_gap_score numeric(5, 2),
  overall_accessibility_gap_score numeric(5, 2) not null,
  source_dataset text not null default 'INDIA_D5',
  source_record_id text,
  reconciled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint district_accessibility_district_source_unique unique (district_id, source_dataset)
);

comment on table public.district_accessibility_metrics is 'District road connectivity, paved road coverage, and transit access metrics derived from Dataset D5.';
create index if not exists idx_accessibility_district_id on public.district_accessibility_metrics (district_id);

-- ============================================================================
-- PART 9: DATASET D6 — DISTRICT SOCIOECONOMIC & SERVICE GAPS
-- ============================================================================

create table if not exists public.district_socioeconomic_gaps (
  id uuid primary key default gen_random_uuid(),
  district_id text not null references public.districts(id) on update cascade on delete cascade,
  economic_vulnerability_score numeric(5, 2),
  estimated_low_income_population_percentage numeric(5, 2),
  employment_opportunity_score numeric(5, 2),
  economic_activity_score numeric(5, 2),
  vulnerable_population_percentage numeric(5, 2),
  healthcare_service_gap_score numeric(5, 2),
  education_service_gap_score numeric(5, 2),
  water_sanitation_service_gap_score numeric(5, 2),
  electricity_service_gap_score numeric(5, 2),
  digital_connectivity_gap_score numeric(5, 2),
  essential_service_gap_score numeric(5, 2),
  development_need_context_score numeric(5, 2),
  service_deprivation_score numeric(5, 2),
  socioeconomic_pressure_score numeric(5, 2),
  overall_development_context_score numeric(5, 2) not null,
  source_dataset text not null default 'INDIA_D6',
  source_record_id text,
  reconciled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint district_socioeconomic_district_source_unique unique (district_id, source_dataset)
);

comment on table public.district_socioeconomic_gaps is 'District socioeconomic vulnerability, service deprivation, and development need indices derived from Dataset D6.';
create index if not exists idx_socioeconomic_district_id on public.district_socioeconomic_gaps (district_id);

-- ============================================================================
-- PART 10: DATASET D7 — DISTRICT HISTORICAL GOVERNMENT PROJECTS
-- ============================================================================

create table if not exists public.district_historical_projects (
  id uuid primary key default gen_random_uuid(),
  project_id text not null unique,                                   -- e.g. 'IN-PROJ-0001', 'JH-PROJ-0001'
  district_id text not null references public.districts(id) on update cascade on delete cascade,
  planning_sector_code text not null,                                -- e.g. 'DEPT-01'
  planning_sector_name text not null,                                -- e.g. 'Roads & Transport'
  project_sector text not null,
  project_type text not null,
  project_name text,
  financial_year text,
  project_status text not null default 'COMPLETED',
  estimated_cost_crore numeric(12, 2) not null,
  approved_cost_crore numeric(12, 2) not null,
  actual_cost_crore numeric(12, 2) not null,
  project_duration_months integer,
  actual_duration_months integer,
  estimated_beneficiary_population bigint,
  completion_percentage numeric(5, 2) default 100.0,
  cost_variance_percentage numeric(6, 2),
  time_variance_percentage numeric(6, 2),
  budget_source_type text,
  implementation_mode text,
  contractor_or_implementer_type text,
  maintenance_requirement_level text,
  historical_cost_per_beneficiary numeric(10, 2),
  project_execution_efficiency_score numeric(5, 2),
  source_dataset text not null default 'INDIA_D7',
  source_record_id text,
  reconciled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.district_historical_projects is 'Historical government capital works projects, execution costs, and timeline precedents derived from Dataset D7.';
create index if not exists idx_hist_projects_lookup on public.district_historical_projects (district_id, planning_sector_code);

-- ============================================================================
-- PART 11: DATASET D8 — SYNTHETIC BENCHMARK DEVELOPMENT REQUESTS
-- ============================================================================

create table if not exists public.benchmark_development_requests (
  id uuid primary key default gen_random_uuid(),
  benchmark_request_id text not null unique,                         -- e.g. 'IN-REQ-00001', 'JH-REQ-0001'
  district_id text not null references public.districts(id) on update cascade on delete cascade,
  request_category text not null,
  request_type text not null,
  request_title text not null,
  request_description text,
  planning_sector_code text,
  estimated_project_cost_crore numeric(12, 2),
  estimated_duration_months integer,
  estimated_beneficiary_population bigint,
  affected_households integer,
  urgency_level text,
  service_gap_score numeric(5, 2),
  accessibility_gap_score numeric(5, 2),
  infrastructure_gap_score numeric(5, 2),
  socioeconomic_context_score numeric(5, 2),
  historical_cost_context_crore numeric(12, 2),
  available_budget_context_crore numeric(12, 2),
  budget_pressure_context_score numeric(5, 2),
  ai_complexity_classification text,
  data_completeness_score numeric(5, 2),
  admin_review_status text,
  decision_reason text,
  is_synthetic boolean not null default true,
  source_dataset text not null default 'INDIA_D8',
  source_record_id text,
  reconciled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.benchmark_development_requests is 'SYNTHETIC PROTOTYPE DATASET (D8): Used strictly for testing, calibration, and historical similarity indexing. Never contains live citizen submissions.';
create index if not exists idx_benchmark_requests_district on public.benchmark_development_requests (district_id, planning_sector_code);

-- ============================================================================
-- PART 12: DEPARTMENT → PLANNING SECTOR BRIDGE TABLE
-- ============================================================================

create table if not exists public.department_planning_sectors (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on update cascade on delete cascade,
  planning_sector_code text not null,                                -- e.g. 'DEPT-01' to 'DEPT-10'
  planning_sector_name text not null,                                -- e.g. 'Roads & Transport'
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dept_planning_sector_unique unique (department_id, planning_sector_code)
);

comment on table public.department_planning_sectors is 'Many-to-one bridge mapping 25 operational municipal departments to 10 macro capital planning sectors.';
create index if not exists idx_dept_planning_sectors_dept on public.department_planning_sectors (department_id);

-- ============================================================================
-- PART 13: INFRASTRUCTURE DECISION-SUPPORT ASSESSMENTS (Internal Dossier)
-- ============================================================================

create table if not exists public.infrastructure_assessments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on update cascade on delete cascade,
  district_id text not null references public.districts(id) on update cascade on delete restrict,
  planning_sector_code text not null,                                -- e.g. 'DEPT-01'
  assessment_version integer not null default 1,
  is_latest boolean not null default true,
  
  -- Quantitative Baselines
  estimated_project_cost_crore numeric(12, 2) check (estimated_project_cost_crore is null or estimated_project_cost_crore >= 0),
  estimated_project_duration_months integer check (estimated_project_duration_months is null or estimated_project_duration_months >= 0),
  estimated_beneficiaries integer check (estimated_beneficiaries is null or estimated_beneficiaries >= 0),
  affected_households integer check (affected_households is null or affected_households >= 0),
  data_completeness_score numeric(5, 2) check (data_completeness_score is null or (data_completeness_score between 0 and 100)),
  
  -- Structured Multi-Dataset Context Snapshots (Factual Evidence at Assessment Time)
  demographic_context jsonb not null default '{}'::jsonb,            -- D1 snapshot
  budget_context jsonb not null default '{}'::jsonb,                 -- D2 snapshot (State + Central)
  geography_context jsonb not null default '{}'::jsonb,              -- D3 snapshot
  infrastructure_context jsonb not null default '{}'::jsonb,         -- D4 snapshot
  accessibility_context jsonb not null default '{}'::jsonb,          -- D5 snapshot
  socioeconomic_context jsonb not null default '{}'::jsonb,          -- D6 snapshot
  historical_cost_context jsonb not null default '{}'::jsonb,        -- D7 snapshot
  similar_requests_context jsonb not null default '{}'::jsonb,       -- D8 benchmark similarity
  
  -- Qualitative Decision Support Indicators
  feasibility_indicators jsonb not null default '{}'::jsonb,
  sustainability_indicators jsonb not null default '{}'::jsonb,
  risks_and_missing_info text[] not null default '{}',
  assessment_summary text,
  
  generated_by uuid references public.profiles(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_issue_version_unique unique (issue_id, assessment_version)
);

comment on table public.infrastructure_assessments is 'Internal government decision-support dossier compiling factual context snapshots from D1-D7 for an infrastructure issue. Not directly exposed to citizens.';

create index if not exists idx_infra_assessments_issue on public.infrastructure_assessments (issue_id);
create index if not exists idx_infra_assessments_district on public.infrastructure_assessments (district_id);
create unique index if not exists idx_infra_assessments_latest on public.infrastructure_assessments (issue_id) where is_latest = true;

-- ============================================================================
-- PART 14: INFRASTRUCTURE ADMINISTRATIVE DECISIONS (Official Governance Ledger)
-- ============================================================================

create table if not exists public.infrastructure_decisions (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on update cascade on delete cascade,
  assessment_id uuid references public.infrastructure_assessments(id) on update cascade on delete set null,
  decision text not null check (decision in ('ACCEPTED', 'DEFERRED', 'REJECTED')),
  internal_decision_reason text,                                     -- Internal government review note
  citizen_safe_summary text not null,                                -- Official explanation visible to citizen
  re_request_timeframe_months integer check (re_request_timeframe_months is null or re_request_timeframe_months > 0),
  deferred_target_fiscal_year text,
  expected_review_date date,
  expected_start_date date,
  expected_completion_date date,
  decided_by uuid not null references public.profiles(id) on update cascade on delete restrict,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.infrastructure_decisions is 'Authoritative administrative decisions executed by platform administrators for infrastructure requests. Contains citizen-safe summaries for public visibility.';

create index if not exists idx_infra_decisions_issue on public.infrastructure_decisions (issue_id);
create index if not exists idx_infra_decisions_assessment on public.infrastructure_decisions (assessment_id);

-- ============================================================================
-- PART 15: UPDATED STATUS TRANSITION & CLASSIFICATION FUNCTIONS
-- ============================================================================

-- 1. Update enforce_issue_classification_authority() to include CLASSIFIED_INFRASTRUCTURE
create or replace function public.enforce_issue_classification_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If final_issue_type or classification decision fields are being changed
  if (new.final_issue_type is distinct from old.final_issue_type)
     or (new.classification_decided_by is distinct from old.classification_decided_by)
     or (new.classification_override_reason is distinct from old.classification_override_reason)
     or (new.status in ('CLASSIFIED_SIMPLE'::public.issue_status, 'CLASSIFIED_COMPLEX'::public.issue_status, 'CLASSIFIED_INFRASTRUCTURE'::public.issue_status)
         and old.status not in ('CLASSIFIED_SIMPLE'::public.issue_status, 'CLASSIFIED_COMPLEX'::public.issue_status, 'CLASSIFIED_INFRASTRUCTURE'::public.issue_status))
  then
    if not public.current_user_has_role(array['ADMIN'::public.role_code]) then
      raise exception 'Only platform administrators have authority to classify civic issues and determine operational routing.'
        using errcode = '42501';
    end if;

    -- Ensure classification_decided_at is recorded
    if new.classification_decided_at is null then
      new.classification_decided_at := now();
    end if;

    -- Ensure classification_decided_by is assigned to current profile if null
    if new.classification_decided_by is null then
      new.classification_decided_by := public.current_profile_id();
    end if;
  end if;

  return new;
end;
$$;

-- 2. Update validate_issue_status_history_transition() with Infrastructure Transitions
create or replace function public.validate_issue_status_history_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.issue_status;
begin
  select i.status
  into current_status
  from public.issues i
  where i.id = new.issue_id
  for update;

  if current_status is null then
    raise exception 'Issue not found.';
  end if;

  if new.changed_by_profile_id is distinct from public.current_profile_id() then
    raise exception 'changed_by_profile_id must match the current profile.';
  end if;

  if new.old_status is distinct from current_status then
    raise exception 'Issue status has changed. Refresh and try again.';
  end if;

  if new.new_status = current_status then
    raise exception 'Issue is already in this status.';
  end if;

  -- 1. Admin Transitions (Full governance authority)
  if public.current_user_has_role(array['ADMIN'::public.role_code]) then
    -- Classification transitions from initial reporting
    if current_status in ('SUBMITTED'::public.issue_status, 'AI_ANALYZED'::public.issue_status)
       and new.new_status = 'AWAITING_ADMIN_CLASSIFICATION'::public.issue_status then
      return new;
    end if;

    if current_status in ('AWAITING_ADMIN_CLASSIFICATION'::public.issue_status, 'AI_ANALYZED'::public.issue_status, 'SUBMITTED'::public.issue_status)
       and new.new_status in (
         'CLASSIFIED_SIMPLE'::public.issue_status,
         'CLASSIFIED_COMPLEX'::public.issue_status,
         'CLASSIFIED_INFRASTRUCTURE'::public.issue_status,
         'REJECTED'::public.issue_status
       ) then
      return new;
    end if;

    -- Infrastructure Lifecycle Transitions
    if current_status = 'CLASSIFIED_INFRASTRUCTURE'::public.issue_status
       and new.new_status in (
         'INFRASTRUCTURE_REVIEW'::public.issue_status,
         'CLASSIFIED_SIMPLE'::public.issue_status,
         'CLASSIFIED_COMPLEX'::public.issue_status,
         'REJECTED'::public.issue_status
       ) then
      return new;
    end if;

    if current_status = 'INFRASTRUCTURE_REVIEW'::public.issue_status
       and new.new_status in (
         'INFRASTRUCTURE_ACCEPTED'::public.issue_status,
         'INFRASTRUCTURE_DEFERRED'::public.issue_status,
         'INFRASTRUCTURE_REJECTED'::public.issue_status,
         'CLASSIFIED_SIMPLE'::public.issue_status,
         'CLASSIFIED_COMPLEX'::public.issue_status,
         'REJECTED'::public.issue_status
       ) then
      return new;
    end if;

    if current_status in ('INFRASTRUCTURE_ACCEPTED'::public.issue_status, 'INFRASTRUCTURE_DEFERRED'::public.issue_status, 'INFRASTRUCTURE_REJECTED'::public.issue_status)
       and new.new_status in (
         'INFRASTRUCTURE_REVIEW'::public.issue_status,
         'CLASSIFIED_INFRASTRUCTURE'::public.issue_status,
         'REJECTED'::public.issue_status
       ) then
      return new;
    end if;

    -- Existing Simple/Complex Transitions
    if current_status in ('CLASSIFIED_SIMPLE'::public.issue_status, 'VERIFIED'::public.issue_status, 'REOPENED'::public.issue_status)
       and new.new_status in ('ASSIGNED'::public.issue_status, 'VERIFIED'::public.issue_status, 'REJECTED'::public.issue_status, 'CLASSIFIED_COMPLEX'::public.issue_status, 'CLASSIFIED_INFRASTRUCTURE'::public.issue_status) then
      return new;
    end if;

    if current_status = 'CLASSIFIED_COMPLEX'::public.issue_status
       and new.new_status in ('CLASSIFIED_SIMPLE'::public.issue_status, 'CLASSIFIED_INFRASTRUCTURE'::public.issue_status, 'REJECTED'::public.issue_status) then
      return new;
    end if;

    if current_status in ('ASSIGNED'::public.issue_status, 'IN_PROGRESS'::public.issue_status, 'PARTIALLY_COMPLETED'::public.issue_status, 'UNDER_REVIEW'::public.issue_status)
       and new.new_status in ('RESOLVED'::public.issue_status, 'REJECTED'::public.issue_status, 'PARTIALLY_COMPLETED'::public.issue_status, 'UNDER_REVIEW'::public.issue_status) then
      return new;
    end if;

    if new.new_status = 'REJECTED'::public.issue_status then
      return new;
    end if;
  end if;

  -- 2. Municipal Officer Transitions (Simple/Municipal Workflow)
  if public.current_user_has_role(array['MUNICIPAL_OFFICER'::public.role_code]) then
    if current_status in ('CLASSIFIED_SIMPLE'::public.issue_status, 'SUBMITTED'::public.issue_status, 'AI_ANALYZED'::public.issue_status)
       and new.new_status in ('VERIFIED'::public.issue_status, 'REJECTED'::public.issue_status) then
      return new;
    end if;

    if current_status in ('CLASSIFIED_SIMPLE'::public.issue_status, 'VERIFIED'::public.issue_status, 'REOPENED'::public.issue_status)
       and new.new_status in ('ASSIGNED'::public.issue_status) then
      return new;
    end if;

    if current_status in ('ASSIGNED'::public.issue_status, 'IN_PROGRESS'::public.issue_status, 'PARTIALLY_COMPLETED'::public.issue_status, 'UNDER_REVIEW'::public.issue_status)
       and new.new_status in ('RESOLVED'::public.issue_status, 'REJECTED'::public.issue_status, 'PARTIALLY_COMPLETED'::public.issue_status, 'UNDER_REVIEW'::public.issue_status) then
      return new;
    end if;
  end if;

  -- 3. Department Manager Transitions
  if public.current_user_has_role(array['DEPARTMENT_MANAGER'::public.role_code]) then
    if exists (
      select 1
      from public.issue_department_assignments ida
      where ida.issue_id = new.issue_id
        and ida.department_id = public.current_user_department_id()
    ) and new.new_status in ('IN_PROGRESS'::public.issue_status, 'PARTIALLY_COMPLETED'::public.issue_status, 'UNDER_REVIEW'::public.issue_status, 'REJECTED'::public.issue_status, 'REOPENED'::public.issue_status) then
      return new;
    end if;
  end if;

  -- 4. Field Worker Transitions
  if public.current_user_has_role(array['FIELD_WORKER'::public.role_code]) then
    if public.issue_is_assigned_to_current_worker(new.issue_id)
      and current_status in ('ASSIGNED'::public.issue_status, 'PARTIALLY_COMPLETED'::public.issue_status, 'REOPENED'::public.issue_status, 'REJECTED'::public.issue_status)
      and new.new_status = 'IN_PROGRESS'::public.issue_status then
      return new;
    end if;

    if public.issue_is_assigned_to_current_worker(new.issue_id)
      and current_status in ('IN_PROGRESS'::public.issue_status, 'PARTIALLY_COMPLETED'::public.issue_status)
      and new.new_status in ('UNDER_REVIEW'::public.issue_status, 'PARTIALLY_COMPLETED'::public.issue_status) then
      return new;
    end if;
  end if;

  -- 5. Citizen Transitions
  if public.current_user_has_role(array['CITIZEN'::public.role_code]) then
    if current_status = 'RESOLVED'::public.issue_status
      and new.new_status in ('CITIZEN_VERIFIED'::public.issue_status, 'REOPENED'::public.issue_status)
      and exists (
        select 1
        from public.issues i
        where i.id = new.issue_id
          and i.reporter_profile_id = public.current_profile_id()
      ) then
      return new;
    end if;
  end if;

  raise exception 'Unauthorized status transition from % to % by user %.', current_status, new.new_status, auth.uid();
end;
$$;

-- 3. Update issue_is_accessible() to include Infrastructure Scope
create or replace function public.issue_is_accessible(target_issue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- Admin has global access
    public.current_user_has_role(array['ADMIN'::public.role_code])
    -- Innovation Manager accesses complex issues
    or (
      public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
      and exists (
        select 1 from public.issues i
        where i.id = target_issue_id
          and (i.final_issue_type = 'COMPLEX' or i.status = 'CLASSIFIED_COMPLEX'::public.issue_status or i.ai_issue_type = 'COMPLEX')
      )
    )
    -- Municipal Officer accesses simple and operational issues
    or (
      public.current_user_has_role(array['MUNICIPAL_OFFICER'::public.role_code])
      and exists (
        select 1 from public.issues i
        where i.id = target_issue_id
          and (i.status <> 'CLASSIFIED_COMPLEX'::public.issue_status and (i.final_issue_type is null or i.final_issue_type <> 'COMPLEX'))
      )
    )
    -- Citizen reporter accesses own issues
    or exists (
      select 1
      from public.issues i
      where i.id = target_issue_id
        and i.reporter_profile_id = public.current_profile_id()
    )
    -- Department Manager accesses departmental assignments
    or exists (
      select 1
      from public.issue_department_assignments ida
      join public.profiles p on p.id = public.current_profile_id()
      join public.roles r on r.id = p.role_id
      where ida.issue_id = target_issue_id
        and r.code = 'DEPARTMENT_MANAGER'::public.role_code
        and ida.department_id = p.department_id
    )
    -- Assigned Field Worker accesses assigned issues
    or public.issue_is_assigned_to_current_worker(target_issue_id);
$$;

-- ============================================================================
-- PART 16: DECISION-TO-STATUS SYNCHRONIZATION TRIGGER
-- ============================================================================

create or replace function public.sync_infrastructure_decision_to_issue_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status public.issue_status;
  v_target_status public.issue_status;
  v_reporter_id uuid;
  v_issue_title text;
  v_notif_title text;
  v_notif_message text;
begin
  -- Determine target status based on decision
  v_target_status := case new.decision
    when 'ACCEPTED' then 'INFRASTRUCTURE_ACCEPTED'::public.issue_status
    when 'DEFERRED' then 'INFRASTRUCTURE_DEFERRED'::public.issue_status
    when 'REJECTED' then 'INFRASTRUCTURE_REJECTED'::public.issue_status
  end;

  select status, reporter_profile_id, title
  into v_current_status, v_reporter_id, v_issue_title
  from public.issues
  where id = new.issue_id
  for update;

  if v_current_status is null then
    raise exception 'Target issue % not found.', new.issue_id;
  end if;

  -- Insert status transition audit record if status differs
  if v_current_status is distinct from v_target_status then
    insert into public.issue_status_history (
      issue_id,
      old_status,
      new_status,
      changed_by_profile_id,
      notes
    )
    values (
      new.issue_id,
      v_current_status,
      v_target_status,
      new.decided_by,
      coalesce(new.internal_decision_reason, new.citizen_safe_summary)
    );
  end if;

  -- Generate Citizen Notification
  v_notif_title := case new.decision
    when 'ACCEPTED' then 'Infrastructure Request Accepted for Capital Planning'
    when 'DEFERRED' then 'Infrastructure Request Deferred to Future Planning Cycle'
    when 'REJECTED' then 'Infrastructure Request Review Completed'
  end;

  v_notif_message := coalesce(new.citizen_safe_summary, 'Your infrastructure development request has been officially reviewed.');

  if v_reporter_id is not null then
    insert into public.notifications (
      recipient_profile_id,
      notification_type,
      title,
      message,
      related_issue_id
    )
    values (
      v_reporter_id,
      'STATUS_CHANGE'::public.notification_type,
      v_notif_title,
      v_notif_message,
      new.issue_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_infrastructure_decision on public.infrastructure_decisions;
create trigger trg_sync_infrastructure_decision
after insert on public.infrastructure_decisions
for each row
execute function public.sync_infrastructure_decision_to_issue_status();

-- ============================================================================
-- PART 17: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- 1. Districts Master
alter table public.districts enable row level security;
create policy districts_read_authenticated on public.districts
  for select to authenticated using (true);

-- 2. Datasets D1 to D7 (Internal Reference Data)
alter table public.district_demographics enable row level security;
create policy demographics_read_staff on public.district_demographics
  for select to authenticated
  using (public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code, 'DEPARTMENT_MANAGER'::public.role_code]));

alter table public.district_department_budgets enable row level security;
create policy budgets_read_staff on public.district_department_budgets
  for select to authenticated
  using (public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code, 'DEPARTMENT_MANAGER'::public.role_code]));

alter table public.district_geography enable row level security;
create policy geography_read_staff on public.district_geography
  for select to authenticated
  using (public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code, 'DEPARTMENT_MANAGER'::public.role_code]));

alter table public.district_infrastructure_assets enable row level security;
create policy infra_assets_read_staff on public.district_infrastructure_assets
  for select to authenticated
  using (public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code, 'DEPARTMENT_MANAGER'::public.role_code]));

alter table public.district_accessibility_metrics enable row level security;
create policy accessibility_read_staff on public.district_accessibility_metrics
  for select to authenticated
  using (public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code, 'DEPARTMENT_MANAGER'::public.role_code]));

alter table public.district_socioeconomic_gaps enable row level security;
create policy socioeconomic_read_staff on public.district_socioeconomic_gaps
  for select to authenticated
  using (public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code, 'DEPARTMENT_MANAGER'::public.role_code]));

alter table public.district_historical_projects enable row level security;
create policy historical_projects_read_staff on public.district_historical_projects
  for select to authenticated
  using (public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code, 'DEPARTMENT_MANAGER'::public.role_code]));

-- 3. Synthetic Benchmark D8
alter table public.benchmark_development_requests enable row level security;
create policy benchmark_requests_read_admin on public.benchmark_development_requests
  for select to authenticated
  using (public.current_user_has_role(array['ADMIN'::public.role_code]));

-- 4. Department Planning Sectors Bridge
alter table public.department_planning_sectors enable row level security;
create policy dept_planning_sectors_read_authenticated on public.department_planning_sectors
  for select to authenticated using (true);
create policy dept_planning_sectors_admin_manage on public.department_planning_sectors
  for all to authenticated
  using (public.current_user_has_role(array['ADMIN'::public.role_code]))
  with check (public.current_user_has_role(array['ADMIN'::public.role_code]));

-- 5. Infrastructure Assessments (Internal Dossier)
alter table public.infrastructure_assessments enable row level security;
create policy infra_assessments_admin_all on public.infrastructure_assessments
  for all to authenticated
  using (public.current_user_has_role(array['ADMIN'::public.role_code]))
  with check (public.current_user_has_role(array['ADMIN'::public.role_code]));

create policy infra_assessments_staff_read on public.infrastructure_assessments
  for select to authenticated
  using (public.current_user_has_role(array['MUNICIPAL_OFFICER'::public.role_code, 'DEPARTMENT_MANAGER'::public.role_code]));

-- 6. Infrastructure Decisions (Citizen-Safe Public Record)
alter table public.infrastructure_decisions enable row level security;
create policy infra_decisions_admin_all on public.infrastructure_decisions
  for all to authenticated
  using (public.current_user_has_role(array['ADMIN'::public.role_code]))
  with check (public.current_user_has_role(array['ADMIN'::public.role_code]));

create policy infra_decisions_citizen_read on public.infrastructure_decisions
  for select to authenticated
  using (
    exists (
      select 1 from public.issues i
      where i.id = infrastructure_decisions.issue_id
        and i.reporter_profile_id = public.current_profile_id()
    )
  );
