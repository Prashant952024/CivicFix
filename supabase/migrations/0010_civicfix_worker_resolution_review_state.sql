drop policy if exists issues_update_staff_or_assigned_worker on public.issues;
create policy issues_update_staff_or_assigned_worker
on public.issues
for update
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
  or public.issue_is_assigned_to_current_worker(id)
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
  or (
    public.issue_is_assigned_to_current_worker(id)
    and status = 'IN_PROGRESS'::public.issue_status
  )
);

drop policy if exists issue_status_history_insert_allowed on public.issue_status_history;
create policy issue_status_history_insert_allowed
on public.issue_status_history
for insert
to authenticated
with check (
  changed_by_profile_id = public.current_profile_id()
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
    or (
      public.current_user_has_role(array['FIELD_WORKER'::public.role_code])
      and public.issue_is_assigned_to_current_worker(issue_id)
      and new_status in ('IN_PROGRESS'::public.issue_status, 'UNDER_REVIEW'::public.issue_status)
    )
    or (
      public.current_user_has_role(array['CITIZEN'::public.role_code])
      and issue_id in (
        select i.id
        from public.issues i
        where i.reporter_profile_id = public.current_profile_id()
      )
      and new_status in ('CITIZEN_VERIFIED'::public.issue_status, 'REOPENED'::public.issue_status)
    )
  )
);
