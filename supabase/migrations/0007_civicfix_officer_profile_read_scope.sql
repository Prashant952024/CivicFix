drop policy if exists profiles_select_officer_related on public.profiles;
create policy profiles_select_officer_related
on public.profiles
for select
to authenticated
using (
  public.current_user_has_role(array['MUNICIPAL_OFFICER'::public.role_code])
  and (
    public.role_code_for_role_id(role_id) = 'FIELD_WORKER'::public.role_code
    or id in (
      select i.reporter_profile_id
      from public.issues i
      where public.issue_is_accessible(i.id)
    )
  )
);
