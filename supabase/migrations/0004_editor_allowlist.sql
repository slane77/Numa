-- Editor allow-list: anyone whose work email is listed here is automatically
-- granted their role the first time they sign in. This means you don't have to
-- run SQL by hand each time a team member joins — just add their email below
-- (or via the admin tooling later).

create table editor_allowlist (
  email      text primary key,
  role       user_role not null default 'editor',
  note       text,
  created_at timestamptz not null default now()
);

-- Lock it down: only admins (via service role / SQL) manage the allow-list.
alter table editor_allowlist enable row level security;
create policy "admins read allowlist"
  on editor_allowlist for select
  to authenticated
  using (public.is_admin());

-- Re-create the signup handler so it honours the allow-list (matched on email,
-- case-insensitively). People not on the list sign in as ordinary employees.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role;
begin
  select role into v_role
  from public.editor_allowlist
  where lower(email) = lower(new.email);

  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    coalesce(v_role, 'employee')
  );
  return new;
end; $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Seed the initial editors. Add the rest of your team's work emails here.
-- (Set role = 'admin' for anyone who should also manage people & all content.)
insert into editor_allowlist (email, role, note) values
  ('scott.lane@daywebster.com',    'admin',  'Owner'),
  ('rebecca.howell@daywebster.com', 'editor', 'Comms team')
on conflict (email) do nothing;
