-- ============================================================================
-- CivicFix Phase 5.2: RLS & Authorization Hardening Migration 0077
-- ============================================================================
-- Objectives:
-- 1. Storage Object Authorization:
--    - Harden `issue-images` and `resolution-images` storage policies on storage.objects.
--    - Restrict INSERT, UPDATE, and DELETE to authenticated owners / staff paths and ADMIN.
-- 2. resolution_verifications Privacy:
--    - Restrict SELECT to authorized scopes:
--      * ADMIN: full administrative visibility
--      * MUNICIPAL_OFFICER: triage oversight
--      * CITIZEN: only for their own reported issues
--      * DEPARTMENT_MANAGER: only for issues assigned to their department
--      * FIELD_WORKER: only for issues assigned to them
--    - Retain immutable history (no UPDATE permitted).
-- 3. SECURITY DEFINER Hardening:
--    - Apply explicit `set search_path = public, pg_temp` to all active helper functions.
--    - Revoke execution grants from PUBLIC/anon on administrative and mutating RPCs.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART 1: STORAGE OBJECT AUTHORIZATION
-- ----------------------------------------------------------------------------

-- Ensure target buckets exist and are properly configured
insert into storage.buckets (id, name, public)
values ('issue-images', 'issue-images', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

insert into storage.buckets (id, name, public)
values ('resolution-images', 'resolution-images', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

-- Drop existing storage policies on issue-images
drop policy if exists issue_images_public_read on storage.objects;
drop policy if exists issue_images_storage_insert_own on storage.objects;
drop policy if exists issue_images_storage_update_own on storage.objects;
drop policy if exists issue_images_storage_delete_own on storage.objects;

-- Create hardened storage policies on issue-images
create policy issue_images_public_read
on storage.objects
for select
using (bucket_id = 'issue-images');

create policy issue_images_storage_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'issue-images'
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code])
    or (
      public.current_user_has_role(array['CITIZEN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
      and name like (public.current_profile_id()::text || '/%')
    )
  )
);

create policy issue_images_storage_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'issue-images'
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code])
    or (
      public.current_user_has_role(array['CITIZEN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
      and name like (public.current_profile_id()::text || '/%')
    )
  )
)
with check (
  bucket_id = 'issue-images'
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code])
    or (
      public.current_user_has_role(array['CITIZEN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
      and name like (public.current_profile_id()::text || '/%')
    )
  )
);

create policy issue_images_storage_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'issue-images'
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code])
    or (
      public.current_user_has_role(array['CITIZEN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
      and name like (public.current_profile_id()::text || '/%')
    )
  )
);

-- Drop existing storage policies on resolution-images
drop policy if exists resolution_images_public_read on storage.objects;
drop policy if exists resolution_images_storage_insert_own on storage.objects;
drop policy if exists resolution_images_storage_insert_staff on storage.objects;
drop policy if exists resolution_images_storage_update_staff on storage.objects;
drop policy if exists resolution_images_storage_delete_own on storage.objects;
drop policy if exists resolution_images_storage_delete_staff on storage.objects;

-- Create hardened storage policies on resolution-images
create policy resolution_images_public_read
on storage.objects
for select
using (bucket_id = 'resolution-images');

create policy resolution_images_storage_insert_staff
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resolution-images'
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code])
    or (
      public.current_user_has_role(array['FIELD_WORKER'::public.role_code, 'DEPARTMENT_MANAGER'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
      and name like (public.current_profile_id()::text || '/%')
    )
  )
);

create policy resolution_images_storage_update_staff
on storage.objects
for update
to authenticated
using (
  bucket_id = 'resolution-images'
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code])
    or (
      public.current_user_has_role(array['FIELD_WORKER'::public.role_code, 'DEPARTMENT_MANAGER'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
      and name like (public.current_profile_id()::text || '/%')
    )
  )
)
with check (
  bucket_id = 'resolution-images'
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code])
    or (
      public.current_user_has_role(array['FIELD_WORKER'::public.role_code, 'DEPARTMENT_MANAGER'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
      and name like (public.current_profile_id()::text || '/%')
    )
  )
);

create policy resolution_images_storage_delete_staff
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'resolution-images'
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code])
    or (
      public.current_user_has_role(array['FIELD_WORKER'::public.role_code, 'DEPARTMENT_MANAGER'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
      and name like (public.current_profile_id()::text || '/%')
    )
  )
);

-- ----------------------------------------------------------------------------
-- PART 2: resolution_verifications PRIVACY & RLS HARDENING
-- ----------------------------------------------------------------------------

drop policy if exists resolution_verifications_select_owner_or_staff on public.resolution_verifications;
drop policy if exists resolution_verifications_select_scoped on public.resolution_verifications;
drop policy if exists resolution_verifications_insert_citizen on public.resolution_verifications;
drop policy if exists resolution_verifications_delete_admin on public.resolution_verifications;

create policy resolution_verifications_select_scoped
on public.resolution_verifications
for select
to authenticated
using (
  -- 1. Admin always has full administrative visibility
  public.current_user_has_role(array['ADMIN'::public.role_code])
  -- 2. Municipal Officer has triage oversight
  or public.current_user_has_role(array['MUNICIPAL_OFFICER'::public.role_code])
  -- 3. Citizen can read only for their own reported issue
  or (
    public.current_user_has_role(array['CITIZEN'::public.role_code])
    and citizen_id = public.current_profile_id()
    and exists (
      select 1
      from public.issues i
      where i.id = resolution_verifications.issue_id
        and i.reporter_profile_id = public.current_profile_id()
    )
  )
  -- 4. Department Manager can read only for issues in their assigned department
  or (
    public.current_user_has_role(array['DEPARTMENT_MANAGER'::public.role_code])
    and exists (
      select 1
      from public.issues i
      left join public.issue_department_assignments ida on ida.issue_id = i.id
      where i.id = resolution_verifications.issue_id
        and (
          i.department_id = public.current_user_department_id()
          or ida.department_id = public.current_user_department_id()
        )
    )
  )
  -- 5. Field Worker can read only for issues currently/previously assigned to them
  or (
    public.current_user_has_role(array['FIELD_WORKER'::public.role_code])
    and public.issue_is_assigned_to_current_worker(resolution_verifications.issue_id)
  )
);

create policy resolution_verifications_insert_citizen
on public.resolution_verifications
for insert
to authenticated
with check (
  citizen_id = public.current_profile_id()
  and public.current_user_has_role(array['CITIZEN'::public.role_code])
  and exists (
    select 1
    from public.issues i
    where i.id = issue_id
      and i.reporter_profile_id = public.current_profile_id()
      and i.status in ('RESOLVED'::public.issue_status, 'CITIZEN_VERIFIED'::public.issue_status)
  )
);

create policy resolution_verifications_delete_admin
on public.resolution_verifications
for delete
to authenticated
using (public.current_user_has_role(array['ADMIN'::public.role_code]));

-- ----------------------------------------------------------------------------
-- PART 3: SECURITY DEFINER FUNCTIONS HARDENING
-- ----------------------------------------------------------------------------

-- Set search_path = public, pg_temp on historic and core security definer routines
alter function public.assign_default_profile_role() set search_path = public, pg_temp;
alter function public.sync_issue_status_from_history() set search_path = public, pg_temp;
alter function public.apply_resolution_verification_history() set search_path = public, pg_temp;
alter function public.sync_issue_assignment_status() set search_path = public, pg_temp;
alter function public.is_issue_reporter(uuid, uuid) set search_path = public, pg_temp;
alter function public.is_assigned_department_worker(uuid, uuid) set search_path = public, pg_temp;
alter function public.is_assigned_department_manager(uuid, uuid) set search_path = public, pg_temp;
alter function public.dept_worker_assignment_is_accessible_to_manager(uuid, uuid) set search_path = public, pg_temp;
alter function public.issue_is_assigned_to_current_worker(uuid) set search_path = public, pg_temp;
alter function public.issue_is_accessible(uuid) set search_path = public, pg_temp;
alter function public.current_profile_id() set search_path = public, pg_temp;
alter function public.current_user_role_code() set search_path = public, pg_temp;
alter function public.current_user_has_role(public.role_code[]) set search_path = public, pg_temp;
alter function public.current_user_department_id() set search_path = public, pg_temp;
alter function public.current_user_institution_id() set search_path = public, pg_temp;
alter function public.current_user_is_department_manager(uuid) set search_path = public, pg_temp;
alter function public.requesting_clerk_user_id() set search_path = public, pg_temp;
alter function public.get_district_infrastructure_context(text, text, text, text) set search_path = public, pg_temp;
alter function public.check_and_increment_rate_limit(text, integer, integer) set search_path = public, pg_temp;
alter function public.get_admin_analytics_telemetry(integer, text, text) set search_path = public, pg_temp;

-- Revoke execute from PUBLIC and anon on internal administrative and mutating helper routines
revoke execute on function public.check_and_increment_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.check_and_increment_rate_limit(text, integer, integer) to authenticated, service_role;

revoke execute on function public.get_admin_analytics_telemetry(integer, text, text) from public, anon;
grant execute on function public.get_admin_analytics_telemetry(integer, text, text) to authenticated, service_role;
