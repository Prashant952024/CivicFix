-- Migration 0043: CivicFix Phase 3D-4 Research & Prototype Development Workspace
-- 1. Add cadence & research stage columns to challenge_projects
-- 2. Create research_project_milestones
-- 3. Create research_progress_updates
-- 4. Create research_evidence
-- 5. Create research_blockers_risks
-- 6. Extend challenge_project_activity activity types
-- 7. Add milestone seeding helper function
-- 8. Configure strict Row Level Security (RLS) policies

-- 1. Add cadence & research stage columns to challenge_projects
alter table public.challenge_projects
  add column if not exists update_cadence_days integer not null default 5
    check (update_cadence_days >= 1 and update_cadence_days <= 90),
  add column if not exists research_stage text not null default 'RESEARCH_STARTED'
    check (research_stage in (
      'RESEARCH_STARTED',
      'PROTOTYPE_DEVELOPMENT',
      'PROTOTYPE_COMPLETED',
      'TESTING',
      'PILOT_READY',
      'PILOT_ACTIVE',
      'VALIDATION',
      'COMPLETED'
    ));

-- 2. Create research_project_milestones
create table if not exists public.research_project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  proposal_id uuid references public.research_proposals(id) on update cascade on delete set null,
  sequence_order integer not null default 1,
  title text not null check (length(btrim(title)) > 0),
  description text,
  status text not null default 'NOT_STARTED' check (status in (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'BLOCKED',
    'DELAYED',
    'CANCELLED'
  )),
  planned_start_date date,
  planned_completion_date date,
  actual_completion_date date,
  completion_percentage integer not null default 0 check (completion_percentage >= 0 and completion_percentage <= 100),
  deliverables jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_project_milestones_proj_seq_idx
  on public.research_project_milestones (project_id, sequence_order asc);

-- 3. Create research_progress_updates
create table if not exists public.research_progress_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  reporting_period_start date not null,
  reporting_period_end date not null,
  summary_completed text not null check (length(btrim(summary_completed)) > 0),
  current_findings text,
  milestone_id uuid references public.research_project_milestones(id) on update cascade on delete set null,
  milestone_progress_pct integer check (milestone_progress_pct is null or (milestone_progress_pct >= 0 and milestone_progress_pct <= 100)),
  next_planned_work text not null check (length(btrim(next_planned_work)) > 0),
  support_required text,
  support_category text check (support_category is null or support_category in (
    'HARDWARE',
    'DATA_ACCESS',
    'TESTBED',
    'REGULATORY',
    'FINANCIAL',
    'TECHNICAL_ADVISORY',
    'OTHER'
  )),
  submitted_by uuid references public.profiles(id) on update cascade on delete set null,
  submitted_at timestamptz not null default now(),
  manager_acknowledged_at timestamptz,
  manager_acknowledged_by uuid references public.profiles(id) on update cascade on delete set null,
  manager_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_progress_updates_proj_submitted_idx
  on public.research_progress_updates (project_id, submitted_at desc);

-- 4. Create research_evidence
create table if not exists public.research_evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  progress_update_id uuid references public.research_progress_updates(id) on update cascade on delete set null,
  milestone_id uuid references public.research_project_milestones(id) on update cascade on delete set null,
  title text not null check (length(btrim(title)) > 0),
  evidence_type text not null check (evidence_type in (
    'REPORT',
    'CODE_REPO',
    'DATASET',
    'IMAGE',
    'VIDEO',
    'DASHBOARD',
    'PUBLICATION',
    'PROTOTYPE_DOC',
    'OTHER'
  )),
  url text,
  file_path text,
  description text,
  uploaded_by uuid references public.profiles(id) on update cascade on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists research_evidence_proj_created_idx
  on public.research_evidence (project_id, created_at desc);

-- 5. Create research_blockers_risks
create table if not exists public.research_blockers_risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  item_type text not null check (item_type in ('BLOCKER', 'RISK')),
  title text not null check (length(btrim(title)) > 0),
  description text not null check (length(btrim(description)) > 0),
  severity text not null default 'MEDIUM' check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
  support_required text,
  reported_by uuid references public.profiles(id) on update cascade on delete set null,
  reported_at timestamptz not null default now(),
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_blockers_risks_proj_status_idx
  on public.research_blockers_risks (project_id, status, severity);

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
    'EXTERNAL_RESOURCE_ADDED'
  )
);

-- 7. Add milestone seeding helper function
create or replace function public.seed_milestones_from_approved_proposal(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal record;
  v_milestone record;
  v_order integer := 1;
  v_count integer := 0;
  v_existing_count integer;
begin
  -- Check if milestones already exist for this project
  select count(*) into v_existing_count
  from public.research_project_milestones
  where project_id = p_project_id;

  if v_existing_count > 0 then
    return 0;
  end if;

  -- Find current approved proposal for this project
  select * into v_proposal
  from public.research_proposals
  where project_id = p_project_id
    and status = 'APPROVED'
  order by version_number desc
  limit 1;

  if v_proposal.id is null then
    return 0;
  end if;

  -- If proposal has JSON array of milestones, iterate and seed
  if v_proposal.milestones is not null and jsonb_typeof(v_proposal.milestones) = 'array' then
    for v_milestone in
      select * from jsonb_to_recordset(v_proposal.milestones) as x(
        id text,
        name text,
        title text,
        description text,
        timeline text,
        expected_completion text,
        deliverables text
      )
    loop
      insert into public.research_project_milestones (
        project_id,
        proposal_id,
        sequence_order,
        title,
        description,
        status,
        completion_percentage,
        deliverables,
        notes
      ) values (
        p_project_id,
        v_proposal.id,
        v_order,
        coalesce(nullif(btrim(v_milestone.name), ''), nullif(btrim(v_milestone.title), ''), format('Milestone %s', v_order)),
        v_milestone.description,
        'NOT_STARTED',
        0,
        case 
          when v_milestone.deliverables is not null and length(btrim(v_milestone.deliverables)) > 0 then
            jsonb_build_array(jsonb_build_object('title', v_milestone.deliverables))
          else
            '[]'::jsonb
        end,
        case
          when v_milestone.expected_completion is not null then
            format('Expected: %s', v_milestone.expected_completion)
          when v_milestone.timeline is not null then
            format('Timeline: %s', v_milestone.timeline)
          else null
        end
      );
      v_order := v_order + 1;
      v_count := v_count + 1;
    end loop;
  end if;

  return v_count;
end;
$$;

-- 8. Row-Level Security (RLS) Policies

-- Enable RLS
alter table public.research_project_milestones enable row level security;
alter table public.research_progress_updates enable row level security;
alter table public.research_evidence enable row level security;
alter table public.research_blockers_risks enable row level security;

-- Helper to check whether project has an approved proposal
create or replace function public.project_has_approved_proposal(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.research_proposals
    where project_id = p_project_id
      and status = 'APPROVED'
  );
$$;

-- A. research_project_milestones policies
drop policy if exists research_project_milestones_select on public.research_project_milestones;
create policy research_project_milestones_select
on public.research_project_milestones
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or exists (
    select 1 from public.challenge_projects cp
    where cp.id = research_project_milestones.project_id
      and (
        cp.institution_id = public.current_user_institution_id()
        or cp.project_lead_profile_id = public.current_profile_id()
        or cp.created_by = public.current_profile_id()
        or public.can_manage_challenge_project(cp.id)
      )
  )
);

drop policy if exists research_project_milestones_insert on public.research_project_milestones;
create policy research_project_milestones_insert
on public.research_project_milestones
for insert
to authenticated
with check (
  public.project_has_approved_proposal(project_id)
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
    or public.can_manage_challenge_project(project_id)
  )
);

drop policy if exists research_project_milestones_update on public.research_project_milestones;
create policy research_project_milestones_update
on public.research_project_milestones
for update
to authenticated
using (
  public.project_has_approved_proposal(project_id)
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
    or public.can_manage_challenge_project(project_id)
  )
);

-- B. research_progress_updates policies
drop policy if exists research_progress_updates_select on public.research_progress_updates;
create policy research_progress_updates_select
on public.research_progress_updates
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or exists (
    select 1 from public.challenge_projects cp
    where cp.id = research_progress_updates.project_id
      and (
        cp.institution_id = public.current_user_institution_id()
        or cp.project_lead_profile_id = public.current_profile_id()
        or cp.created_by = public.current_profile_id()
        or public.can_manage_challenge_project(cp.id)
      )
  )
);

drop policy if exists research_progress_updates_insert on public.research_progress_updates;
create policy research_progress_updates_insert
on public.research_progress_updates
for insert
to authenticated
with check (
  public.project_has_approved_proposal(project_id)
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
    or public.can_manage_challenge_project(project_id)
  )
);

drop policy if exists research_progress_updates_update on public.research_progress_updates;
create policy research_progress_updates_update
on public.research_progress_updates
for update
to authenticated
using (
  public.project_has_approved_proposal(project_id)
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
    or public.can_manage_challenge_project(project_id)
  )
);

-- C. research_evidence policies
drop policy if exists research_evidence_select on public.research_evidence;
create policy research_evidence_select
on public.research_evidence
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or exists (
    select 1 from public.challenge_projects cp
    where cp.id = research_evidence.project_id
      and (
        cp.institution_id = public.current_user_institution_id()
        or cp.project_lead_profile_id = public.current_profile_id()
        or cp.created_by = public.current_profile_id()
        or public.can_manage_challenge_project(cp.id)
      )
  )
);

drop policy if exists research_evidence_insert on public.research_evidence;
create policy research_evidence_insert
on public.research_evidence
for insert
to authenticated
with check (
  public.project_has_approved_proposal(project_id)
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
    or public.can_manage_challenge_project(project_id)
  )
);

-- D. research_blockers_risks policies
drop policy if exists research_blockers_risks_select on public.research_blockers_risks;
create policy research_blockers_risks_select
on public.research_blockers_risks
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or exists (
    select 1 from public.challenge_projects cp
    where cp.id = research_blockers_risks.project_id
      and (
        cp.institution_id = public.current_user_institution_id()
        or cp.project_lead_profile_id = public.current_profile_id()
        or cp.created_by = public.current_profile_id()
        or public.can_manage_challenge_project(cp.id)
      )
  )
);

drop policy if exists research_blockers_risks_insert on public.research_blockers_risks;
create policy research_blockers_risks_insert
on public.research_blockers_risks
for insert
to authenticated
with check (
  public.project_has_approved_proposal(project_id)
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
    or public.can_manage_challenge_project(project_id)
  )
);

drop policy if exists research_blockers_risks_update on public.research_blockers_risks;
create policy research_blockers_risks_update
on public.research_blockers_risks
for update
to authenticated
using (
  public.project_has_approved_proposal(project_id)
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
    or public.can_manage_challenge_project(project_id)
  )
);
