-- CivicFix Migration 0049: Phase 3E-4 Deployment & Impact Tracking
-- Implements deployment readiness assessment, scale-up planning, large-scale deployment tracking, impact metrics, periodic impact reports, and human-in-the-loop governance.

-- 1. Extend challenge_projects research_stage check constraint to include deployment and impact stages
alter table public.challenge_projects drop constraint if exists challenge_projects_research_stage_check;
alter table public.challenge_projects add constraint challenge_projects_research_stage_check check (
  research_stage in (
    'RESEARCH_STARTED',
    'PROTOTYPE_DEVELOPMENT',
    'PROTOTYPE_COMPLETED',
    'TESTING',
    'PILOT_READY',
    'PILOT_ACTIVE',
    'VALIDATION',
    'DEPLOYMENT_READY',
    'DEPLOYMENT_ACTIVE',
    'IMPACT_MONITORING',
    'COMPLETED'
  )
);

-- 2. Create deployment_plans table
create table if not exists public.deployment_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  pilot_plan_id uuid not null references public.pilot_plans(id) on update cascade on delete cascade,
  validation_id uuid not null references public.pilot_validation_results(id) on update cascade on delete cascade,
  challenge_id uuid not null references public.innovation_challenges(id) on update cascade on delete cascade,
  institution_id uuid not null references public.institutions(id) on update cascade on delete cascade,
  created_by uuid not null references public.profiles(id) on update cascade on delete restrict,
  
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
  deployment_decision text check (deployment_decision in (
    'PENDING_REVIEW',
    'APPROVED_FOR_SCALE_UP',
    'REQUESTED_REVISION',
    'NOT_READY',
    'REJECTED'
  )),
  
  -- Deployment Scope & Strategy
  title text not null check (length(btrim(title)) > 0),
  summary text not null check (length(btrim(summary)) > 0),
  deployment_scope text not null check (length(btrim(deployment_scope)) > 0),
  target_geography text not null check (length(btrim(target_geography)) > 0),
  target_population text not null check (length(btrim(target_population)) > 0),
  scale_multiplier text,
  deployment_phases jsonb not null default '[]'::jsonb,
  
  -- Readiness Assessments
  technical_readiness text not null check (length(btrim(technical_readiness)) > 0),
  operational_readiness text not null check (length(btrim(operational_readiness)) > 0),
  funding_requirements text,
  hardware_requirements text,
  technology_requirements text,
  human_resource_requirements text,
  infrastructure_requirements text,
  training_plan text,
  maintenance_plan text,
  risk_management_plan text not null check (length(btrim(risk_management_plan)) > 0),
  
  -- Timeline
  planned_start_date date not null,
  planned_end_date date not null check (planned_end_date >= planned_start_date),
  estimated_duration_days integer not null default 90 check (estimated_duration_days > 0),
  deployment_started_at timestamptz,
  deployment_completed_at timestamptz,
  
  -- Human Governance & Decision Fields
  submitted_by uuid references public.profiles(id) on update cascade on delete set null,
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id) on update cascade on delete set null,
  reviewed_at timestamptz,
  review_feedback text,
  revision_requested_at timestamptz,
  approved_by uuid references public.profiles(id) on update cascade on delete set null,
  approved_at timestamptz,
  approval_notes text,
  rejected_by uuid references public.profiles(id) on update cascade on delete set null,
  rejected_at timestamptz,
  rejection_reason text,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint deployment_plans_project_unique unique (project_id)
);

create index if not exists deployment_plans_project_idx on public.deployment_plans (project_id);
create index if not exists deployment_plans_validation_idx on public.deployment_plans (validation_id);
create index if not exists deployment_plans_challenge_idx on public.deployment_plans (challenge_id);
create index if not exists deployment_plans_institution_idx on public.deployment_plans (institution_id);
create index if not exists deployment_plans_status_idx on public.deployment_plans (status);

-- 3. Create deployment_impact_metrics table
create table if not exists public.deployment_impact_metrics (
  id uuid primary key default gen_random_uuid(),
  deployment_plan_id uuid not null references public.deployment_plans(id) on update cascade on delete cascade,
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  metric_name text not null check (length(btrim(metric_name)) > 0),
  description text,
  unit text,
  baseline_value text not null check (length(btrim(baseline_value)) > 0),
  target_value text not null check (length(btrim(target_value)) > 0),
  observed_value text not null default '',
  measurement_period text,
  measurement_method text,
  data_source text,
  evidence_ids jsonb not null default '[]'::jsonb,
  status text not null default 'PENDING' check (status in (
    'PENDING',
    'ON_TRACK',
    'SURPASSED',
    'BELOW_TARGET',
    'INCONCLUSIVE'
  )),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deployment_impact_metrics_plan_idx on public.deployment_impact_metrics (deployment_plan_id);
create index if not exists deployment_impact_metrics_project_idx on public.deployment_impact_metrics (project_id);

-- 4. Create deployment_impact_reports table (Periodic impact reporting)
create table if not exists public.deployment_impact_reports (
  id uuid primary key default gen_random_uuid(),
  deployment_plan_id uuid not null references public.deployment_plans(id) on update cascade on delete cascade,
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  reporting_period text not null check (length(btrim(reporting_period)) > 0),
  period_start_date date not null,
  period_end_date date not null check (period_end_date >= period_start_date),
  key_findings text not null check (length(btrim(key_findings)) > 0),
  deployment_progress_summary text not null check (length(btrim(deployment_progress_summary)) > 0),
  metric_measurements jsonb not null default '[]'::jsonb,
  unexpected_effects text,
  emerging_risks text,
  corrective_actions text,
  next_steps text,
  evidence_ids jsonb not null default '[]'::jsonb,
  submitted_by uuid references public.profiles(id) on update cascade on delete set null,
  submitted_at timestamptz not null default now(),
  acknowledged_by uuid references public.profiles(id) on update cascade on delete set null,
  acknowledged_at timestamptz,
  acknowledgement_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deployment_impact_reports_plan_idx on public.deployment_impact_reports (deployment_plan_id);
create index if not exists deployment_impact_reports_project_idx on public.deployment_impact_reports (project_id);

-- 5. Create deployment_plan_revisions table (Immutable version snapshots)
create table if not exists public.deployment_plan_revisions (
  id uuid primary key default gen_random_uuid(),
  deployment_plan_id uuid not null references public.deployment_plans(id) on update cascade on delete cascade,
  version integer not null check (version >= 1),
  title text not null,
  summary text not null,
  deployment_scope text not null,
  target_geography text not null,
  target_population text not null,
  scale_multiplier text,
  deployment_phases jsonb not null default '[]'::jsonb,
  technical_readiness text not null,
  operational_readiness text not null,
  funding_requirements text,
  hardware_requirements text,
  technology_requirements text,
  human_resource_requirements text,
  infrastructure_requirements text,
  training_plan text,
  maintenance_plan text,
  risk_management_plan text not null,
  impact_metrics_snapshot jsonb not null default '[]'::jsonb,
  status text not null,
  deployment_decision text,
  submitted_by uuid references public.profiles(id) on update cascade on delete set null,
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id) on update cascade on delete set null,
  reviewed_at timestamptz,
  review_feedback text,
  created_at timestamptz not null default now()
);

create index if not exists deployment_plan_rev_plan_idx on public.deployment_plan_revisions (deployment_plan_id);

-- 6. Extend challenge_project_activity activity types
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
    'VALIDATION_EVIDENCE_LINKED',
    'DEPLOYMENT_PLAN_CREATED',
    'DEPLOYMENT_PLAN_UPDATED',
    'DEPLOYMENT_PLAN_SUBMITTED',
    'DEPLOYMENT_REVIEW_STARTED',
    'DEPLOYMENT_REVISION_REQUESTED',
    'DEPLOYMENT_RESUBMITTED',
    'DEPLOYMENT_APPROVED',
    'DEPLOYMENT_REJECTED',
    'DEPLOYMENT_STARTED',
    'DEPLOYMENT_COMPLETED',
    'IMPACT_REPORT_SUBMITTED',
    'IMPACT_REPORT_ACKNOWLEDGED',
    'IMPACT_METRIC_UPDATED'
  )
);

-- 7. Deployment Gating Trigger
-- A project can ONLY create or submit a deployment plan if its pilot validation result is APPROVED and has a valid final_outcome.
create or replace function public.fn_enforce_deployment_gating()
returns trigger
language plpgsql
security definer
as $$
declare
  v_val_status text;
  v_final_outcome text;
  v_project_challenge_id uuid;
  v_project_institution_id uuid;
begin
  -- Validate project relationships
  select challenge_id, institution_id into v_project_challenge_id, v_project_institution_id
  from public.challenge_projects
  where id = new.project_id;

  if v_project_challenge_id is null or v_project_challenge_id != new.challenge_id then
    raise exception 'Deployment plan challenge_id (%) does not match project challenge_id (%)',
      new.challenge_id, v_project_challenge_id;
  end if;

  if v_project_institution_id is null or v_project_institution_id != new.institution_id then
    raise exception 'Deployment plan institution_id (%) does not match project institution_id (%)',
      new.institution_id, v_project_institution_id;
  end if;

  -- Validate pilot validation approval and final outcome
  select status, final_outcome into v_val_status, v_final_outcome
  from public.pilot_validation_results
  where id = new.validation_id;

  if v_val_status is null or v_val_status != 'APPROVED' then
    raise exception 'Cannot create deployment plan: Pilot validation % must be APPROVED (got: %)',
      new.validation_id, coalesce(v_val_status, 'NONE');
  end if;

  if v_final_outcome is null then
    raise exception 'Cannot create deployment plan: Pilot validation must have an authoritative final outcome recorded.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_deployment_gating on public.deployment_plans;
create trigger trg_enforce_deployment_gating
  before insert or update of validation_id, project_id, challenge_id, institution_id on public.deployment_plans
  for each row
  execute function public.fn_enforce_deployment_gating();

-- 8. Deployment Plan Status Transition Guard & Auto Research Stage Updater
create or replace function public.fn_deployment_plan_status_transition()
returns trigger
language plpgsql
security definer
as $$
declare
  v_lead_id uuid;
begin
  if tg_op = 'INSERT' then
    if new.status not in ('DRAFT', 'SUBMITTED') then
      raise exception 'New deployment plan must start in DRAFT or SUBMITTED status, got %', new.status;
    end if;

    if new.status = 'SUBMITTED' then
      new.submitted_at := coalesce(new.submitted_at, timezone('utc'::text, now()));
      new.deployment_decision := 'PENDING_REVIEW';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    -- Protect terminal approved/rejected states from silent status reverts
    if old.status in ('APPROVED', 'REJECTED') then
      raise exception 'Cannot modify deployment plan in terminal % status', old.status;
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

    -- Self-approval prevention
    select project_lead_profile_id into v_lead_id
    from public.challenge_projects
    where id = new.project_id;

    if new.status in ('APPROVED', 'REJECTED') and new.approved_by is not null and new.approved_by = v_lead_id then
      raise exception 'University project lead cannot approve or reject their own deployment plan.';
    end if;

    -- Timestamp and payload validation
    if new.status = 'SUBMITTED' then
      new.submitted_at := timezone('utc'::text, now());
      new.deployment_decision := 'PENDING_REVIEW';
    elsif new.status = 'UNDER_REVIEW' then
      new.reviewed_at := timezone('utc'::text, now());
      new.deployment_decision := 'PENDING_REVIEW';
    elsif new.status = 'REQUESTED_REVISION' then
      if new.review_feedback is null or length(btrim(new.review_feedback)) < 10 then
        raise exception 'Revision feedback must be at least 10 characters';
      end if;
      new.revision_requested_at := timezone('utc'::text, now());
      new.reviewed_at := timezone('utc'::text, now());
      new.deployment_decision := 'REQUESTED_REVISION';
    elsif new.status = 'RESUBMITTED' then
      new.version := old.version + 1;
      new.submitted_at := timezone('utc'::text, now());
      new.deployment_decision := 'PENDING_REVIEW';
    elsif new.status = 'APPROVED' then
      new.approved_at := timezone('utc'::text, now());
      new.reviewed_at := timezone('utc'::text, now());
      new.deployment_decision := coalesce(new.deployment_decision, 'APPROVED_FOR_SCALE_UP');
      -- Advance project research stage to DEPLOYMENT_READY
      update public.challenge_projects
      set research_stage = 'DEPLOYMENT_READY', updated_at = timezone('utc'::text, now())
      where id = new.project_id and research_stage in ('VALIDATION', 'PILOT_ACTIVE', 'PILOT_READY');
    elsif new.status = 'REJECTED' then
      if new.rejection_reason is null or length(btrim(new.rejection_reason)) < 10 then
        raise exception 'Rejection reason must be at least 10 characters';
      end if;
      new.rejected_at := timezone('utc'::text, now());
      new.reviewed_at := timezone('utc'::text, now());
      new.deployment_decision := 'REJECTED';
    end if;

    new.updated_at := timezone('utc'::text, now());
  end if;

  -- Deployment Execution stage advance when started
  if tg_op = 'UPDATE' and old.deployment_started_at is null and new.deployment_started_at is not null then
    if new.status != 'APPROVED' then
      raise exception 'Cannot start large-scale deployment before deployment plan is APPROVED';
    end if;
    update public.challenge_projects
    set research_stage = 'DEPLOYMENT_ACTIVE', updated_at = timezone('utc'::text, now())
    where id = new.project_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_deployment_plan_status_transition on public.deployment_plans;
create trigger trg_deployment_plan_status_transition
  before insert or update on public.deployment_plans
  for each row
  execute function public.fn_deployment_plan_status_transition();

-- 9. Auto Advance Stage on Impact Reports
create or replace function public.fn_advance_stage_on_impact_report()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.challenge_projects
  set research_stage = 'IMPACT_MONITORING', updated_at = timezone('utc'::text, now())
  where id = new.project_id and research_stage in ('DEPLOYMENT_READY', 'DEPLOYMENT_ACTIVE');
  return new;
end;
$$;

drop trigger if exists trg_advance_stage_on_impact_report on public.deployment_impact_reports;
create trigger trg_advance_stage_on_impact_report
  after insert on public.deployment_impact_reports
  for each row
  execute function public.fn_advance_stage_on_impact_report();

-- 10. Immutability guard for deployment plans and metrics in approved state
create or replace function public.fn_deployment_plan_immutability()
returns trigger
language plpgsql
security definer
as $$
begin
  if old.status = 'APPROVED' and new.status = 'APPROVED' then
    -- Allow updating execution runtime fields (started_at, completed_at)
    if (old.title is distinct from new.title) or
       (old.summary is distinct from new.summary) or
       (old.deployment_scope is distinct from new.deployment_scope) or
       (old.target_geography is distinct from new.target_geography) or
       (old.target_population is distinct from new.target_population) or
       (old.technical_readiness is distinct from new.technical_readiness) or
       (old.operational_readiness is distinct from new.operational_readiness) or
       (old.risk_management_plan is distinct from new.risk_management_plan) then
      raise exception 'Approved deployment plans are immutable. Modifications require a formal revision cycle.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_deployment_plan_immutability on public.deployment_plans;
create trigger trg_deployment_plan_immutability
  before update on public.deployment_plans
  for each row
  execute function public.fn_deployment_plan_immutability();

-- 11. Row Level Security (RLS)
alter table public.deployment_plans enable row level security;
alter table public.deployment_impact_metrics enable row level security;
alter table public.deployment_impact_reports enable row level security;
alter table public.deployment_plan_revisions enable row level security;

-- Deployment plans policies
drop policy if exists "Users can read deployment plans for accessible projects" on public.deployment_plans;
create policy "Users can read deployment plans for accessible projects"
  on public.deployment_plans
  for select
  using (
    exists (
      select 1 from public.challenge_projects p
      where p.id = deployment_plans.project_id
    )
  );

drop policy if exists "Users can insert deployment plans" on public.deployment_plans;
create policy "Users can insert deployment plans"
  on public.deployment_plans
  for insert
  with check (
    auth.uid() is not null
  );

drop policy if exists "Users can update deployment plans" on public.deployment_plans;
create policy "Users can update deployment plans"
  on public.deployment_plans
  for update
  using (
    auth.uid() is not null
  );

-- Impact metrics policies
drop policy if exists "Users can read impact metrics for accessible projects" on public.deployment_impact_metrics;
create policy "Users can read impact metrics for accessible projects"
  on public.deployment_impact_metrics
  for select
  using (
    exists (
      select 1 from public.deployment_plans dp
      where dp.id = deployment_impact_metrics.deployment_plan_id
    )
  );

drop policy if exists "Users can manage impact metrics" on public.deployment_impact_metrics;
create policy "Users can manage impact metrics"
  on public.deployment_impact_metrics
  for all
  using (
    auth.uid() is not null
  );

-- Impact reports policies
drop policy if exists "Users can read impact reports for accessible projects" on public.deployment_impact_reports;
create policy "Users can read impact reports for accessible projects"
  on public.deployment_impact_reports
  for select
  using (
    exists (
      select 1 from public.deployment_plans dp
      where dp.id = deployment_impact_reports.deployment_plan_id
    )
  );

drop policy if exists "Users can manage impact reports" on public.deployment_impact_reports;
create policy "Users can manage impact reports"
  on public.deployment_impact_reports
  for all
  using (
    auth.uid() is not null
  );

-- Revisions policies
drop policy if exists "Users can read deployment revisions" on public.deployment_plan_revisions;
create policy "Users can read deployment revisions"
  on public.deployment_plan_revisions
  for select
  using (
    exists (
      select 1 from public.deployment_plans dp
      where dp.id = deployment_plan_revisions.deployment_plan_id
    )
  );

drop policy if exists "Users can insert deployment revisions" on public.deployment_plan_revisions;
create policy "Users can insert deployment revisions"
  on public.deployment_plan_revisions
  for insert
  with check (
    auth.uid() is not null
  );
