alter table public.roles enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.issues enable row level security;
alter table public.issue_images enable row level security;
alter table public.issue_ai_analysis enable row level security;
alter table public.issue_assignments enable row level security;
alter table public.issue_status_history enable row level security;
alter table public.issue_duplicates enable row level security;
alter table public.notifications enable row level security;
alter table public.resolution_verifications enable row level security;

drop policy if exists roles_read_authenticated on public.roles;
create policy roles_read_authenticated
on public.roles
for select
to authenticated
using (true);

drop policy if exists roles_admin_manage on public.roles;
create policy roles_admin_manage
on public.roles
for all
to authenticated
using (public.current_user_has_role(array['ADMIN'::public.role_code]))
with check (public.current_user_has_role(array['ADMIN'::public.role_code]));

drop policy if exists departments_read_authenticated on public.departments;
create policy departments_read_authenticated
on public.departments
for select
to authenticated
using (true);

drop policy if exists departments_admin_manage on public.departments;
create policy departments_admin_manage
on public.departments
for all
to authenticated
using (public.current_user_has_role(array['ADMIN'::public.role_code]))
with check (public.current_user_has_role(array['ADMIN'::public.role_code]));

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (
  clerk_user_id = public.requesting_clerk_user_id()
  or public.current_user_has_role(array['ADMIN'::public.role_code])
);

drop policy if exists profiles_insert_self_citizen on public.profiles;
create policy profiles_insert_self_citizen
on public.profiles
for insert
to authenticated
with check (
  clerk_user_id = public.requesting_clerk_user_id()
  and public.role_code_for_role_id(role_id) = 'CITIZEN'::public.role_code
);

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin
on public.profiles
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code])
);

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles
for update
to authenticated
using (
  clerk_user_id = public.requesting_clerk_user_id()
  or public.current_user_has_role(array['ADMIN'::public.role_code])
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code])
  or (
    clerk_user_id = public.requesting_clerk_user_id()
    and public.role_code_for_role_id(role_id) = public.current_user_role_code()
  )
);

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin
on public.profiles
for delete
to authenticated
using (public.current_user_has_role(array['ADMIN'::public.role_code]));

drop policy if exists issues_select_accessible on public.issues;
create policy issues_select_accessible
on public.issues
for select
to authenticated
using (public.issue_is_accessible(id));

drop policy if exists issues_insert_own_citizen on public.issues;
create policy issues_insert_own_citizen
on public.issues
for insert
to authenticated
with check (
  (
    public.current_user_has_role(array['CITIZEN'::public.role_code])
    and reporter_profile_id = public.current_profile_id()
    and status = 'SUBMITTED'::public.issue_status
  )
  or public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
);

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
    and status in ('IN_PROGRESS'::public.issue_status, 'RESOLVED'::public.issue_status)
  )
);

drop policy if exists issues_delete_admin on public.issues;
create policy issues_delete_admin
on public.issues
for delete
to authenticated
using (public.current_user_has_role(array['ADMIN'::public.role_code]));

drop policy if exists issue_images_select_accessible on public.issue_images;
create policy issue_images_select_accessible
on public.issue_images
for select
to authenticated
using (public.issue_is_accessible(issue_id));

drop policy if exists issue_images_insert_allowed on public.issue_images;
create policy issue_images_insert_allowed
on public.issue_images
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
  or (
    public.current_user_has_role(array['CITIZEN'::public.role_code])
    and image_type = 'INITIAL_REPORT'::public.issue_image_type
    and storage_bucket = 'issue-images'
    and uploaded_by_profile_id = public.current_profile_id()
    and exists (
      select 1
      from public.issues i
      where i.id = issue_id
        and i.reporter_profile_id = public.current_profile_id()
    )
  )
  or (
    public.current_user_has_role(array['FIELD_WORKER'::public.role_code])
    and image_type = 'RESOLUTION_EVIDENCE'::public.issue_image_type
    and storage_bucket = 'resolution-images'
    and uploaded_by_profile_id = public.current_profile_id()
    and public.issue_is_assigned_to_current_worker(issue_id)
  )
);

drop policy if exists issue_images_update_admin on public.issue_images;
create policy issue_images_update_admin
on public.issue_images
for update
to authenticated
using (public.current_user_has_role(array['ADMIN'::public.role_code]));

drop policy if exists issue_images_delete_admin on public.issue_images;
create policy issue_images_delete_admin
on public.issue_images
for delete
to authenticated
using (public.current_user_has_role(array['ADMIN'::public.role_code]));

drop policy if exists issue_ai_analysis_select_staff on public.issue_ai_analysis;
create policy issue_ai_analysis_select_staff
on public.issue_ai_analysis
for select
to authenticated
using (public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code]));

drop policy if exists issue_assignments_select_staff_or_worker on public.issue_assignments;
create policy issue_assignments_select_staff_or_worker
on public.issue_assignments
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
  or (worker_id = public.current_profile_id() and unassigned_at is null)
);

drop policy if exists issue_assignments_manage_staff on public.issue_assignments;
create policy issue_assignments_manage_staff
on public.issue_assignments
for all
to authenticated
using (public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code]))
with check (public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code]));

drop policy if exists issue_status_history_select_accessible on public.issue_status_history;
create policy issue_status_history_select_accessible
on public.issue_status_history
for select
to authenticated
using (public.issue_is_accessible(issue_id));

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
      and new_status in ('IN_PROGRESS'::public.issue_status, 'RESOLVED'::public.issue_status)
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

drop policy if exists issue_status_history_delete_admin on public.issue_status_history;
create policy issue_status_history_delete_admin
on public.issue_status_history
for delete
to authenticated
using (public.current_user_has_role(array['ADMIN'::public.role_code]));

drop policy if exists issue_duplicates_select_staff on public.issue_duplicates;
create policy issue_duplicates_select_staff
on public.issue_duplicates
for select
to authenticated
using (public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code]));

drop policy if exists issue_duplicates_manage_staff on public.issue_duplicates;
create policy issue_duplicates_manage_staff
on public.issue_duplicates
for all
to authenticated
using (public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code]))
with check (public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code]));

drop policy if exists notifications_select_recipient_or_admin on public.notifications;
create policy notifications_select_recipient_or_admin
on public.notifications
for select
to authenticated
using (
  recipient_profile_id = public.current_profile_id()
  or public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
);

drop policy if exists notifications_insert_staff on public.notifications;
create policy notifications_insert_staff
on public.notifications
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
);

drop policy if exists notifications_update_recipient_or_admin on public.notifications;
create policy notifications_update_recipient_or_admin
on public.notifications
for update
to authenticated
using (
  recipient_profile_id = public.current_profile_id()
  or public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
)
with check (
  recipient_profile_id = public.current_profile_id()
  or public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
);

drop policy if exists notifications_delete_admin on public.notifications;
create policy notifications_delete_admin
on public.notifications
for delete
to authenticated
using (public.current_user_has_role(array['ADMIN'::public.role_code]));

drop policy if exists resolution_verifications_select_owner_or_staff on public.resolution_verifications;
create policy resolution_verifications_select_owner_or_staff
on public.resolution_verifications
for select
to authenticated
using (
  citizen_id = public.current_profile_id()
  or public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
);

drop policy if exists resolution_verifications_insert_citizen on public.resolution_verifications;
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

drop policy if exists resolution_verifications_delete_admin on public.resolution_verifications;
create policy resolution_verifications_delete_admin
on public.resolution_verifications
for delete
to authenticated
using (public.current_user_has_role(array['ADMIN'::public.role_code]));
