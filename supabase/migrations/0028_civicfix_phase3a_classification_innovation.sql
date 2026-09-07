-- Migration 0028: CivicFix Phase 3A AI Classification, Admin Routing & Innovation Manager Architecture
-- Implements:
-- 1. INNOVATION_MANAGER system role in public.roles
-- 2. AI recommendation fields on public.issues and public.issue_ai_analysis
-- 3. Admin authoritative classification decision fields on public.issues
-- 4. public.innovation_challenges foundation table
-- 5. Updated issue_is_accessible and validate_issue_status_history_transition guards
-- 6. Enforced Admin authority trigger on classification updates

-- 1. Insert INNOVATION_MANAGER System Role
insert into public.roles (code, name, description, is_system_role)
values
  ('INNOVATION_MANAGER', 'Innovation Manager', 'Oversees complex societal challenges, problem formulation, and innovation ecosystem collaboration.', true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system_role = excluded.is_system_role,
  updated_at = now();

-- 2. Extend public.issues with AI and Admin classification fields
alter table public.issues
  add column if not exists ai_issue_type text check (ai_issue_type is null or ai_issue_type in ('SIMPLE', 'COMPLEX')),
  add column if not exists ai_complexity_score integer check (ai_complexity_score is null or (ai_complexity_score between 0 and 100)),
  add column if not exists ai_complexity_reasoning text,
  add column if not exists ai_required_expertise text[] not null default '{}',
  add column if not exists ai_classification_confidence numeric(5, 4) check (ai_classification_confidence is null or (ai_classification_confidence between 0 and 1)),
  add column if not exists final_issue_type text check (final_issue_type is null or final_issue_type in ('SIMPLE', 'COMPLEX')),
  add column if not exists classification_decided_by uuid references public.profiles(id) on update cascade on delete set null,
  add column if not exists classification_decided_at timestamptz,
  add column if not exists classification_override_reason text;

create index if not exists issues_final_issue_type_idx on public.issues (final_issue_type);
create index if not exists issues_ai_issue_type_idx on public.issues (ai_issue_type);
create index if not exists issues_awaiting_classification_idx on public.issues (status) where status = 'AWAITING_ADMIN_CLASSIFICATION';

-- 3. Extend public.issue_ai_analysis with complexity attributes
alter table public.issue_ai_analysis
  add column if not exists issue_type text check (issue_type is null or issue_type in ('SIMPLE', 'COMPLEX')),
  add column if not exists complexity_score integer check (complexity_score is null or (complexity_score between 0 and 100)),
  add column if not exists complexity_reasoning text,
  add column if not exists required_expertise text[] not null default '{}',
  add column if not exists classification_confidence numeric(5, 4) check (classification_confidence is null or (classification_confidence between 0 and 1));

-- 4. Create Foundation Table: public.innovation_challenges
create table if not exists public.innovation_challenges (
  id uuid primary key default gen_random_uuid(),
  source_issue_id uuid not null references public.issues(id) on update cascade on delete cascade,
  title text not null,
  problem_statement text not null,
  category text not null,
  complexity_score integer check (complexity_score is null or (complexity_score between 0 and 100)),
  required_expertise text[] not null default '{}',
  affected_population text,
  geographic_scope text,
  status text not null default 'OPEN_FOR_PROPOSALS' check (status in ('DRAFT', 'OPEN_FOR_PROPOSALS', 'PILOT_ACTIVE', 'SOLVED', 'ARCHIVED')),
  created_by uuid not null references public.profiles(id) on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint innovation_challenges_title_not_blank check (length(btrim(title)) > 0),
  constraint innovation_challenges_problem_statement_not_blank check (length(btrim(problem_statement)) > 0)
);

create index if not exists innovation_challenges_issue_idx on public.innovation_challenges (source_issue_id);
create index if not exists innovation_challenges_status_idx on public.innovation_challenges (status);
create index if not exists innovation_challenges_created_by_idx on public.innovation_challenges (created_by);

-- Enable RLS on innovation_challenges
alter table public.innovation_challenges enable row level security;

drop policy if exists innovation_challenges_select_authenticated on public.innovation_challenges;
create policy innovation_challenges_select_authenticated
on public.innovation_challenges
for select
to authenticated
using (true);

drop policy if exists innovation_challenges_insert_manager_admin on public.innovation_challenges;
create policy innovation_challenges_insert_manager_admin
on public.innovation_challenges
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  and created_by = public.current_profile_id()
);

drop policy if exists innovation_challenges_update_manager_admin on public.innovation_challenges;
create policy innovation_challenges_update_manager_admin
on public.innovation_challenges
for update
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
);

-- 5. Update issue_is_accessible
create or replace function public.issue_is_accessible(target_issue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- Admin has access to all issues
    public.current_user_has_role(array['ADMIN'::public.role_code])
    -- Innovation Manager can access complex issues and challenges
    or (
      public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
      and exists (
        select 1 from public.issues i
        where i.id = target_issue_id
          and (i.final_issue_type = 'COMPLEX' or i.status = 'CLASSIFIED_COMPLEX'::public.issue_status or i.ai_issue_type = 'COMPLEX')
      )
    )
    -- Municipal Officer accesses non-complex issues
    or (
      public.current_user_has_role(array['MUNICIPAL_OFFICER'::public.role_code])
      and exists (
        select 1 from public.issues i
        where i.id = target_issue_id
          and (i.status <> 'CLASSIFIED_COMPLEX'::public.issue_status and (i.final_issue_type is null or i.final_issue_type <> 'COMPLEX'))
      )
    )
    -- Citizen reporter accesses own issue
    or exists (
      select 1
      from public.issues i
      where i.id = target_issue_id
        and i.reporter_profile_id = public.current_profile_id()
    )
    -- Department Manager accesses department assignments
    or exists (
      select 1
      from public.issue_department_assignments ida
      join public.profiles p on p.id = public.current_profile_id()
      join public.roles r on r.id = p.role_id
      where ida.issue_id = target_issue_id
        and r.code = 'DEPARTMENT_MANAGER'::public.role_code
        and ida.department_id = p.department_id
    )
    -- Assigned Field Worker accesses assigned issue
    or exists (
      select 1
      from public.department_worker_assignments dwa
      join public.issue_department_assignments ida on ida.id = dwa.issue_department_assignment_id
      where ida.issue_id = target_issue_id
        and dwa.worker_profile_id = public.current_profile_id()
        and dwa.status in ('ASSIGNED'::public.worker_assignment_status, 'IN_PROGRESS'::public.worker_assignment_status, 'COMPLETED'::public.worker_assignment_status)
    )
    or public.issue_is_assigned_to_current_worker(target_issue_id);
$$;

-- 6. Enforce Admin Authority Trigger on Issue Classification
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
     or (new.status in ('CLASSIFIED_SIMPLE'::public.issue_status, 'CLASSIFIED_COMPLEX'::public.issue_status)
         and old.status not in ('CLASSIFIED_SIMPLE'::public.issue_status, 'CLASSIFIED_COMPLEX'::public.issue_status))
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

drop trigger if exists issues_enforce_classification_authority on public.issues;
create trigger issues_enforce_classification_authority
before update on public.issues
for each row
execute function public.enforce_issue_classification_authority();

-- 7. Update validate_issue_status_history_transition()
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
    -- Classification transitions
    if current_status in ('SUBMITTED'::public.issue_status, 'AI_ANALYZED'::public.issue_status)
       and new.new_status = 'AWAITING_ADMIN_CLASSIFICATION'::public.issue_status then
      return new;
    end if;

    if current_status in ('AWAITING_ADMIN_CLASSIFICATION'::public.issue_status, 'AI_ANALYZED'::public.issue_status, 'SUBMITTED'::public.issue_status)
       and new.new_status in ('CLASSIFIED_SIMPLE'::public.issue_status, 'CLASSIFIED_COMPLEX'::public.issue_status, 'REJECTED'::public.issue_status) then
      return new;
    end if;

    if current_status in ('CLASSIFIED_SIMPLE'::public.issue_status, 'VERIFIED'::public.issue_status, 'REOPENED'::public.issue_status)
       and new.new_status in ('ASSIGNED'::public.issue_status, 'VERIFIED'::public.issue_status, 'REJECTED'::public.issue_status, 'CLASSIFIED_COMPLEX'::public.issue_status) then
      return new;
    end if;

    if current_status = 'CLASSIFIED_COMPLEX'::public.issue_status
       and new.new_status in ('CLASSIFIED_SIMPLE'::public.issue_status, 'REJECTED'::public.issue_status) then
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
       and new.new_status = 'ASSIGNED'::public.issue_status then
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
