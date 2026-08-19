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

  if new.new_status = 'REOPENED'::public.issue_status then
    delete from public.resolution_verifications rv
    using public.issues i
    where i.id = new.issue_id
      and rv.issue_id = i.id
      and rv.citizen_id = i.reporter_profile_id;
  end if;

  return new;
end;
$$;
