-- Migration 0018: Fix infinite recursion in issue_department_assignments and department_worker_assignments RLS policies

-- 1. Create security definer helper functions to isolate subqueries from RLS policy loops

create or replace function public.is_issue_reporter(p_issue_id uuid, p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.issues i
    where i.id = p_issue_id
      and i.reporter_profile_id = p_profile_id
  );
$$;

create or replace function public.is_assigned_department_worker(p_issue_dept_assignment_id uuid, p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.department_worker_assignments dwa
    where dwa.issue_department_assignment_id = p_issue_dept_assignment_id
      and dwa.worker_profile_id = p_profile_id
  );
$$;

create or replace function public.is_assigned_department_manager(p_department_id uuid, p_profile_id uuid)
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
    where p.id = p_profile_id
      and r.code = 'DEPARTMENT_MANAGER'::public.role_code
      and p.department_id = p_department_id
  );
$$;

create or replace function public.dept_worker_assignment_is_accessible_to_manager(p_issue_dept_assignment_id uuid, p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.issue_department_assignments ida
    join public.profiles p on p.id = p_profile_id
    join public.roles r on r.id = p.role_id
    where ida.id = p_issue_dept_assignment_id
      and r.code = 'DEPARTMENT_MANAGER'::public.role_code
      and ida.department_id = p.department_id
  );
$$;

-- 2. Update issue_is_accessible to also use non-recursive checks
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
    or exists (
      select 1
      from public.department_worker_assignments dwa
      join public.issue_department_assignments ida on ida.id = dwa.issue_department_assignment_id
      where ida.issue_id = target_issue_id
        and dwa.worker_profile_id = public.current_profile_id()
    )
    or public.issue_is_assigned_to_current_worker(target_issue_id);
$$;

-- 3. Replace issue_department_assignments select policy with non-recursive version
drop policy if exists issue_dept_select on public.issue_department_assignments;
create policy issue_dept_select
on public.issue_department_assignments
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
  or public.is_assigned_department_manager(department_id, public.current_profile_id())
  or public.is_issue_reporter(issue_id, public.current_profile_id())
  or public.is_assigned_department_worker(id, public.current_profile_id())
);

-- 4. Replace department_worker_assignments select policy with non-recursive version
drop policy if exists dept_worker_select on public.department_worker_assignments;
create policy dept_worker_select
on public.department_worker_assignments
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
  or worker_profile_id = public.current_profile_id()
  or public.dept_worker_assignment_is_accessible_to_manager(issue_department_assignment_id, public.current_profile_id())
);

-- 5. Replace department_worker_assignments insert policy with non-recursive version
drop policy if exists dept_worker_insert on public.department_worker_assignments;
create policy dept_worker_insert
on public.department_worker_assignments
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code])
  or public.dept_worker_assignment_is_accessible_to_manager(issue_department_assignment_id, public.current_profile_id())
);
