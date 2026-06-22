-- Private bucket for HR documents. Unlike `media`, this is NOT public — files
-- are only reachable via short-lived signed URLs, and only by the document's
-- owner or HR. Document paths are `<user_id>/<filename>`.

insert into storage.buckets (id, name, public, file_size_limit)
values ('hr-docs', 'hr-docs', false, 52428800) -- 50 MB
on conflict (id) do nothing;

-- Read: HR sees all; an employee sees only files in their own folder.
create policy "hr docs read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'hr-docs'
    and (public.is_hr() or (storage.foldername(name))[1] = auth.uid()::text)
  );

-- Only HR can add or remove documents.
create policy "hr docs write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'hr-docs' and public.is_hr());

create policy "hr docs update"
  on storage.objects for update to authenticated
  using (bucket_id = 'hr-docs' and public.is_hr());

create policy "hr docs delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'hr-docs' and public.is_hr());
