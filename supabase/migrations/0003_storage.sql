-- Media storage for news cover images, event graphics, photos and videos.
-- A single public-read bucket keeps rendering images dead simple (public URLs);
-- writes are restricted to editors/admins.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  524288000, -- 500 MB cap (comfortably covers short event videos)
  array[
    'image/png','image/jpeg','image/gif','image/webp','image/svg+xml',
    'video/mp4','video/webm','video/quicktime'
  ]
)
on conflict (id) do nothing;

-- Anyone signed in can view media.
create policy "media readable by staff"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'media');

-- Only editors/admins can upload, update or remove media.
create policy "editors upload media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and public.is_editor());

create policy "editors update media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and public.is_editor());

create policy "editors delete media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and public.is_editor());
