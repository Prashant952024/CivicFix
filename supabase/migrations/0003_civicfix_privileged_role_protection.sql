insert into public.roles (code, name, description, is_system_role)
values
  ('CITIZEN', 'Citizen', 'Public user who reports and verifies civic issues.', true),
  ('MUNICIPAL_OFFICER', 'Municipal Officer', 'Reviews, prioritizes, and routes civic issues.', true),
  ('FIELD_WORKER', 'Field Worker', 'Executes assigned field work and uploads resolution evidence.', true),
  ('ADMIN', 'Admin', 'System administrator with full platform access.', true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system_role = excluded.is_system_role,
  updated_at = now();

insert into public.departments (name, description, is_active)
values
  ('Roads', 'Road repair, potholes, and road surface maintenance.', true),
  ('Water', 'Water supply, leaks, and plumbing issues.', true),
  ('Sanitation', 'Sanitation and public hygiene complaints.', true),
  ('Electricity', 'Power supply and electrical infrastructure.', true),
  ('Street Lighting', 'Street lights and lighting failures.', true),
  ('Waste Management', 'Garbage collection and waste disposal issues.', true),
  ('Parks', 'Parks, gardens, and public green spaces.', true),
  ('Drainage', 'Storm water drains and flooding concerns.', true),
  ('Other', 'Issues that do not fit a specific department.', true)
on conflict (name) do update
set
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

drop policy if exists roles_admin_manage on public.roles;

revoke insert, update, delete on public.roles from anon, authenticated;

revoke update (clerk_user_id, role_id, department_id) on public.profiles from authenticated;
revoke update (clerk_user_id, role_id, department_id) on public.profiles from anon;

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.clerk_user_id is distinct from old.clerk_user_id then
    raise exception 'clerk_user_id cannot be changed';
  end if;

  if new.role_id is distinct from old.role_id
    and not public.current_user_has_role(array['ADMIN'::public.role_code]) then
    raise exception 'role_id cannot be changed by non-admin users';
  end if;

  if new.department_id is distinct from old.department_id
    and not public.current_user_has_role(array['ADMIN'::public.role_code]) then
    raise exception 'department_id cannot be changed by non-admin users';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_privilege_escalation on public.profiles;
create trigger profiles_prevent_privilege_escalation
before update on public.profiles
for each row
execute function public.prevent_profile_privilege_escalation();
