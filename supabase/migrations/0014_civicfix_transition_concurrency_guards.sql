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

  if public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code]) then
    if current_status in ('SUBMITTED'::public.issue_status, 'AI_ANALYZED'::public.issue_status)
      and new.new_status = 'VERIFIED'::public.issue_status then
      return new;
    end if;

    if current_status in ('VERIFIED'::public.issue_status, 'REOPENED'::public.issue_status)
      and new.new_status = 'ASSIGNED'::public.issue_status then
      return new;
    end if;

    if current_status = 'UNDER_REVIEW'::public.issue_status
      and new.new_status in ('RESOLVED'::public.issue_status, 'REJECTED'::public.issue_status) then
      return new;
    end if;
  elsif public.current_user_has_role(array['FIELD_WORKER'::public.role_code]) then
    if public.issue_is_assigned_to_current_worker(new.issue_id)
      and current_status in ('ASSIGNED'::public.issue_status, 'REOPENED'::public.issue_status, 'REJECTED'::public.issue_status)
      and new.new_status = 'IN_PROGRESS'::public.issue_status then
      return new;
    end if;

    if public.issue_is_assigned_to_current_worker(new.issue_id)
      and current_status = 'IN_PROGRESS'::public.issue_status
      and new.new_status = 'UNDER_REVIEW'::public.issue_status then
      return new;
    end if;
  elsif public.current_user_has_role(array['CITIZEN'::public.role_code]) then
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

create unique index if not exists issue_assignments_one_active_per_issue_idx
  on public.issue_assignments (issue_id)
  where unassigned_at is null;
