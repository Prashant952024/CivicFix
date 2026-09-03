-- Migration 0021: Debug helper to inspect exact database state of assignments and profiles

create or replace function public.debug_inspect_worker_system()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'roles', (
      select coalesce(jsonb_agg(r), '[]'::jsonb)
      from (select id, code, name from public.roles) r
    ),
    'departments', (
      select coalesce(jsonb_agg(d), '[]'::jsonb)
      from (select id, name, manager_profile_id, is_active from public.departments) d
    ),
    'profiles', (
      select coalesce(jsonb_agg(p), '[]'::jsonb)
      from (
        select p.id, p.clerk_user_id, p.full_name, p.email, p.employee_id, p.department_id, p.is_active, r.code as role_code
        from public.profiles p
        left join public.roles r on r.id = p.role_id
      ) p
    ),
    'issues', (
      select coalesce(jsonb_agg(i), '[]'::jsonb)
      from (
        select id, title, category, priority, status, department_id, reporter_profile_id, created_at, updated_at
        from public.issues
        order by created_at desc
      ) i
    ),
    'issue_department_assignments', (
      select coalesce(jsonb_agg(ida), '[]'::jsonb)
      from (
        select id, issue_id, department_id, assigned_by_profile_id, status, notes, assigned_at, created_at, updated_at
        from public.issue_department_assignments
        order by assigned_at desc
      ) ida
    ),
    'department_worker_assignments', (
      select coalesce(jsonb_agg(dwa), '[]'::jsonb)
      from (
        select id, issue_department_assignment_id, worker_profile_id, assigned_by_profile_id, status, notes, assigned_at, started_at, completed_at, created_at, updated_at
        from public.department_worker_assignments
        order by assigned_at desc
      ) dwa
    ),
    'legacy_issue_assignments', (
      select coalesce(jsonb_agg(ia), '[]'::jsonb)
      from (
        select id, issue_id, department_id, worker_id, assigned_by_profile_id, status, assigned_at, unassigned_at
        from public.issue_assignments
        order by assigned_at desc
      ) ia
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.debug_inspect_worker_system() to anon, authenticated;
