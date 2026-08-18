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
