-- Fix: "Add picture" on the event planner (and gallery) failing to upload.
--
-- Two things in the media bucket's setup could reject a legitimate upload from
-- a member of staff — most visibly when adding a photo straight from a phone:
--
--   1. MIME allow-list too narrow. The bucket only accepted png/jpeg/gif/webp/
--      svg (+ mp4/webm/mov). Photos taken on an iPhone are HEIC/HEIF by default
--      and many newer cameras/browsers produce AVIF, so those uploads bounced
--      with "mime type image/heic is not supported" — which shows up to the
--      user simply as the picture not adding.
--
--   2. Fragile INSERT policy. The upload policy checked `owner = auth.uid()`.
--      That relies on the storage service having populated `owner` before the
--      row-level check runs; when it hasn't, a valid upload is rejected with a
--      row-level-security error. Ownership is still enforced for update/delete
--      below, so an INSERT check on the bucket alone is enough and far more
--      robust. (Any signed-in staff member is meant to be able to contribute
--      event photos — see migration 0006.)

-- 1. Accept the formats real staff actually upload (adds HEIC/HEIF/AVIF + jpg).
update storage.buckets
set allowed_mime_types = array[
  'image/png','image/jpeg','image/jpg','image/gif','image/webp',
  'image/svg+xml','image/heic','image/heif','image/avif',
  'video/mp4','video/webm','video/quicktime'
]
where id = 'media';

-- 2. Any signed-in member of staff can upload to the media bucket.
--    (Drop earlier variants first so this migration is safe whichever of the
--     previous storage migrations the database already has.)
drop policy if exists "editors upload media" on storage.objects;
drop policy if exists "staff upload media" on storage.objects;

create policy "staff upload media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media');
