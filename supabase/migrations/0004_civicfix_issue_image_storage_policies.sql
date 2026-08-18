drop policy if exists issue_images_storage_insert_own on storage.objects;
create policy issue_images_storage_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'issue-images'
  and name like public.current_profile_id()::text || '/%'
);

drop policy if exists issue_images_storage_delete_own on storage.objects;
create policy issue_images_storage_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'issue-images'
  and name like public.current_profile_id()::text || '/%'
);
