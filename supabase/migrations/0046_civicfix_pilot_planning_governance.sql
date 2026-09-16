-- Migration 0046: CivicFix Phase 3E-1 Pilot Planning & Governance
-- 1. Create pilot_plans table
-- 2. Create pilot_plan_revisions table
-- 3. Extend challenge_project_activity activity types
-- 4. Proposal gating & relationship validation triggers
-- 5. Status transition guard & research stage updater
-- 6. Configure Row Level Security (RLS) policies

-- 1. Create pilot_plans table
create table if not exists public.pilot_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  challenge_id uuid not null references public.innovation_challenges(id) on update cascade on delete cascade,
  institution_id uuid not null references public.institutions(id) on update cascade on delete cascade,
  created_by uuid not null references public.profiles(id) on update cascade on delete restrict,
  
  -- Pilot Identity & Objective
  title text not null check (length(btrim(title)) > 0),
  summary text not null check (length(btrim(summary)) > 0),
  objective text not null check (length(btrim(objective)) > 0),
  research_hypothesis text not null check (length(btrim(research_hypothesis)) > 0),
  
  -- Pilot Environment
  test_environment_type text not null default 'LAB' check (test_environment_type in (
    'LAB',
    'CAMPUS',
    'FIELD_SITE',
    'AGRICULTURAL_SITE',
    'PARTNER_SITE',
    'INDUSTRIAL_SITE',
    'COMMUNITY_SITE',
    'PUBLIC_ENVIRONMENT',
    'DIGITAL_ENVIRONMENT',
    'SIMULATION',
    'OTHER'
  )),
  test_environment_description text not null check (length(btrim(test_environment_description)) > 0),
  location_description text not null check (length(btrim(location_description)) > 0),
  
  -- Timeline
  planned_start_date date not null,
  planned_end_date date not null check (planned_end_date >= planned_start_date),
  estimated_duration_days integer not null default 30 check (estimated_duration_days > 0),
  
  -- Baseline & KPIs
  baseline_description text not null check (length(btrim(baseline_description)) > 0),
  baseline_metrics jsonb not null default '{}'::jsonb,
  kpis jsonb not null default '[]'::jsonb,
  success_criteria text not null check (length(btrim(success_criteria)) > 0),
  
  -- Participants
  participant_description text,
  participant_count integer default 0 check (participant_count >= 0),
  participant_selection_method text,
  
  -- Risks, Safety & Ethics
  risk_and_safety_considerations text not null check (length(btrim(risk_and_safety_considerations)) > 0),
  risk_mitigation_plan text not null check (length(btrim(risk_mitigation_plan)) > 0),
  ethical_considerations text,
  
  -- Versioning & Status
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
  
  -- Governance & Review Fields
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on update cascade on delete set null,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on update cascade on delete set null,
  approval_notes text,
  rejected_at timestamptz,
  rejected_by uuid references public.profiles(id) on update cascade on delete set null,
  rejection_reason text,
  revision_requested_at timestamptz,
  revision_feedback text,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint pilot_plans_project_unique unique (project_id)
);

create index if not exists pilot_plans_project_idx on public.pilot_plans (project_id);
create index if not exists pilot_plans_challenge_idx on public.pilot_plans (challenge_id);
create index if not exists pilot_plans_institution_idx on public.pilot_plans (institution_id);
create index if not exists pilot_plans_status_idx on public.pilot_plans (status);

-- 2. Create pilot_plan_revisions table
create table if not exists public.pilot_plan_revisions (
  id uuid primary key default gen_random_uuid(),
  pilot_plan_id uuid not null references public.pilot_plans(id) on update cascade on delete cascade,
  version integer not null check (version >= 1),
  title text not null,
  summary text not null,
  objective text not null,
  research_hypothesis text not null,
  test_environment_type text not null,
  test_environment_description text not null,
  location_description text not null,
  planned_start_date date not null,
  planned_end_date date not null,
  estimated_duration_days integer not null,
  baseline_description text not null,
  baseline_metrics jsonb not null default '{}'::jsonb,
  kpis jsonb not null default '[]'::jsonb,
  success_criteria text not null,
  participant_description text,
  participant_count integer default 0,
  participant_selection_method text,
  risk_and_safety_considerations text not null,
  risk_mitigation_plan text not null,
  ethical_considerations text,
  status text not null,
  submitted_by uuid references public.profiles(id) on update cascade on delete set null,
  submitted_at timestamptz not null default now(),
  feedback text,
  reviewed_by uuid references public.profiles(id) on update cascade on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pilot_plan_revisions_plan_ver_idx 
  on public.pilot_plan_revisions (pilot_plan_id, version desc);

-- 3. Extend challenge_project_activity activity types
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
    'RESEARCH_STARTED',
    'MILESTONE_CREATED',
    'MILESTONE_UPDATED',
    'MILESTONE_COMPLETED',
    'PROGRESS_UPDATE_SUBMITTED',
    'PROGRESS_UPDATE_ACKNOWLEDGED',
    'EVIDENCE_ADDED',
    'BLOCKER_REPORTED',
    'BLOCKER_RESOLVED',
    'RISK_REPORTED',
    'RISK_UPDATED',
    'EXTERNAL_RESOURCE_ADDED',
    'SUPPORT_REQUEST_CREATED',
    'SUPPORT_REQUEST_SUBMITTED',
    'SUPPORT_REQUEST_APPROVED',
    'SUPPORT_REQUEST_PUBLISHED',
    'SUPPORT_APPLICATION_SUBMITTED',
    'SUPPORT_APPLICATION_REVIEWED',
    'SUPPORT_APPLICATION_ACCEPTED',
    'SUPPORT_APPLICATION_REJECTED',
    'SUPPORT_PARTNER_SELECTED',
    'SUPPORT_REQUEST_FULFILLED',
    'PILOT_PLAN_CREATED',
    'PILOT_PLAN_UPDATED',
    'PILOT_PLAN_SUBMITTED',
    'PILOT_REVIEW_STARTED',
    'PILOT_REVISION_REQUESTED',
    'PILOT_RESUBMITTED',
    'PILOT_APPROVED',
    'PILOT_REJECTED'
  )
);

-- 4. Proposal gating & relationship validation trigger
create or replace function public.enforce_pilot_plan_proposal_gating()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_proj_challenge uuid;
  v_proj_inst uuid;
  v_has_approved boolean;
begin
  -- Validate project existence and get canonical challenge and institution
  select challenge_id, institution_id into v_proj_challenge, v_proj_inst
  from public.challenge_projects
  where id = new.project_id;

  if v_proj_challenge is null then
    raise exception 'Project % does not exist', new.project_id;
  end if;

  -- Ensure exact hierarchy alignment
  if new.challenge_id <> v_proj_challenge then
    raise exception 'Challenge ID % does not match project challenge %', new.challenge_id, v_proj_challenge;
  end if;

  if new.institution_id <> v_proj_inst then
    raise exception 'Institution ID % does not match project institution %', new.institution_id, v_proj_inst;
  end if;

  -- Verify approved proposal exists
  v_has_approved := public.project_has_approved_proposal(new.project_id);
  if not v_has_approved then
    raise exception 'Pilot plan creation requires an approved research proposal for project %', new.project_id;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_enforce_pilot_plan_proposal_gating on public.pilot_plans;
create trigger trg_enforce_pilot_plan_proposal_gating
before insert or update on public.pilot_plans
for each row execute function public.enforce_pilot_plan_proposal_gating();

-- 5. Status transition guard & research stage updater
create or replace function public.handle_pilot_plan_status_transition()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- If status did not change, return
  if tg_op = 'UPDATE' and old.status = new.status then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('DRAFT', 'SUBMITTED') then
      raise exception 'New pilot plan must start in DRAFT or SUBMITTED status, got %', new.status;
    end if;
    if new.status = 'SUBMITTED' then
      new.submitted_at := now();
    end if;
    return new;
  end if;

  -- Validate state machine transitions
  if old.status = 'DRAFT' and new.status not in ('DRAFT', 'SUBMITTED') then
    raise exception 'Invalid transition from DRAFT to %', new.status;
  elsif old.status = 'SUBMITTED' and new.status not in ('UNDER_REVIEW', 'DRAFT') then
    raise exception 'Invalid transition from SUBMITTED to %', new.status;
  elsif old.status = 'UNDER_REVIEW' and new.status not in ('REQUESTED_REVISION', 'APPROVED', 'REJECTED', 'UNDER_REVIEW') then
    raise exception 'Invalid transition from UNDER_REVIEW to %', new.status;
  elsif old.status = 'REQUESTED_REVISION' and new.status not in ('RESUBMITTED', 'REQUESTED_REVISION') then
    raise exception 'Invalid transition from REQUESTED_REVISION to %', new.status;
  elsif old.status = 'RESUBMITTED' and new.status not in ('UNDER_REVIEW', 'RESUBMITTED') then
    raise exception 'Invalid transition from RESUBMITTED to %', new.status;
  elsif old.status in ('APPROVED', 'REJECTED') and new.status <> old.status then
    raise exception 'Pilot plan in terminal state % cannot be transitioned to %', old.status, new.status;
  end if;

  -- Timestamps and side effects
  if new.status = 'SUBMITTED' then
    new.submitted_at := now();
  elsif new.status = 'UNDER_REVIEW' then
    new.reviewed_at := now();
  elsif new.status = 'REQUESTED_REVISION' then
    if new.revision_feedback is null or length(btrim(new.revision_feedback)) < 10 then
      raise exception 'Revision request requires at least 10 characters of actionable feedback';
    end if;
    new.revision_requested_at := now();
  elsif new.status = 'RESUBMITTED' then
    new.submitted_at := now();
    new.version := old.version + 1;
  elsif new.status = 'REJECTED' then
    if new.rejection_reason is null or length(btrim(new.rejection_reason)) < 10 then
      raise exception 'Rejection requires at least 10 characters of explanation';
    end if;
    new.rejected_at := now();
  elsif new.status = 'APPROVED' then
    new.approved_at := now();
    -- Update research stage of project to PILOT_READY
    update public.challenge_projects
    set research_stage = 'PILOT_READY',
        updated_at = now()
    where id = new.project_id
      and research_stage in ('RESEARCH_STARTED', 'PROTOTYPE_DEVELOPMENT', 'PROTOTYPE_COMPLETED', 'TESTING');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_handle_pilot_plan_status_transition on public.pilot_plans;
create trigger trg_handle_pilot_plan_status_transition
before insert or update on public.pilot_plans
for each row execute function public.handle_pilot_plan_status_transition();

-- 6. Configure Row Level Security (RLS) policies
alter table public.pilot_plans enable row level security;
alter table public.pilot_plan_revisions enable row level security;

-- 6A. pilot_plans Read Policy
drop policy if exists "pilot_plans_read_policy" on public.pilot_plans;
create policy "pilot_plans_read_policy"
on public.pilot_plans
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or institution_id = public.current_user_institution_id()
  or public.can_manage_challenge_project(project_id)
  or (
    status in ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'RESUBMITTED') and
    exists (
      select 1 from public.project_support_partners psp
      join public.profiles p on p.organization_id = psp.organization_id
      where psp.project_id = public.pilot_plans.project_id
        and p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
);

-- 6B. pilot_plans Insert Policy (University Project Managers or Innovation Manager/Admin)
drop policy if exists "pilot_plans_insert_policy" on public.pilot_plans;
create policy "pilot_plans_insert_policy"
on public.pilot_plans
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project(project_id)
);

-- 6C. pilot_plans Update Policy
drop policy if exists "pilot_plans_update_policy" on public.pilot_plans;
create policy "pilot_plans_update_policy"
on public.pilot_plans
for update
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or (
    public.can_manage_challenge_project(project_id)
    and status in ('DRAFT', 'REQUESTED_REVISION')
  )
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or (
    public.can_manage_challenge_project(project_id)
  )
);

-- 6D. pilot_plans Delete Policy (Prohibited to protect audit history)
drop policy if exists "pilot_plans_delete_policy" on public.pilot_plans;
create policy "pilot_plans_delete_policy"
on public.pilot_plans
for delete
to authenticated
using (false);

-- 6E. pilot_plan_revisions RLS
drop policy if exists "pilot_plan_revisions_read_policy" on public.pilot_plan_revisions;
create policy "pilot_plan_revisions_read_policy"
on public.pilot_plan_revisions
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or exists (
    select 1 from public.pilot_plans pp
    where pp.id = public.pilot_plan_revisions.pilot_plan_id
      and (
        pp.institution_id = public.current_user_institution_id()
        or public.can_manage_challenge_project(pp.project_id)
      )
  )
);

drop policy if exists "pilot_plan_revisions_insert_policy" on public.pilot_plan_revisions;
create policy "pilot_plan_revisions_insert_policy"
on public.pilot_plan_revisions
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or exists (
    select 1 from public.pilot_plans pp
    where pp.id = public.pilot_plan_revisions.pilot_plan_id
      and public.can_manage_challenge_project(pp.project_id)
  )
);
