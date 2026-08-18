create or replace function public.sync_issue_status_from_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.issues
  set
    status = new.new_status,
    resolved_at = case
      when new.new_status in ('RESOLVED'::public.issue_status, 'CITIZEN_VERIFIED'::public.issue_status) then coalesce(resolved_at, now())
      when new.new_status = 'REOPENED'::public.issue_status then null
      else resolved_at
    end,
    updated_at = now()
  where id = new.issue_id;

  return new;
end;
$$;

drop trigger if exists issue_status_history_sync_issue on public.issue_status_history;
create trigger issue_status_history_sync_issue
after insert on public.issue_status_history
for each row
execute function public.sync_issue_status_from_history();

create or replace function public.apply_resolution_verification_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.issue_status;
begin
  if new.result = 'VERIFIED'::public.verification_result then
    select status
    into current_status
    from public.issues
    where id = new.issue_id
    limit 1;

    if current_status is distinct from 'CITIZEN_VERIFIED'::public.issue_status then
      insert into public.issue_status_history (
        issue_id,
        old_status,
        new_status,
        changed_by_profile_id,
        notes
      )
      values (
        new.issue_id,
        current_status,
        'CITIZEN_VERIFIED'::public.issue_status,
        new.citizen_id,
        'Citizen confirmed the issue was resolved.'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists resolution_verifications_apply_history on public.resolution_verifications;
create trigger resolution_verifications_apply_history
after insert on public.resolution_verifications
for each row
execute function public.apply_resolution_verification_history();
