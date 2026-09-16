-- CivicFix Migration 0050: Phase 3F Solution Knowledge & Preventive Intelligence
-- Implements simple & complex solution knowledge bases, recurrence detection, preventive maintenance recommendations, and existing solution matching/review governance.

-- 1. Extend challenge_project_activity activity types
alter table public.challenge_project_activity drop constraint if exists challenge_project_activity_activity_type_check;
alter table public.challenge_project_activity add constraint challenge_project_activity_activity_type_check check (
  activity_type in (
    'PROJECT_CREATED',
    'MEMBER_ADDED',
    'MEMBER_ROLE_CHANGED',
    'MEMBER_DEACTIVATED',
    'MEMBER_REACTIVATED',
    'PROJECT_LEAD_CHANGED',
    'PROJECT_STATUS_CHANGED',
    'PROJECT_DETAILS_UPDATED',
    'MEMBER_DETAILS_UPDATED',
    'PROPOSAL_CREATED',
    'PROPOSAL_UPDATED',
    'PROPOSAL_SUBMITTED',
    'PROPOSAL_REVIEW_STARTED',
    'PROPOSAL_REVISION_REQUESTED',
    'PROPOSAL_RESUBMITTED',
    'PROPOSAL_APPROVED',
    'PROPOSAL_REJECTED',
    'PROGRESS_UPDATE_SUBMITTED',
    'PROGRESS_UPDATE_ACKNOWLEDGED',
    'MILESTONE_CREATED',
    'MILESTONE_UPDATED',
    'EVIDENCE_ADDED',
    'BLOCKER_REPORTED',
    'BLOCKER_RESOLVED',
    'MARKETPLACE_REQUEST_CREATED',
    'MARKETPLACE_REQUEST_UPDATED',
    'MARKETPLACE_REQUEST_PUBLISHED',
    'MARKETPLACE_REQUEST_CLOSED',
    'MARKETPLACE_APPLICATION_SUBMITTED',
    'MARKETPLACE_APPLICATION_ACCEPTED',
    'MARKETPLACE_APPLICATION_REJECTED',
    'SUPPORT_REQUEST_CREATED',
    'SUPPORT_REQUEST_UPDATED',
    'SUPPORT_REQUEST_PUBLISHED',
    'SUPPORT_REQUEST_CLOSED',
    'SUPPORT_APPLICATION_SUBMITTED',
    'SUPPORT_APPLICATION_ACCEPTED',
    'SUPPORT_APPLICATION_REJECTED',
    'SUPPORT_PARTNER_SELECTED',
    'SUPPORT_PARTNER_ONBOARDED',
    'SUPPORT_PARTNER_COMPLETED',
    'SUPPORT_OFFER_RECEIVED',
    'SUPPORT_OFFER_ACCEPTED',
    'SUPPORT_OFFER_DECLINED',
    'SUPPORT_STATUS_CHANGED',
    'PILOT_PLAN_CREATED',
    'PILOT_PLAN_UPDATED',
    'PILOT_PLAN_SUBMITTED',
    'PILOT_PLAN_REVIEW_STARTED',
    'PILOT_PLAN_REVISION_REQUESTED',
    'PILOT_PLAN_RESUBMITTED',
    'PILOT_PLAN_APPROVED',
    'PILOT_PLAN_REJECTED',
    'PILOT_REVIEW_STARTED',
    'PILOT_REVISION_REQUESTED',
    'PILOT_RESUBMITTED',
    'PILOT_APPROVED',
    'PILOT_REJECTED',
    'PILOT_STARTED',
    'PILOT_RUNNING_STARTED',
    'PILOT_MILESTONE_UPDATED',
    'PILOT_EVIDENCE_ADDED',
    'PILOT_BLOCKER_REPORTED',
    'PILOT_BLOCKER_RESOLVED',
    'PILOT_EXECUTION_COMPLETED',
    'PILOT_VALIDATION_SUBMITTED',
    'PILOT_VALIDATION_REVIEW_STARTED',
    'PILOT_VALIDATION_REVISION_REQUESTED',
    'PILOT_VALIDATION_RESUBMITTED',
    'PILOT_VALIDATION_APPROVED',
    'PILOT_VALIDATION_REJECTED',
    'VALIDATION_CREATED',
    'VALIDATION_UPDATED',
    'VALIDATION_SUBMITTED',
    'VALIDATION_REVIEW_STARTED',
    'VALIDATION_REVISION_REQUESTED',
    'VALIDATION_RESUBMITTED',
    'VALIDATION_APPROVED',
    'VALIDATION_REJECTED',
    'VALIDATION_OUTCOME_RECORDED',
    'VALIDATION_EVIDENCE_LINKED',
    'DEPLOYMENT_PLAN_CREATED',
    'DEPLOYMENT_PLAN_UPDATED',
    'DEPLOYMENT_PLAN_SUBMITTED',
    'DEPLOYMENT_PLAN_REVIEW_STARTED',
    'DEPLOYMENT_PLAN_REVISION_REQUESTED',
    'DEPLOYMENT_PLAN_RESUBMITTED',
    'DEPLOYMENT_PLAN_APPROVED',
    'DEPLOYMENT_PLAN_REJECTED',
    'DEPLOYMENT_METRIC_CREATED',
    'DEPLOYMENT_METRIC_UPDATED',
    'DEPLOYMENT_METRIC_DELETED',
    'DEPLOYMENT_REPORT_SUBMITTED',
    'DEPLOYMENT_REPORT_ACKNOWLEDGED',
    'DEPLOYMENT_ACTIVE_STARTED',
    'SOLUTION_KNOWLEDGE_CREATED',
    'SOLUTION_MARKED_REUSABLE',
    'SOLUTION_ARCHIVED',
    'SOLUTION_MATCH_DETECTED',
    'SOLUTION_REUSE_REVIEWED',
    'SOLUTION_REUSE_APPROVED',
    'SOLUTION_ADAPTATION_REQUESTED',
    'RECURRENCE_PATTERN_DETECTED',
    'PREVENTIVE_RECOMMENDATION_CREATED',
    'PREVENTIVE_RECOMMENDATION_ACKNOWLEDGED',
    'PREVENTIVE_RECOMMENDATION_DISMISSED'
  )
);

-- 2. Create simple_solution_knowledge_base table
create table if not exists public.simple_solution_knowledge_base (
  id uuid primary key default gen_random_uuid(),
  source_issue_id uuid not null references public.issues(id) on update cascade on delete cascade,
  category text not null check (length(btrim(category)) > 0),
  title text not null check (length(btrim(title)) > 0),
  description text not null check (length(btrim(description)) > 0),
  location_text text,
  address_text text,
  latitude double precision,
  longitude double precision,
  area_name text not null check (length(btrim(area_name)) > 0),
  department_id uuid references public.departments(id) on update cascade on delete set null,
  department_name text,
  
  -- Root Cause & Contributing Factors
  identified_root_cause text,
  contributing_factors text[] not null default '{}'::text[],
  
  -- Resolution Details
  resolution_summary text not null check (length(btrim(resolution_summary)) > 0),
  resolution_method text,
  materials_used text[] not null default '{}'::text[],
  resolution_duration_hours numeric(10, 2),
  
  -- Evidence References (from issue_images)
  before_evidence_images jsonb not null default '[]'::jsonb,
  after_evidence_images jsonb not null default '[]'::jsonb,
  
  -- Verification & Closure
  citizen_verification_id uuid references public.resolution_verifications(id) on update cascade on delete set null,
  citizen_feedback text,
  verified_at timestamptz,
  
  -- Recurrence Dimensions
  occurrence_date date not null,
  occurrence_month integer not null check (occurrence_month between 1 and 12),
  occurrence_season text not null default 'GENERAL' check (
    occurrence_season in ('MONSOON', 'SUMMER', 'WINTER', 'SPRING', 'AUTUMN', 'POST_MONSOON', 'PRE_MONSOON', 'GENERAL')
  ),
  
  created_at timestamptz not null default now(),
  closed_at timestamptz not null default now(),
  
  constraint simple_solution_source_issue_unique unique (source_issue_id)
);

-- Indexes for simple_solution_knowledge_base
create index if not exists simple_solution_source_issue_idx on public.simple_solution_knowledge_base (source_issue_id);
create index if not exists simple_solution_category_idx on public.simple_solution_knowledge_base (category);
create index if not exists simple_solution_area_name_idx on public.simple_solution_knowledge_base (area_name);
create index if not exists simple_solution_dept_idx on public.simple_solution_knowledge_base (department_id);
create index if not exists simple_solution_month_season_idx on public.simple_solution_knowledge_base (occurrence_month, occurrence_season);
create index if not exists simple_solution_closed_at_idx on public.simple_solution_knowledge_base (closed_at desc);

-- 3. Create complex_solution_knowledge_base table
create table if not exists public.complex_solution_knowledge_base (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.innovation_challenges(id) on update cascade on delete cascade,
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  institution_id uuid not null references public.institutions(id) on update cascade on delete cascade,
  source_issue_id uuid references public.issues(id) on update cascade on delete set null,
  
  -- Problem Information
  problem_title text not null check (length(btrim(problem_title)) > 0),
  problem_statement text not null check (length(btrim(problem_statement)) > 0),
  problem_category text not null check (length(btrim(problem_category)) > 0),
  root_cause text,
  affected_population text,
  geographic_context text,
  
  -- Research Information
  university_name text not null check (length(btrim(university_name)) > 0),
  research_objective text,
  methodology text,
  technical_approach text,
  
  -- Developed Solution & Prototype
  solution_title text not null check (length(btrim(solution_title)) > 0),
  solution_summary text not null check (length(btrim(solution_summary)) > 0),
  technologies_used text[] not null default '{}'::text[],
  required_infrastructure text[] not null default '{}'::text[],
  required_expertise text[] not null default '{}'::text[],
  
  -- Pilot & Validation References
  pilot_plan_id uuid references public.pilot_plans(id) on update cascade on delete set null,
  validation_result_id uuid references public.pilot_validation_results(id) on update cascade on delete set null,
  validation_kpis_summary jsonb not null default '[]'::jsonb,
  final_validation_outcome text,
  
  -- Deployment & Impact References
  deployment_plan_id uuid references public.deployment_plans(id) on update cascade on delete set null,
  deployment_impact_summary text,
  
  -- Reusability & Matching Attributes
  applicable_categories text[] not null default '{}'::text[],
  environmental_constraints text,
  known_limitations text,
  adaptation_requirements text,
  reusability_status text not null default 'ACTIVE_REUSABLE' check (
    reusability_status in ('ELIGIBLE', 'ACTIVE_REUSABLE', 'NEEDS_ADAPTATION', 'SUPERSEDED', 'ARCHIVED')
  ),
  evidence_links jsonb not null default '[]'::jsonb,
  reuse_count integer not null default 0 check (reuse_count >= 0),
  
  created_at timestamptz not null default now(),
  closed_at timestamptz not null default now(),
  
  constraint complex_solution_project_unique unique (project_id)
);

-- Indexes for complex_solution_knowledge_base
create index if not exists complex_solution_challenge_idx on public.complex_solution_knowledge_base (challenge_id);
create index if not exists complex_solution_project_idx on public.complex_solution_knowledge_base (project_id);
create index if not exists complex_solution_institution_idx on public.complex_solution_knowledge_base (institution_id);
create index if not exists complex_solution_category_idx on public.complex_solution_knowledge_base (problem_category);
create index if not exists complex_solution_reusability_idx on public.complex_solution_knowledge_base (reusability_status);
create index if not exists complex_solution_technologies_idx on public.complex_solution_knowledge_base using gin (technologies_used);
create index if not exists complex_solution_categories_idx on public.complex_solution_knowledge_base using gin (applicable_categories);

-- 4. Create simple_issue_recurrence_patterns table
create table if not exists public.simple_issue_recurrence_patterns (
  id uuid primary key default gen_random_uuid(),
  area_name text not null check (length(btrim(area_name)) > 0),
  category text not null check (length(btrim(category)) > 0),
  pattern_description text not null check (length(btrim(pattern_description)) > 0),
  occurrence_count integer not null check (occurrence_count >= 2),
  first_observed_at timestamptz not null,
  last_observed_at timestamptz not null,
  seasonal_window text,
  common_root_causes text[] not null default '{}'::text[],
  common_resolution_methods text[] not null default '{}'::text[],
  historical_issue_ids uuid[] not null default '{}'::uuid[],
  confidence text not null default 'MEDIUM' check (confidence in ('LOW', 'MEDIUM', 'HIGH')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'MONITORED', 'RESOLVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint recurrence_pattern_area_category_unique unique (area_name, category)
);

-- Indexes for simple_issue_recurrence_patterns
create index if not exists recurrence_patterns_area_cat_idx on public.simple_issue_recurrence_patterns (area_name, category);
create index if not exists recurrence_patterns_status_idx on public.simple_issue_recurrence_patterns (status);
create index if not exists recurrence_patterns_occurrence_idx on public.simple_issue_recurrence_patterns (occurrence_count desc);

-- 5. Create preventive_recommendations table
create table if not exists public.preventive_recommendations (
  id uuid primary key default gen_random_uuid(),
  pattern_id uuid references public.simple_issue_recurrence_patterns(id) on update cascade on delete set null,
  area_name text not null check (length(btrim(area_name)) > 0),
  category text not null check (length(btrim(category)) > 0),
  department_id uuid references public.departments(id) on update cascade on delete set null,
  department_name text,
  occurrence_count integer not null check (occurrence_count >= 2),
  seasonal_timing text,
  title text not null check (length(btrim(title)) > 0),
  recommended_action text not null check (length(btrim(recommended_action)) > 0),
  justification text not null check (length(btrim(justification)) > 0),
  historical_issue_ids uuid[] not null default '{}'::uuid[],
  status text not null default 'NEW' check (
    status in ('NEW', 'UNDER_REVIEW', 'ACKNOWLEDGED', 'ACTIONED', 'DISMISSED')
  ),
  reviewed_by uuid references public.profiles(id) on update cascade on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for preventive_recommendations
create index if not exists prev_rec_pattern_idx on public.preventive_recommendations (pattern_id);
create index if not exists prev_rec_area_cat_idx on public.preventive_recommendations (area_name, category);
create index if not exists prev_rec_status_idx on public.preventive_recommendations (status);
create index if not exists prev_rec_dept_idx on public.preventive_recommendations (department_id);

-- 6. Create complex_solution_reuse_reviews table
create table if not exists public.complex_solution_reuse_reviews (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.innovation_challenges(id) on update cascade on delete cascade,
  solution_kb_id uuid not null references public.complex_solution_knowledge_base(id) on update cascade on delete cascade,
  decision text not null check (decision in ('REUSE', 'ADAPT', 'NEW_RESEARCH')),
  match_scores jsonb not null default '{}'::jsonb,
  review_notes text not null check (length(btrim(review_notes)) >= 10),
  decision_by uuid not null references public.profiles(id) on update cascade on delete restrict,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Indexes for complex_solution_reuse_reviews
create index if not exists solution_reuse_challenge_idx on public.complex_solution_reuse_reviews (challenge_id);
create index if not exists solution_reuse_solution_idx on public.complex_solution_reuse_reviews (solution_kb_id);
create index if not exists solution_reuse_decision_idx on public.complex_solution_reuse_reviews (decision);

-- 7. Database Function: Helper to determine season from month
create or replace function public.get_season_for_date(p_date date)
returns text
language plpgsql
immutable
as $$
declare
  v_month integer := extract(month from p_date);
begin
  if v_month in (6, 7, 8, 9) then
    return 'MONSOON';
  elsif v_month in (10, 11) then
    return 'POST_MONSOON';
  elsif v_month in (12, 1, 2) then
    return 'WINTER';
  elsif v_month in (3, 4, 5) then
    return 'SUMMER';
  else
    return 'GENERAL';
  end if;
end;
$$;

-- 8. Database Function: Auto-populate simple_solution_knowledge_base & trigger recurrence evaluation
create or replace function public.process_simple_issue_solution_knowledge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issue record;
  v_verification record;
  v_before_imgs jsonb := '[]'::jsonb;
  v_after_imgs jsonb := '[]'::jsonb;
  v_root_cause text;
  v_factors text[] := '{}'::text[];
  v_res_summary text;
  v_res_method text;
  v_materials text[] := '{}'::text[];
  v_duration numeric(10, 2);
  v_area text;
  v_dept_name text;
  v_occ_date date;
  v_occ_month integer;
  v_season text;
  v_history_notes text;
  
  -- Recurrence computation variables
  v_count integer;
  v_first_obs timestamptz;
  v_last_obs timestamptz;
  v_hist_ids uuid[];
  v_causes text[];
  v_methods text[];
  v_pattern_id uuid;
begin
  -- Only process if the issue status is CITIZEN_VERIFIED
  if new.status is distinct from 'CITIZEN_VERIFIED'::public.issue_status then
    return new;
  end if;

  -- Ensure issue is classified as SIMPLE (or not classified as COMPLEX)
  if new.final_issue_type = 'COMPLEX' then
    return new;
  end if;

  select * into v_issue from public.issues where id = new.id;
  if not found then
    return new;
  end if;

  -- Verify citizen verification exists
  select * into v_verification 
  from public.resolution_verifications 
  where issue_id = new.id and result = 'VERIFIED'::public.verification_result
  order by created_at desc limit 1;

  -- Collect before and after images
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'storage_path', storage_path, 'image_type', image_type)), '[]'::jsonb)
  into v_before_imgs
  from public.issue_images
  where issue_id = new.id and image_type = 'INITIAL_REPORT';

  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'storage_path', storage_path, 'image_type', image_type)), '[]'::jsonb)
  into v_after_imgs
  from public.issue_images
  where issue_id = new.id and image_type = 'RESOLUTION_EVIDENCE';

  -- Extract department name if available
  if v_issue.department_id is not null then
    select name into v_dept_name from public.departments where id = v_issue.department_id;
  end if;

  -- Determine area name
  v_area := coalesce(
    nullif(btrim(v_issue.address_text), ''),
    nullif(btrim(v_issue.location_text), ''),
    'Central Ward'
  );

  -- Derive occurrence timing
  v_occ_date := (coalesce(v_issue.created_at, now()))::date;
  v_occ_month := extract(month from v_occ_date);
  v_season := public.get_season_for_date(v_occ_date);

  -- Resolution duration
  if v_issue.resolved_at is not null and v_issue.created_at is not null then
    v_duration := round(extract(epoch from (v_issue.resolved_at - v_issue.created_at)) / 3600.0, 2);
  else
    v_duration := null;
  end if;

  -- Extract latest notes from status history for resolution summary
  select notes into v_history_notes
  from public.issue_status_history
  where issue_id = new.id and new_status = 'RESOLVED'::public.issue_status
  order by created_at desc limit 1;

  v_res_summary := coalesce(
    v_history_notes,
    'Issue successfully resolved and confirmed by citizen verification.'
  );

  -- Attempt to get AI analysis root cause if present
  select 
    coalesce(classification_note, complexity_reasoning),
    array_remove(array[department_recommendation, priority_recommendation::text], null)
  into v_root_cause, v_factors
  from public.issue_ai_analysis
  where issue_id = new.id
  order by created_at desc limit 1;

  if v_root_cause is null then
    v_root_cause := 'Standard civic maintenance requirement resolved through departmental response.';
  end if;

  -- Upsert into simple_solution_knowledge_base
  insert into public.simple_solution_knowledge_base (
    source_issue_id,
    category,
    title,
    description,
    location_text,
    address_text,
    latitude,
    longitude,
    area_name,
    department_id,
    department_name,
    identified_root_cause,
    contributing_factors,
    resolution_summary,
    resolution_method,
    materials_used,
    resolution_duration_hours,
    before_evidence_images,
    after_evidence_images,
    citizen_verification_id,
    citizen_feedback,
    verified_at,
    occurrence_date,
    occurrence_month,
    occurrence_season,
    closed_at
  ) values (
    new.id,
    v_issue.category,
    v_issue.title,
    v_issue.description,
    v_issue.location_text,
    v_issue.address_text,
    v_issue.latitude,
    v_issue.longitude,
    v_area,
    v_issue.department_id,
    v_dept_name,
    v_root_cause,
    coalesce(v_factors, '{}'::text[]),
    v_res_summary,
    'Standard municipal maintenance procedure',
    '{}'::text[],
    v_duration,
    v_before_imgs,
    v_after_imgs,
    v_verification.id,
    v_verification.feedback,
    coalesce(v_verification.created_at, now()),
    v_occ_date,
    v_occ_month,
    v_season,
    coalesce(v_issue.resolved_at, now())
  )
  on conflict (source_issue_id) do update set
    category = excluded.category,
    title = excluded.title,
    description = excluded.description,
    location_text = excluded.location_text,
    address_text = excluded.address_text,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    area_name = excluded.area_name,
    department_id = excluded.department_id,
    department_name = excluded.department_name,
    resolution_summary = excluded.resolution_summary,
    before_evidence_images = excluded.before_evidence_images,
    after_evidence_images = excluded.after_evidence_images,
    citizen_verification_id = excluded.citizen_verification_id,
    citizen_feedback = excluded.citizen_feedback,
    verified_at = excluded.verified_at,
    closed_at = excluded.closed_at;

  -- -------------------------------------------------------------
  -- Recurrence Pattern Detection Logic
  -- -------------------------------------------------------------
  select 
    count(*),
    min(closed_at),
    max(closed_at),
    array_agg(source_issue_id),
    array_remove(array_agg(distinct identified_root_cause), null)
  into
    v_count,
    v_first_obs,
    v_last_obs,
    v_hist_ids,
    v_causes
  from public.simple_solution_knowledge_base
  where area_name = v_area and category = v_issue.category;

  if v_count >= 2 then
    insert into public.simple_issue_recurrence_patterns (
      area_name,
      category,
      pattern_description,
      occurrence_count,
      first_observed_at,
      last_observed_at,
      seasonal_window,
      common_root_causes,
      common_resolution_methods,
      historical_issue_ids,
      confidence,
      status,
      updated_at
    ) values (
      v_area,
      v_issue.category,
      format('Repeated %s issues observed in %s (%s occurrences recorded)', v_issue.category, v_area, v_count),
      v_count,
      v_first_obs,
      v_last_obs,
      v_season,
      coalesce(v_causes, '{}'::text[]),
      array['Standard departmental maintenance'],
      v_hist_ids,
      case when v_count >= 4 then 'HIGH' else 'MEDIUM' end,
      'ACTIVE',
      now()
    )
    on conflict (area_name, category) do update set
      occurrence_count = excluded.occurrence_count,
      first_observed_at = excluded.first_observed_at,
      last_observed_at = excluded.last_observed_at,
      seasonal_window = excluded.seasonal_window,
      common_root_causes = excluded.common_root_causes,
      historical_issue_ids = excluded.historical_issue_ids,
      confidence = excluded.confidence,
      pattern_description = format('Repeated %s issues observed in %s (%s occurrences recorded)', excluded.category, excluded.area_name, excluded.occurrence_count),
      updated_at = now()
    returning id into v_pattern_id;

    -- Upsert corresponding preventive recommendation
    insert into public.preventive_recommendations (
      pattern_id,
      area_name,
      category,
      department_id,
      department_name,
      occurrence_count,
      seasonal_timing,
      title,
      recommended_action,
      justification,
      historical_issue_ids,
      status,
      updated_at
    ) values (
      v_pattern_id,
      v_area,
      v_issue.category,
      v_issue.department_id,
      v_dept_name,
      v_count,
      format('Prior to %s period', v_season),
      format('Preventive %s Maintenance in %s', v_issue.category, v_area),
      format('Schedule proactive pre-emptive inspection and maintenance for %s infrastructure across %s to mitigate recurring seasonal failures.', v_issue.category, v_area),
      format('%s historical citizen-verified %s issues have been recorded in %s between %s and %s.', v_count, v_issue.category, v_area, v_first_obs::date, v_last_obs::date),
      v_hist_ids,
      'NEW',
      now()
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auto_create_simple_solution_kb on public.issues;
create trigger trg_auto_create_simple_solution_kb
after update of status on public.issues
for each row
execute function public.process_simple_issue_solution_knowledge();

-- 9. Invariant: Complex Solution Knowledge Base Eligibility Gating
create or replace function public.validate_complex_solution_knowledge_gating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_validation_status text;
  v_validation_outcome text;
  v_proj_inst uuid;
  v_proj_challenge uuid;
begin
  -- Verify project exists and get references
  select institution_id, challenge_id 
  into v_proj_inst, v_proj_challenge
  from public.challenge_projects
  where id = new.project_id;

  if not found then
    raise exception 'Cannot create complex solution knowledge record: referenced challenge project % does not exist.', new.project_id;
  end if;

  -- Verify project has an approved pilot validation result
  select status::text, final_outcome::text
  into v_validation_status, v_validation_outcome
  from public.pilot_validation_results
  where project_id = new.project_id
  order by created_at desc limit 1;

  if v_validation_status is distinct from 'APPROVED' then
    raise exception 'Cannot create complex solution knowledge record: Project % must have an APPROVED pilot validation result (current status: %)', new.project_id, coalesce(v_validation_status, 'NONE');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_complex_solution_gating on public.complex_solution_knowledge_base;
create trigger trg_enforce_complex_solution_gating
before insert or update of project_id, validation_result_id on public.complex_solution_knowledge_base
for each row
execute function public.validate_complex_solution_knowledge_gating();

-- 10. Invariant: Update reuse_count when solution reuse is approved
create or replace function public.handle_solution_reuse_review_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.decision = 'REUSE' then
    update public.complex_solution_knowledge_base
    set reuse_count = reuse_count + 1
    where id = new.solution_kb_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_handle_solution_reuse_review on public.complex_solution_reuse_reviews;
create trigger trg_handle_solution_reuse_review
after insert on public.complex_solution_reuse_reviews
for each row
execute function public.handle_solution_reuse_review_insert();

-- -------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------

-- Enable RLS
alter table public.simple_solution_knowledge_base enable row level security;
alter table public.complex_solution_knowledge_base enable row level security;
alter table public.simple_issue_recurrence_patterns enable row level security;
alter table public.preventive_recommendations enable row level security;
alter table public.complex_solution_reuse_reviews enable row level security;

-- A. simple_solution_knowledge_base policies
drop policy if exists "simple_solution_select_all" on public.simple_solution_knowledge_base;
create policy "simple_solution_select_all"
  on public.simple_solution_knowledge_base
  for select
  using (true);

drop policy if exists "simple_solution_manage_authenticated" on public.simple_solution_knowledge_base;
create policy "simple_solution_manage_authenticated"
  on public.simple_solution_knowledge_base
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- B. complex_solution_knowledge_base policies
drop policy if exists "complex_solution_select_all" on public.complex_solution_knowledge_base;
create policy "complex_solution_select_all"
  on public.complex_solution_knowledge_base
  for select
  using (true);

drop policy if exists "complex_solution_manage_authenticated" on public.complex_solution_knowledge_base;
create policy "complex_solution_manage_authenticated"
  on public.complex_solution_knowledge_base
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- C. simple_issue_recurrence_patterns policies
drop policy if exists "recurrence_patterns_select_all" on public.simple_issue_recurrence_patterns;
create policy "recurrence_patterns_select_all"
  on public.simple_issue_recurrence_patterns
  for select
  using (true);

drop policy if exists "recurrence_patterns_manage_authenticated" on public.simple_issue_recurrence_patterns;
create policy "recurrence_patterns_manage_authenticated"
  on public.simple_issue_recurrence_patterns
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- D. preventive_recommendations policies
drop policy if exists "prev_rec_select_all" on public.preventive_recommendations;
create policy "prev_rec_select_all"
  on public.preventive_recommendations
  for select
  using (true);

drop policy if exists "prev_rec_manage_authenticated" on public.preventive_recommendations;
create policy "prev_rec_manage_authenticated"
  on public.preventive_recommendations
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- E. complex_solution_reuse_reviews policies
drop policy if exists "solution_reuse_select_all" on public.complex_solution_reuse_reviews;
create policy "solution_reuse_select_all"
  on public.complex_solution_reuse_reviews
  for select
  using (true);

drop policy if exists "solution_reuse_manage_authenticated" on public.complex_solution_reuse_reviews;
create policy "solution_reuse_manage_authenticated"
  on public.complex_solution_reuse_reviews
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
