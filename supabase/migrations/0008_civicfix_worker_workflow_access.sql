drop policy if exists issue_ai_analysis_select_staff on public.issue_ai_analysis;
create policy issue_ai_analysis_select_staff
on public.issue_ai_analysis
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'MUNICIPAL_OFFICER'::public.role_code])
  or public.issue_is_assigned_to_current_worker(issue_id)
);

drop policy if exists profiles_select_worker_assigned_staff on public.profiles;
create policy profiles_select_worker_assigned_staff
on public.profiles
for select
to authenticated
using (
  public.current_user_has_role(array['FIELD_WORKER'::public.role_code])
  and public.role_code_for_role_id(role_id) in ('MUNICIPAL_OFFICER'::public.role_code, 'ADMIN'::public.role_code)
  and id in (
    select ia.assigned_by_profile_id
    from public.issue_assignments ia
    where ia.worker_id = public.current_profile_id()
      and ia.unassigned_at is null
  )
);

drop policy if exists resolution_images_storage_insert_own on storage.objects;
create policy resolution_images_storage_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resolution-images'
  and name like public.current_profile_id()::text || '/%'
);

drop policy if exists resolution_images_storage_delete_own on storage.objects;
create policy resolution_images_storage_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'resolution-images'
  and name like public.current_profile_id()::text || '/%'
);

drop policy if exists issue_images_delete_worker_resolution on public.issue_images;
create policy issue_images_delete_worker_resolution
on public.issue_images
for delete
to authenticated
using (
  public.current_user_has_role(array['FIELD_WORKER'::public.role_code])
  and image_type = 'RESOLUTION_EVIDENCE'::public.issue_image_type
  and storage_bucket = 'resolution-images'
  and uploaded_by_profile_id = public.current_profile_id()
  and public.issue_is_assigned_to_current_worker(issue_id)
);
