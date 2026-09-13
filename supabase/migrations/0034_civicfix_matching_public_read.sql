-- Migration 0034: CivicFix Verified Institutions Public Access Policy
-- Enables anonymous/public inspection of verified active partner institutions

drop policy if exists institutions_select_anon on public.institutions;
create policy institutions_select_anon on public.institutions
for select to anon
using (
  is_active = true and verification_status = 'VERIFIED'
);

drop policy if exists institution_projects_select_anon on public.institution_projects;
create policy institution_projects_select_anon on public.institution_projects
for select to anon
using (true);
