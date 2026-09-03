-- Migration 0023: Test function simulating authenticated worker session
create or replace function public.debug_simulate_worker_query(p_clerk_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  worker_prof_id uuid;
  result jsonb;
begin
  -- Look up worker profile
  select id into worker_prof_id
  from public.profiles
  where clerk_user_id = p_clerk_user_id;

  if worker_prof_id is null then
    return jsonb_build_object('error', 'Profile not found for clerk_user_id');
  end if;

  -- Test evaluation of issue_is_accessible and current_profile_id
  select jsonb_build_object(
    'worker_profile_id', worker_prof_id,
    'assignments_found', (
      select coalesce(jsonb_agg(dwa), '[]'::jsonb)
      from (
        select
          dwa.id,
          dwa.issue_department_assignment_id,
          dwa.worker_profile_id,
          dwa.status,
          dwa.assigned_at,
          ida.id as issue_dept_id,
          ida.status as dept_status,
          i.id as issue_id,
          i.title as issue_title,
          i.status as issue_status,
          d.name as department_name,
          p_mgr.full_name as assigned_by_name
        from public.department_worker_assignments dwa
        join public.issue_department_assignments ida on ida.id = dwa.issue_department_assignment_id
        join public.issues i on i.id = ida.issue_id
        left join public.departments d on d.id = ida.department_id
        left join public.profiles p_mgr on p_mgr.id = dwa.assigned_by_profile_id
        where dwa.worker_profile_id = worker_prof_id
          and dwa.status in ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED')
      ) dwa
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.debug_simulate_worker_query(text) to anon, authenticated;
