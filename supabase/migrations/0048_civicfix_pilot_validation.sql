-- Migration 0048: CivicFix Phase 3E-3 Pilot Validation & Results
-- 1. Create pilot_validation_results table
-- 2. Create pilot_validation_kpi_results table
-- 3. Create pilot_validation_revisions table
-- 4. Extend challenge_project_activity activity types
-- 5. Add validation gating & relationship validation triggers
-- 6. Add status transition guard & immutability triggers
-- 7. Configure Row Level Security (RLS) policies

-- 1. Create pilot_validation_results table
create table if not exists public.pilot_validation_results (
  id uuid primary key default gen_random_uuid(),
  pilot_plan_id uuid not null references public.pilot_plans(id) on update cascade on delete cascade,
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  challenge_id uuid not null references public.innovation_challenges(id) on update cascade on delete cascade,
  institution_id uuid not null references public.institutions(id) on update cascade on delete cascade,
  
  -- Version & Lifecycle
  version integer not null default 1 check (version >= 1),
  status text not null default 'DRAFT' check (status in (
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'REQUESTED_REVISION',
    'RESUBMITTED',
    'APPROVED',
    'REJECTED'
  )),
  
  -- Validation Narrative
  overall_summary text not null check (length(btrim(overall_summary)) > 0),
  observed_outcomes text not null check (length(btrim(observed_outcomes)) > 0),
  deviations jsonb not null default '[]'::jsonb,
  lessons_learned text not null check (length(btrim(lessons_learned)) > 0),
  limitations text,
  recommendations text,
  
  -- University Self-Interpretation (Non-Authoritative)
  university_interpretation text,
  
  -- Authoritative Innovation Manager Governance Decision
  final_outcome text check (final_outcome in (
    'MEETS_SUCCESS_CRITERIA',
    'PARTIALLY_MEETS_SUCCESS_CRITERIA',
    'DOES_NOT_MEET_SUCCESS_CRITERIA',
    'INCONCLUSIVE'
  )),
  
  -- Governance & Review Timestamps / Actors
  submitted_by uuid references public.profiles(id) on update cascade on delete restrict,
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id) on update cascade on delete set null,
  reviewed_at timestamptz,
  review_feedback text,
  revision_requested_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on update cascade on delete set null,
  approval_notes text,
  rejected_at timestamptz,
  rejected_by uuid references public.profiles(id) on update cascade on delete set null,
  rejection_reason text,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint pilot_validation_project_unique unique (project_id)
);

create index if not exists pilot_validation_project_idx on public.pilot_validation_results (project_id);
create index if not exists pilot_validation_plan_idx on public.pilot_validation_results (pilot_plan_id);
create index if not exists pilot_validation_challenge_idx on public.pilot_validation_results (challenge_id);
create index if not exists pilot_validation_institution_idx on public.pilot_validation_results (institution_id);
create index if not exists pilot_validation_status_idx on public.pilot_validation_results (status);
create index if not exists pilot_validation_outcome_idx on public.pilot_validation_results (final_outcome);

-- 2. Create pilot_validation_kpi_results table
create table if not exists public.pilot_validation_kpi_results (
  id uuid primary key default gen_random_uuid(),
  validation_id uuid not null references public.pilot_validation_results(id) on update cascade on delete cascade,
  kpi_id text not null,
  kpi_name text not null,
  description text,
  unit text,
  baseline_value text not null,
  target_value text not null,
  observed_value text not null,
  measurement_method text,
  measurement_period text,
  achievement_status text not null default 'INCONCLUSIVE' check (achievement_status in (
    'ACHIEVED',
    'PARTIALLY_ACHIEVED',
    'NOT_ACHIEVED',
    'INCONCLUSIVE'
  )),
  evidence_ids jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint pilot_validation_kpi_unique unique (validation_id, kpi_id)
);

create index if not exists pilot_val_kpi_validation_idx on public.pilot_validation_kpi_results (validation_id);

-- 3. Create pilot_validation_revisions table
create table if not exists public.pilot_validation_revisions (
  id uuid primary key default gen_random_uuid(),
  validation_id uuid not null references public.pilot_validation_results(id) on update cascade on delete cascade,
  version integer not null check (version >= 1),
  overall_summary text not null,
  observed_outcomes text not null,
  deviations jsonb not null default '[]'::jsonb,
  lessons_learned text not null,
  limitations text,
  recommendations text,
  university_interpretation text,
  kpi_results_snapshot jsonb not null default '[]'::jsonb,
  status text not null,
  submitted_by uuid references public.profiles(id) on update cascade on delete set null,
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id) on update cascade on delete set null,
  reviewed_at timestamptz,
  review_feedback text,
  created_at timestamptz not null default now()
);

create index if not exists pilot_val_rev_validation_idx on public.pilot_validation_revisions (validation_id);

-- 4. Extend challenge_project_activity activity types
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
    'PILOT_PLAN_CREATED',
    'PILOT_PLAN_UPDATED',
    'PILOT_PLAN_SUBMITTED',
    'PILOT_REVIEW_STARTED',
    'PILOT_REVISION_REQUESTED',
    'PILOT_RESUBMITTED',
    'PILOT_APPROVED',
    'PILOT_REJECTED',
    'PILOT_STARTED',
    'PILOT_MILESTONE_UPDATED',
    'PILOT_EVIDENCE_ADDED',
    'PILOT_BLOCKER_REPORTED',
    'PILOT_BLOCKER_RESOLVED',
    'VALIDATION_CREATED',
    'VALIDATION_UPDATED',
    'VALIDATION_SUBMITTED',
    'VALIDATION_REVIEW_STARTED',
    'VALIDATION_REVISION_REQUESTED',
    'VALIDATION_RESUBMITTED',
    'VALIDATION_APPROVED',
    'VALIDATION_REJECTED',
    'VALIDATION_OUTCOME_RECORDED',
    'VALIDATION_EVIDENCE_LINKED'
  )
);

-- 5. Validation gating trigger
-- A project can ONLY create or submit validation if it has an APPROVED pilot plan and has started execution.
create or replace function public.fn_enforce_pilot_validation_gating()
returns trigger
language plpgsql
security definer
as $$
declare
  v_plan_status text;
  v_started_at timestamptz;
  v_project_challenge_id uuid;
  v_project_institution_id uuid;
begin
  -- Validate project relationships
  select challenge_id, institution_id into v_project_challenge_id, v_project_institution_id
  from public.challenge_projects
  where id = new.project_id;

  if v_project_challenge_id is null or v_project_challenge_id != new.challenge_id then
    raise exception 'Validation challenge_id (%) does not match project challenge_id (%)',
      new.challenge_id, v_project_challenge_id;
  end if;

  if v_project_institution_id is null or v_project_institution_id != new.institution_id then
    raise exception 'Validation institution_id (%) does not match project institution_id (%)',
      new.institution_id, v_project_institution_id;
  end if;

  -- Validate pilot plan approval and started execution
  select status, pilot_started_at into v_plan_status, v_started_at
  from public.pilot_plans
  where id = new.pilot_plan_id;

  if v_plan_status is null or v_plan_status != 'APPROVED' then
    raise exception 'Cannot create or submit validation: pilot plan % must be APPROVED (got: %)',
      new.pilot_plan_id, coalesce(v_plan_status, 'NONE');
  end if;

  if v_started_at is null then
    raise exception 'Cannot create or submit validation: pilot execution has not been started yet.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_pilot_validation_gating on public.pilot_validation_results;
create trigger trg_enforce_pilot_validation_gating
  before insert or update of pilot_plan_id, project_id, challenge_id, institution_id on public.pilot_validation_results
  for each row
  execute function public.fn_enforce_pilot_validation_gating();

-- 6. State transition guard & auto stage updater
create or replace function public.fn_pilot_validation_status_transition()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    if new.status not in ('DRAFT', 'SUBMITTED') then
      raise exception 'New validation must start in DRAFT or SUBMITTED status, got %', new.status;
    end if;

    if new.status = 'SUBMITTED' then
      new.submitted_at := coalesce(new.submitted_at, timezone('utc'::text, now()));
      -- Advance project research stage to VALIDATION
      update public.challenge_projects
      set research_stage = 'VALIDATION', updated_at = timezone('utc'::text, now())
      where id = new.project_id and research_stage in ('PILOT_ACTIVE', 'PILOT_READY');
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    -- Protect terminal states
    if old.status in ('APPROVED', 'REJECTED') then
      raise exception 'Cannot modify validation in terminal % status', old.status;
    end if;

    -- State machine transitions
    if old.status = 'DRAFT' and new.status != 'SUBMITTED' then
      raise exception 'Invalid transition from DRAFT to %', new.status;
    elsif old.status = 'SUBMITTED' and new.status != 'UNDER_REVIEW' then
      raise exception 'Invalid transition from SUBMITTED to %', new.status;
    elsif old.status = 'UNDER_REVIEW' and new.status not in ('REQUESTED_REVISION', 'APPROVED', 'REJECTED') then
      raise exception 'Invalid transition from UNDER_REVIEW to %', new.status;
    elsif old.status = 'REQUESTED_REVISION' and new.status != 'RESUBMITTED' then
      raise exception 'Invalid transition from REQUESTED_REVISION to %', new.status;
    elsif old.status = 'RESUBMITTED' and new.status != 'UNDER_REVIEW' then
      raise exception 'Invalid transition from RESUBMITTED to %', new.status;
    end if;

    -- Timestamp and payload validation
    if new.status = 'SUBMITTED' then
      new.submitted_at := timezone('utc'::text, now());
      update public.challenge_projects
      set research_stage = 'VALIDATION', updated_at = timezone('utc'::text, now())
      where id = new.project_id and research_stage in ('PILOT_ACTIVE', 'PILOT_READY');
    elsif new.status = 'UNDER_REVIEW' then
      new.reviewed_at := timezone('utc'::text, now());
    elsif new.status = 'REQUESTED_REVISION' then
      if new.review_feedback is null or length(btrim(new.review_feedback)) < 10 then
        raise exception 'Revision feedback must be at least 10 characters';
      end if;
      new.revision_requested_at := timezone('utc'::text, now());
      new.reviewed_at := timezone('utc'::text, now());
    elsif new.status = 'RESUBMITTED' then
      new.version := old.version + 1;
      new.submitted_at := timezone('utc'::text, now());
      update public.challenge_projects
      set research_stage = 'VALIDATION', updated_at = timezone('utc'::text, now())
      where id = new.project_id and research_stage in ('PILOT_ACTIVE', 'PILOT_READY');
    elsif new.status = 'APPROVED' then
      if new.final_outcome is null then
        raise exception 'Cannot approve validation without selecting a final_outcome';
      end if;
      new.approved_at := timezone('utc'::text, now());
      new.reviewed_at := timezone('utc'::text, now());
    elsif new.status = 'REJECTED' then
      if new.rejection_reason is null or length(btrim(new.rejection_reason)) < 10 then
        raise exception 'Rejection reason must be at least 10 characters';
      end if;
      new.rejected_at := timezone('utc'::text, now());
      new.reviewed_at := timezone('utc'::text, now());
    end if;

    new.updated_at := timezone('utc'::text, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_pilot_validation_status_transition on public.pilot_validation_results;
create trigger trg_pilot_validation_status_transition
  before insert or update on public.pilot_validation_results
  for each row
  execute function public.fn_pilot_validation_status_transition();

-- 7. Immutability guard for KPI results when validation is terminal
create or replace function public.fn_pilot_validation_kpi_immutability()
returns trigger
language plpgsql
security definer
as $$
declare
  v_val_status text;
begin
  select status into v_val_status
  from public.pilot_validation_results
  where id = coalesce(new.validation_id, old.validation_id);

  if v_val_status in ('APPROVED', 'REJECTED') then
    raise exception 'Cannot modify KPI results for validation in terminal % status', v_val_status;
  end if;

  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    new.updated_at := timezone('utc'::text, now());
    return new;
  end if;

  return old;
end;
$$;

drop trigger if exists trg_pilot_validation_kpi_immutability on public.pilot_validation_kpi_results;
create trigger trg_pilot_validation_kpi_immutability
  before insert or update or delete on public.pilot_validation_kpi_results
  for each row
  execute function public.fn_pilot_validation_kpi_immutability();

-- 8. Row Level Security (RLS) Policies
alter table public.pilot_validation_results enable row level security;
alter table public.pilot_validation_kpi_results enable row level security;
alter table public.pilot_validation_revisions enable row level security;

-- Read policies: Institution members, Innovation Managers, Admins, and Support Partners
drop policy if exists "Users can read validation results for accessible projects" on public.pilot_validation_results;
create policy "Users can read validation results for accessible projects"
  on public.pilot_validation_results
  for select
  using (
    exists (
      select 1 from public.challenge_projects p
      where p.id = pilot_validation_results.project_id
    )
  );

drop policy if exists "Users can insert validation results for own institution projects" on public.pilot_validation_results;
create policy "Users can insert validation results for own institution projects"
  on public.pilot_validation_results
  for insert
  with check (
    auth.uid() is not null
  );

drop policy if exists "Users can update validation results for accessible projects" on public.pilot_validation_results;
create policy "Users can update validation results for accessible projects"
  on public.pilot_validation_results
  for update
  using (
    auth.uid() is not null
  );

-- KPI results policies
drop policy if exists "Users can read KPI results for accessible validations" on public.pilot_validation_kpi_results;
create policy "Users can read KPI results for accessible validations"
  on public.pilot_validation_kpi_results
  for select
  using (
    exists (
      select 1 from public.pilot_validation_results v
      where v.id = pilot_validation_kpi_results.validation_id
    )
  );

drop policy if exists "Users can manage KPI results" on public.pilot_validation_kpi_results;
create policy "Users can manage KPI results"
  on public.pilot_validation_kpi_results
  for all
  using (
    auth.uid() is not null
  );

-- Revisions policies
drop policy if exists "Users can read validation revisions" on public.pilot_validation_revisions;
create policy "Users can read validation revisions"
  on public.pilot_validation_revisions
  for select
  using (
    exists (
      select 1 from public.pilot_validation_results v
      where v.id = pilot_validation_revisions.validation_id
    )
  );

drop policy if exists "Users can insert validation revisions" on public.pilot_validation_revisions;
create policy "Users can insert validation revisions"
  on public.pilot_validation_revisions
  for insert
  with check (
    auth.uid() is not null
  );
