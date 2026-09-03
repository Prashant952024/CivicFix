-- Migration 0017: CivicFix Admin Staff Provisioning & Employee Management
-- Adds employee metadata, avatar storage, account status, and Admin management capabilities.

-- 1. Extend profiles table with employee and status metadata
alter table public.profiles
  add column if not exists employee_id text unique,
  add column if not exists designation text,
  add column if not exists is_active boolean not null default true,
  add column if not exists avatar_url text,
  add column if not exists joined_at date default CURRENT_DATE;

create index if not exists idx_profiles_employee_id on public.profiles (employee_id);
create index if not exists idx_profiles_is_active on public.profiles (is_active);

-- 2. Ensure authenticated users have UPDATE privileges on public.profiles
-- Row-level security (RLS) and privilege escalation triggers will govern actual authorization
grant update on public.profiles to authenticated;

-- 3. Update privilege escalation trigger to protect role, department, employee_id, and is_active from non-admins
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

  if new.employee_id is distinct from old.employee_id
    and not public.current_user_has_role(array['ADMIN'::public.role_code]) then
    raise exception 'employee_id cannot be changed by non-admin users';
  end if;

  if new.is_active is distinct from old.is_active
    and not public.current_user_has_role(array['ADMIN'::public.role_code]) then
    raise exception 'is_active status cannot be changed by non-admin users';
  end if;

  return new;
end;
$$;

-- 4. Create or configure avatars storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Storage policies for avatars bucket
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read
on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists avatars_admin_or_owner_insert on storage.objects;
create policy avatars_admin_or_owner_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code])
    or auth.uid()::text = (storage.foldername(name))[1]
    or name like (public.current_profile_id()::text || '/%')
  )
);

drop policy if exists avatars_admin_or_owner_update on storage.objects;
create policy avatars_admin_or_owner_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (
    public.current_user_has_role(array['ADMIN'::public.role_code])
    or auth.uid()::text = (storage.foldername(name))[1]
    or name like (public.current_profile_id()::text || '/%')
  )
);

drop policy if exists avatars_admin_delete on storage.objects;
create policy avatars_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and public.current_user_has_role(array['ADMIN'::public.role_code])
);
