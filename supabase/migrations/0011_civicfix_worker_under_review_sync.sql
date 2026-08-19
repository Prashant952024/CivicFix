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
    and status in ('IN_PROGRESS'::public.issue_status, 'UNDER_REVIEW'::public.issue_status)
  )
);
