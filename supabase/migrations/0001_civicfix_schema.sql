create extension if not exists pgcrypto;

create type public.role_code as enum (
  'CITIZEN',
  'MUNICIPAL_OFFICER',
  'FIELD_WORKER',
  'ADMIN'
);

create type public.issue_status as enum (
  'SUBMITTED',
  'AI_ANALYZED',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'CITIZEN_VERIFIED',
  'REOPENED'
);

create type public.issue_severity as enum (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

create type public.issue_priority as enum (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

create type public.issue_image_type as enum (
  'INITIAL_REPORT',
  'RESOLUTION_EVIDENCE'
);

create type public.assignment_status as enum (
  'ACTIVE',
  'COMPLETED',
  'UNASSIGNED'
);

create type public.duplicate_detection_method as enum (
  'GPS_PROXIMITY',
  'CATEGORY',
  'TIME',
  'IMAGE_SIMILARITY',
  'MANUAL_REVIEW'
);

create type public.duplicate_status as enum (
  'PENDING',
  'CONFIRMED',
  'DISMISSED'
);

create type public.notification_type as enum (
  'STATUS_CHANGE',
  'ASSIGNMENT',
  'SYSTEM',
  'VERIFICATION'
);

create type public.verification_result as enum (
  'VERIFIED',
  'UNRESOLVED'
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code public.role_code not null unique,
  name text not null unique,
  description text,
  is_system_role boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_name_not_blank check (length(btrim(name)) > 0)
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departments_name_not_blank check (length(btrim(name)) > 0)
);

create or replace function public.requesting_clerk_user_id()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::text;
$$;

create or replace function public.role_code_for_role_id(target_role_id uuid)
returns public.role_code
language sql
stable
security definer
set search_path = public
as $$
  select r.code
  from public.roles r
  where r.id = target_role_id
  limit 1;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.assign_default_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  citizen_role_id uuid;
begin
  if new.role_id is null then
    select id
    into citizen_role_id
    from public.roles
    where code = 'CITIZEN'
    limit 1;

    if citizen_role_id is null then
      raise exception 'Missing CITIZEN role seed data';
    end if;

    new.role_id := citizen_role_id;
  end if;

  return new;
end;
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  full_name text not null default '',
  email text unique,
  phone text,
  role_id uuid not null references public.roles(id) on update cascade on delete restrict,
  department_id uuid references public.departments(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_clerk_user_id_not_blank check (length(btrim(clerk_user_id)) > 0)
);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid not null references public.profiles(id) on update cascade on delete restrict,
  title text not null,
  description text not null,
  category text not null,
  severity public.issue_severity not null default 'LOW',
  priority public.issue_priority not null default 'LOW',
  status public.issue_status not null default 'SUBMITTED',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  location_text text,
  address_text text,
  department_id uuid references public.departments(id) on update cascade on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint issues_title_not_blank check (length(btrim(title)) > 0),
  constraint issues_description_not_blank check (length(btrim(description)) > 0),
  constraint issues_category_not_blank check (length(btrim(category)) > 0),
  constraint issues_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint issues_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint issues_coordinates_pair check (
    (latitude is null and longitude is null) or (latitude is not null and longitude is not null)
  ),
  constraint issues_resolved_status check (
    resolved_at is null or status in ('RESOLVED', 'CITIZEN_VERIFIED')
  )
);

create table public.issue_images (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on update cascade on delete cascade,
  storage_bucket text not null,
  storage_path text not null unique,
  image_type public.issue_image_type not null,
  uploaded_by_profile_id uuid not null references public.profiles(id) on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  constraint issue_images_bucket_check check (storage_bucket in ('issue-images', 'resolution-images')),
  constraint issue_images_bucket_type_check check (
    (image_type = 'INITIAL_REPORT' and storage_bucket = 'issue-images')
    or (image_type = 'RESOLUTION_EVIDENCE' and storage_bucket = 'resolution-images')
  )
);

create table public.issue_ai_analysis (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on update cascade on delete cascade,
  provider text not null,
  model text not null,
  category_recommendation text,
  severity_recommendation public.issue_severity,
  priority_recommendation public.issue_priority,
  department_recommendation text,
  confidence_score numeric(5, 4),
  structured_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint issue_ai_analysis_confidence_check check (
    confidence_score is null or confidence_score between 0 and 1
  )
);

create table public.issue_assignments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on update cascade on delete cascade,
  department_id uuid references public.departments(id) on update cascade on delete set null,
  worker_id uuid references public.profiles(id) on update cascade on delete set null,
  assigned_by_profile_id uuid not null references public.profiles(id) on update cascade on delete restrict,
  status public.assignment_status not null default 'ACTIVE',
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz
);

create table public.issue_status_history (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on update cascade on delete cascade,
  old_status public.issue_status,
  new_status public.issue_status not null,
  changed_by_profile_id uuid not null references public.profiles(id) on update cascade on delete restrict,
  notes text,
  created_at timestamptz not null default now()
);

create table public.issue_duplicates (
  id uuid primary key default gen_random_uuid(),
  source_issue_id uuid not null references public.issues(id) on update cascade on delete cascade,
  duplicate_issue_id uuid not null references public.issues(id) on update cascade on delete cascade,
  confidence_score numeric(5, 4),
  detection_method public.duplicate_detection_method not null,
  status public.duplicate_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  constraint issue_duplicates_distinct_issues check (source_issue_id <> duplicate_issue_id),
  constraint issue_duplicates_confidence_check check (
    confidence_score is null or confidence_score between 0 and 1
  ),
  constraint issue_duplicates_unique_pair unique (source_issue_id, duplicate_issue_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles(id) on update cascade on delete cascade,
  notification_type public.notification_type not null,
  title text not null,
  message text not null,
  related_issue_id uuid references public.issues(id) on update cascade on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_title_not_blank check (length(btrim(title)) > 0),
  constraint notifications_message_not_blank check (length(btrim(message)) > 0),
  constraint notifications_read_timestamp_check check (
    (is_read = false and read_at is null) or (is_read = true and read_at is not null)
  )
);

create table public.resolution_verifications (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on update cascade on delete cascade,
  citizen_id uuid not null references public.profiles(id) on update cascade on delete cascade,
  result public.verification_result not null,
  feedback text,
  created_at timestamptz not null default now(),
  constraint resolution_verifications_unique_pair unique (issue_id, citizen_id)
);

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.clerk_user_id = public.requesting_clerk_user_id()
  limit 1;
$$;

create or replace function public.current_user_role_code()
returns public.role_code
language sql
stable
security definer
set search_path = public
as $$
  select public.role_code_for_role_id(p.role_id)
  from public.profiles p
  where p.clerk_user_id = public.requesting_clerk_user_id()
  limit 1;
$$;

create or replace function public.current_user_has_role(required_roles public.role_code[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role_code() = any(required_roles), false);
$$;

create or replace function public.issue_is_assigned_to_current_worker(target_issue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.issue_assignments ia
    where ia.issue_id = target_issue_id
      and ia.worker_id = public.current_profile_id()
      and ia.unassigned_at is null
  );
$$;

create or replace function public.issue_is_accessible(target_issue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
    or exists (
      select 1
      from public.issues i
      where i.id = target_issue_id
        and i.reporter_profile_id = public.current_profile_id()
    )
    or public.issue_is_assigned_to_current_worker(target_issue_id);
$$;

create trigger profiles_assign_default_role
before insert on public.profiles
for each row
execute function public.assign_default_profile_role();

create trigger roles_touch_updated_at
before update on public.roles
for each row
execute function public.touch_updated_at();

create trigger departments_touch_updated_at
before update on public.departments
for each row
execute function public.touch_updated_at();

create trigger profiles_touch_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

create index roles_code_idx on public.roles (code);
create index departments_is_active_idx on public.departments (is_active);
create index profiles_role_id_idx on public.profiles (role_id);
create index profiles_department_id_idx on public.profiles (department_id);
create index issues_reporter_created_idx on public.issues (reporter_profile_id, created_at desc);
create index issues_department_status_idx on public.issues (department_id, status);
create index issues_status_created_idx on public.issues (status, created_at desc);
create index issues_priority_created_idx on public.issues (priority, created_at desc);
create index issues_category_idx on public.issues (category);
create index issue_images_issue_type_created_idx on public.issue_images (issue_id, image_type, created_at desc);
create index issue_ai_analysis_issue_created_idx on public.issue_ai_analysis (issue_id, created_at desc);
create index issue_assignments_issue_active_idx on public.issue_assignments (issue_id, unassigned_at);
create index issue_assignments_worker_active_idx on public.issue_assignments (worker_id, unassigned_at);
create index issue_status_history_issue_created_idx on public.issue_status_history (issue_id, created_at desc);
create index issue_duplicates_source_idx on public.issue_duplicates (source_issue_id);
create index issue_duplicates_duplicate_idx on public.issue_duplicates (duplicate_issue_id);
create index notifications_recipient_read_created_idx on public.notifications (recipient_profile_id, is_read, created_at desc);
create index resolution_verifications_issue_citizen_idx on public.resolution_verifications (issue_id, citizen_id);

create unique index issue_assignments_one_active_per_issue
on public.issue_assignments (issue_id)
where unassigned_at is null;
