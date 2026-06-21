-- Row Level Security for the intranet. Everything below assumes the user is an
-- authenticated member of staff (Microsoft / Google sign-in).

alter table profiles   enable row level security;
alter table news_posts enable row level security;

-- PROFILES: it's a staff directory, so any signed-in employee can read everyone.
create policy "profiles readable by staff"
  on profiles for select
  to authenticated
  using (true);

-- You can edit your own profile; admins can edit anyone (e.g. set roles).
create policy "update own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- NEWS: staff read published posts; editors/admins can see drafts too.
create policy "read published news"
  on news_posts for select
  to authenticated
  using (published or public.is_editor());

-- Only editors/admins create posts, and only as themselves.
create policy "editors create news"
  on news_posts for insert
  to authenticated
  with check (public.is_editor() and author_id = auth.uid());

-- Authors edit their own posts; admins edit any.
create policy "authors update news"
  on news_posts for update
  to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

create policy "authors delete news"
  on news_posts for delete
  to authenticated
  using (author_id = auth.uid() or public.is_admin());
