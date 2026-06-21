-- Open up media uploads to all signed-in staff so they can contribute photos
-- and videos to event galleries (news posting is still gated in the app by the
-- editor role). Modifying/removing an object stays restricted to its uploader
-- or an editor/admin.

drop policy if exists "editors upload media" on storage.objects;
drop policy if exists "editors update media" on storage.objects;
drop policy if exists "editors delete media" on storage.objects;

create policy "staff upload media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and owner = auth.uid());

create policy "owner or editor update media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and (owner = auth.uid() or public.is_editor()));

create policy "owner or editor delete media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and (owner = auth.uid() or public.is_editor()));
