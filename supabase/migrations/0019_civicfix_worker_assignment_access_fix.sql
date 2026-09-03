-- Migration 0019: Fix Worker Assignment Access, Profile Read Permissions, and Update Policies

-- 1. Ensure is_assigned_department_worker only matches active/completed worker assignments
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
      and dwa.status in ('ASSIGNED'::public.worker_assignment_status, 'IN_PROGRESS'::public.worker_assignment_status, 'COMPLETED'::public.worker_assignment_status)
  );
$$;

-- 2. Update issue_is_accessible to correctly resolve assigned workers
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
        and dwa.status in ('ASSIGNED'::public.worker_assignment_status, 'IN_PROGRESS'::public.worker_assignment_status, 'COMPLETED'::public.worker_assignment_status)
    )
    or public.issue_is_assigned_to_current_worker(target_issue_id);
$$;

-- 3. Allow field workers to view the profile of the staff/manager who assigned them
drop policy if exists profiles_select_worker_assigned_staff on public.profiles;
create policy profiles_select_worker_assigned_staff
on public.profiles
for select
to authenticated
using (
  public.current_user_has_role(array['FIELD_WORKER'::public.role_code])
  and (
    id in (
      select dwa.assigned_by_profile_id
      from public.department_worker_assignments dwa
      where dwa.worker_profile_id = public.current_profile_id()
    )
    or id in (
      select ia.assigned_by_profile_id
      from public.issue_assignments ia
      where ia.worker_id = public.current_profile_id()
        and ia.unassigned_at is null
    )
  )
);

-- 4. Update issue_department_assignments UPDATE policy so assigned workers can update status to IN_PROGRESS / UNDER_REVIEW
drop policy if exists issue_dept_update on public.issue_department_assignments;
create policy issue_dept_update
on public.issue_department_assignments
for update
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
  or public.is_assigned_department_manager(department_id, public.current_profile_id())
  or public.is_assigned_department_worker(id, public.current_profile_id())
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
  or public.is_assigned_department_manager(department_id, public.current_profile_id())
  or (
    public.is_assigned_department_worker(id, public.current_profile_id())
    and status in ('IN_PROGRESS'::public.department_assignment_status, 'UNDER_REVIEW'::public.department_assignment_status)
  )
);

-- 5. Update department_worker_assignments UPDATE policy
drop policy if exists dept_worker_update on public.department_worker_assignments;
create policy dept_worker_update
on public.department_worker_assignments
for update
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
  or worker_profile_id = public.current_profile_id()
  or public.dept_worker_assignment_is_accessible_to_manager(issue_department_assignment_id, public.current_profile_id())
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
  or (
    worker_profile_id = public.current_profile_id()
    and status in ('IN_PROGRESS'::public.worker_assignment_status, 'COMPLETED'::public.worker_assignment_status)
  )
  or public.dept_worker_assignment_is_accessible_to_manager(issue_department_assignment_id, public.current_profile_id())
);
