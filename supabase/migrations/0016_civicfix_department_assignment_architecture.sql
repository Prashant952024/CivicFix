-- Migration 0016: CivicFix Multi-Department & Department Manager Architecture
-- Supports: Municipal Officer -> Department(s) -> Department Manager -> Field Worker

-- 1. Insert Department Manager System Role
insert into public.roles (code, name, description, is_system_role)
values
  ('DEPARTMENT_MANAGER', 'Department Manager', 'Manages departmental tasks, dispatches field workers, and reviews work completion.', true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system_role = excluded.is_system_role,
  updated_at = now();

-- 2. Department Assignment & Worker Assignment Status Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'department_assignment_status') then
    create type public.department_assignment_status as enum (
      'ASSIGNED',
      'IN_PROGRESS',
      'UNDER_REVIEW',
      'COMPLETED',
      'REJECTED',
      'REOPENED'
    );
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'worker_assignment_status') then
    create type public.worker_assignment_status as enum (
      'ASSIGNED',
      'IN_PROGRESS',
      'COMPLETED',
      'REASSIGNED',
      'CANCELLED'
    );
  end if;
end;
$$;

-- 3. Extend departments table with manager_profile_id
alter table public.departments
  add column if not exists manager_profile_id uuid references public.profiles(id) on update cascade on delete set null;

-- Seed the 12 standard civic departments
insert into public.departments (name, description, is_active)
values
  ('Road & Infrastructure', 'Road construction, pothole repairs, bridges, footpaths, and street infrastructure maintenance.', true),
  ('Water Supply & Sewerage', 'Potable water pipelines, supply leakage, sewage systems, and wastewater management.', true),
  ('Waste Management', 'Solid waste collection, dump clearance, bio-waste disposal, and recycling operations.', true),
  ('Electricity & Street Lighting', 'Street lighting illumination, electrical poles, transformer hazards, and cabling issues.', true),
  ('Parks & Horticulture', 'Public parks, gardens, roadside tree maintenance, trimming, and green verge upkeep.', true),
  ('Public Health & Sanitation', 'Public hygiene, pest control, fogging, public toilet sanitation, and disease prevention.', true),
  ('Traffic & Transport', 'Traffic signals, road signage, pedestrian crossings, bus stops, and lane barricades.', true),
  ('Building & Urban Planning', 'Illegal encroachments, structural hazards, unauthorized construction, and civic zoning.', true),
  ('Stormwater & Flood Management', 'Monsoon drain clearing, culvert blockages, stormwater pumps, and flood mitigation.', true),
  ('Public Works', 'Municipal civic buildings, community centers, public assets, and general municipal civil works.', true),
  ('Fire & Emergency Services', 'Fire hazard safety, fire hydrant maintenance, and municipal emergency response readiness.', true),
  ('Animal Control', 'Stray animal welfare, rabies vaccination drives, livestock nuisance, and injured animal rescue.', true)
on conflict (name) do update
set
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

-- Seamlessly merge legacy department names into standard departments and re-link foreign keys
do $$
declare
  mapping record;
  legacy_row record;
  target_id uuid;
begin
  set local session_replication_role = 'replica';

  for mapping in
    select * from (values
      ('Roads', 'Road & Infrastructure'),
      ('Water', 'Water Supply & Sewerage'),
      ('Electricity', 'Electricity & Street Lighting'),
      ('Street Lighting', 'Electricity & Street Lighting'),
      ('Parks', 'Parks & Horticulture'),
      ('Sanitation', 'Public Health & Sanitation'),
      ('Drainage', 'Stormwater & Flood Management')
    ) as t(legacy_name, standard_name)
  loop
    select id into target_id from public.departments where name = mapping.standard_name limit 1;
    for legacy_row in select id from public.departments where name = mapping.legacy_name loop
      if target_id is not null and target_id <> legacy_row.id then
        update public.profiles set department_id = target_id where department_id = legacy_row.id;
        update public.issues set department_id = target_id where department_id = legacy_row.id;
        update public.issue_assignments set department_id = target_id where department_id = legacy_row.id;
        delete from public.departments where id = legacy_row.id;
      elsif target_id is null then
        update public.departments set name = mapping.standard_name where id = legacy_row.id;
        target_id := legacy_row.id;
      end if;
    end loop;
  end loop;

  set local session_replication_role = 'origin';
end;
$$;

-- 4. New Table: issue_department_assignments
create table if not exists public.issue_department_assignments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on update cascade on delete cascade,
  department_id uuid not null references public.departments(id) on update cascade on delete restrict,
  assigned_by_profile_id uuid not null references public.profiles(id) on update cascade on delete restrict,
  status public.department_assignment_status not null default 'ASSIGNED',
  notes text,
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint issue_dept_unique unique (issue_id, department_id)
);

create index if not exists idx_issue_dept_assignments_issue on public.issue_department_assignments (issue_id);
create index if not exists idx_issue_dept_assignments_dept on public.issue_department_assignments (department_id);
create index if not exists idx_issue_dept_assignments_status on public.issue_department_assignments (status);

-- 5. New Table: department_worker_assignments
create table if not exists public.department_worker_assignments (
  id uuid primary key default gen_random_uuid(),
  issue_department_assignment_id uuid not null references public.issue_department_assignments(id) on update cascade on delete cascade,
  worker_profile_id uuid not null references public.profiles(id) on update cascade on delete restrict,
  assigned_by_profile_id uuid not null references public.profiles(id) on update cascade on delete restrict,
  status public.worker_assignment_status not null default 'ASSIGNED',
  notes text,
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_dept_worker_active_assignment
  on public.department_worker_assignments (issue_department_assignment_id)
  where status in ('ASSIGNED', 'IN_PROGRESS');

create index if not exists idx_dept_worker_assignments_worker on public.department_worker_assignments (worker_profile_id);
create index if not exists idx_dept_worker_assignments_status on public.department_worker_assignments (status);

-- Triggers for updated_at
drop trigger if exists issue_dept_touch_updated_at on public.issue_department_assignments;
create trigger issue_dept_touch_updated_at
before update on public.issue_department_assignments
for each row execute function public.touch_updated_at();

drop trigger if exists dept_worker_touch_updated_at on public.department_worker_assignments;
create trigger dept_worker_touch_updated_at
before update on public.department_worker_assignments
for each row execute function public.touch_updated_at();

-- 6. Helper Functions for Security & Checks
create or replace function public.current_user_department_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.department_id
  from public.profiles p
  where p.id = public.current_profile_id()
  limit 1;
$$;

create or replace function public.current_user_is_department_manager(target_department_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = public.current_profile_id()
      and r.code = 'DEPARTMENT_MANAGER'::public.role_code
      and p.department_id = target_department_id
  );
$$;

-- 7. Update issue_is_assigned_to_current_worker to check new department_worker_assignments
create or replace function public.issue_is_assigned_to_current_worker(target_issue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.department_worker_assignments dwa
    join public.issue_department_assignments ida on ida.id = dwa.issue_department_assignment_id
    where ida.issue_id = target_issue_id
      and dwa.worker_profile_id = public.current_profile_id()
      and dwa.status in ('ASSIGNED'::public.worker_assignment_status, 'IN_PROGRESS'::public.worker_assignment_status, 'COMPLETED'::public.worker_assignment_status)
  ) or exists (
    select 1
    from public.issue_assignments ia
    where ia.issue_id = target_issue_id
      and ia.worker_id = public.current_profile_id()
      and ia.unassigned_at is null
  );
$$;

-- Update issue_is_accessible to include Department Managers for their department
create or replace function public.issue_is_accessible(target_issue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
    or exists (
      select 1
      from public.issues i
      where i.id = target_issue_id
        and i.reporter_profile_id = public.current_profile_id()
    )
    or exists (
      select 1
      from public.issue_department_assignments ida
      join public.profiles p on p.id = public.current_profile_id()
      join public.roles r on r.id = p.role_id
      where ida.issue_id = target_issue_id
        and r.code = 'DEPARTMENT_MANAGER'::public.role_code
        and ida.department_id = p.department_id
    )
    or public.issue_is_assigned_to_current_worker(target_issue_id);
$$;

-- 8. Backfill legacy issue_assignments into new architecture
insert into public.issue_department_assignments (
  issue_id,
  department_id,
  assigned_by_profile_id,
  status,
  assigned_at
)
select distinct on (ia.issue_id, ia.department_id)
  ia.issue_id,
  ia.department_id,
  ia.assigned_by_profile_id,
  case
    when i.status in ('RESOLVED', 'CITIZEN_VERIFIED') then 'COMPLETED'::public.department_assignment_status
    when i.status = 'UNDER_REVIEW' then 'UNDER_REVIEW'::public.department_assignment_status
    when i.status = 'IN_PROGRESS' then 'IN_PROGRESS'::public.department_assignment_status
    else 'ASSIGNED'::public.department_assignment_status
  end as status,
  ia.assigned_at
from public.issue_assignments ia
join public.issues i on i.id = ia.issue_id
where ia.department_id is not null
on conflict (issue_id, department_id) do nothing;

insert into public.department_worker_assignments (
  issue_department_assignment_id,
  worker_profile_id,
  assigned_by_profile_id,
  status,
  assigned_at
)
select
  ida.id,
  ia.worker_id,
  ia.assigned_by_profile_id,
  case
    when i.status in ('RESOLVED', 'CITIZEN_VERIFIED') then 'COMPLETED'::public.worker_assignment_status
    when i.status = 'IN_PROGRESS' then 'IN_PROGRESS'::public.worker_assignment_status
    else 'ASSIGNED'::public.worker_assignment_status
  end as status,
  ia.assigned_at
from public.issue_assignments ia
join public.issues i on i.id = ia.issue_id
join public.issue_department_assignments ida on ida.issue_id = ia.issue_id and ida.department_id = ia.department_id
where ia.worker_id is not null
  and ia.unassigned_at is null
on conflict do nothing;

-- 9. Validation Triggers for Assignments
-- Validate worker assignment: worker must belong to same department and have role FIELD_WORKER
create or replace function public.validate_department_worker_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_dept_id uuid;
  target_dept_active boolean;
  worker_dept_id uuid;
  worker_role public.role_code;
begin
  select ida.department_id, d.is_active
  into target_dept_id, target_dept_active
  from public.issue_department_assignments ida
  join public.departments d on d.id = ida.department_id
  where ida.id = new.issue_department_assignment_id
  limit 1;

  if target_dept_id is null then
    raise exception 'Department task not found.';
  end if;

  if not target_dept_active then
    raise exception 'Cannot assign workers in an inactive department.';
  end if;

  select p.department_id, r.code
  into worker_dept_id, worker_role
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = new.worker_profile_id
  limit 1;

  if worker_role is distinct from 'FIELD_WORKER'::public.role_code then
    raise exception 'Assigned user must be a Field Worker.';
  end if;

  if worker_dept_id is distinct from target_dept_id then
    raise exception 'Worker must belong to the department of this task.';
  end if;

  return new;
end;
$$;

drop trigger if exists check_dept_worker_assignment on public.department_worker_assignments;
create trigger check_dept_worker_assignment
before insert or update of worker_profile_id on public.department_worker_assignments
for each row execute function public.validate_department_worker_assignment();

-- Validate department assignment: department must be active
create or replace function public.validate_issue_department_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dept_active boolean;
begin
  select d.is_active
  into dept_active
  from public.departments d
  where d.id = new.department_id
  limit 1;

  if dept_active is distinct from true then
    raise exception 'Cannot assign issues to an inactive department.';
  end if;

  return new;
end;
$$;

drop trigger if exists check_issue_dept_assignment on public.issue_department_assignments;
create trigger check_issue_dept_assignment
before insert or update of department_id on public.issue_department_assignments
for each row execute function public.validate_issue_department_assignment();

-- 10. Row Level Security for new tables
alter table public.issue_department_assignments enable row level security;
alter table public.department_worker_assignments enable row level security;

-- Policies for issue_department_assignments
drop policy if exists issue_dept_select on public.issue_department_assignments;
create policy issue_dept_select
on public.issue_department_assignments
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
  or (
    public.current_user_has_role(array['DEPARTMENT_MANAGER'::public.role_code])
    and department_id = public.current_user_department_id()
  )
  or exists (
    select 1
    from public.issues i
    where i.id = issue_id
      and i.reporter_profile_id = public.current_profile_id()
  )
  or exists (
    select 1
    from public.department_worker_assignments dwa
    where dwa.issue_department_assignment_id = id
      and dwa.worker_profile_id = public.current_profile_id()
  )
);

drop policy if exists issue_dept_insert_officer_admin on public.issue_department_assignments;
create policy issue_dept_insert_officer_admin
on public.issue_department_assignments
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
);

drop policy if exists issue_dept_update on public.issue_department_assignments;
create policy issue_dept_update
on public.issue_department_assignments
for update
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
  or (
    public.current_user_has_role(array['DEPARTMENT_MANAGER'::public.role_code])
    and department_id = public.current_user_department_id()
  )
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
  or (
    public.current_user_has_role(array['DEPARTMENT_MANAGER'::public.role_code])
    and department_id = public.current_user_department_id()
  )
);

drop policy if exists issue_dept_delete_admin on public.issue_department_assignments;
create policy issue_dept_delete_admin
on public.issue_department_assignments
for delete
to authenticated
using (public.current_user_has_role(array['ADMIN'::public.role_code]));

-- Policies for department_worker_assignments
drop policy if exists dept_worker_select on public.department_worker_assignments;
create policy dept_worker_select
on public.department_worker_assignments
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
  or worker_profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.issue_department_assignments ida
    where ida.id = issue_department_assignment_id
      and ida.department_id = public.current_user_department_id()
      and public.current_user_has_role(array['DEPARTMENT_MANAGER'::public.role_code])
  )
);

drop policy if exists dept_worker_insert on public.department_worker_assignments;
create policy dept_worker_insert
on public.department_worker_assignments
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code])
  or exists (
    select 1
    from public.issue_department_assignments ida
    where ida.id = issue_department_assignment_id
      and ida.department_id = public.current_user_department_id()
      and public.current_user_has_role(array['DEPARTMENT_MANAGER'::public.role_code])
  )
);

drop policy if exists dept_worker_update on public.department_worker_assignments;
create policy dept_worker_update
on public.department_worker_assignments
for update
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code])
  or worker_profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.issue_department_assignments ida
    where ida.id = issue_department_assignment_id
      and ida.department_id = public.current_user_department_id()
      and public.current_user_has_role(array['DEPARTMENT_MANAGER'::public.role_code])
  )
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code])
  or (
    worker_profile_id = public.current_profile_id()
    and status in ('IN_PROGRESS'::public.worker_assignment_status, 'COMPLETED'::public.worker_assignment_status)
  )
  or exists (
    select 1
    from public.issue_department_assignments ida
    where ida.id = issue_department_assignment_id
      and ida.department_id = public.current_user_department_id()
      and public.current_user_has_role(array['DEPARTMENT_MANAGER'::public.role_code])
  )
);

-- 11. Update profiles select policy so Department Managers can see workers in their department
drop policy if exists profiles_select_manager_department on public.profiles;
create policy profiles_select_manager_department
on public.profiles
for select
to authenticated
using (
  public.current_user_has_role(array['DEPARTMENT_MANAGER'::public.role_code])
  and department_id = public.current_user_department_id()
);

-- 12. Concurrency-Safe Transition Guard Supporting Multi-Department Flow
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

  -- Municipal Officer & Admin Transitions
  if public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code]) then
    if current_status in ('SUBMITTED'::public.issue_status, 'AI_ANALYZED'::public.issue_status)
      and new.new_status = 'VERIFIED'::public.issue_status then
      return new;
    end if;

    if current_status in ('VERIFIED'::public.issue_status, 'REOPENED'::public.issue_status)
      and new.new_status = 'ASSIGNED'::public.issue_status then
      return new;
    end if;

    if current_status in ('ASSIGNED'::public.issue_status, 'IN_PROGRESS'::public.issue_status, 'PARTIALLY_COMPLETED'::public.issue_status, 'UNDER_REVIEW'::public.issue_status)
      and new.new_status in ('RESOLVED'::public.issue_status, 'REJECTED'::public.issue_status, 'PARTIALLY_COMPLETED'::public.issue_status, 'UNDER_REVIEW'::public.issue_status) then
      return new;
    end if;

    if current_status in ('SUBMITTED'::public.issue_status, 'AI_ANALYZED'::public.issue_status, 'VERIFIED'::public.issue_status)
      and new.new_status = 'REJECTED'::public.issue_status then
      return new;
    end if;
  end if;

  -- Department Manager Transitions
  if public.current_user_has_role(array['DEPARTMENT_MANAGER'::public.role_code]) then
    if exists (
      select 1
      from public.issue_department_assignments ida
      where ida.issue_id = new.issue_id
        and ida.department_id = public.current_user_department_id()
    ) and new.new_status in ('IN_PROGRESS'::public.issue_status, 'PARTIALLY_COMPLETED'::public.issue_status, 'UNDER_REVIEW'::public.issue_status) then
      return new;
    end if;
  end if;

  -- Field Worker Transitions
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

  -- Citizen Transitions
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

  raise exception 'Invalid issue status transition from % to %.', current_status, new.new_status
    using errcode = '23514';
end;
$$;
