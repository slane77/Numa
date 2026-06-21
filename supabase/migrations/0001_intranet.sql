-- Day Webster intranet ("The Hub") — initial schema.
-- Designed for a fresh Supabase project: profiles (staff directory) + company news.

create extension if not exists "pgcrypto";

-- Roles control who can publish content. Everyone signs in as 'employee';
-- 'editor' can post news/events; 'admin' can also manage people & any content.
create type user_role as enum ('employee', 'editor', 'admin');

-- updated_at helper (search_path pinned for safety)
create or replace function set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

-- PROFILES (1:1 with auth.users) — the staff directory.
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  job_title    text,
  department   text,
  location     text,
  avatar_url   text,
  role         user_role not null default 'employee',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- NEWS POSTS — the company news / announcements feed.
create table news_posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid references auth.users(id) on delete set null,
  title          text not null,
  body           text not null default '',
  excerpt        text,
  category       text not null default 'General',
  cover_image_url text,
  is_pinned      boolean not null default false,
  published      boolean not null default true,
  published_at   timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index news_posts_feed_idx on news_posts (published, is_pinned desc, published_at desc);

create trigger t_profiles_u   before update on profiles   for each row execute function set_updated_at();
create trigger t_news_posts_u before update on news_posts for each row execute function set_updated_at();

-- Auto-create a profile when a new auth user signs up. Microsoft / Google OAuth
-- return the person's name in different metadata keys, so we coalesce them.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Role lookup for policies. SECURITY DEFINER so it bypasses RLS on `profiles`
-- (prevents recursive policy evaluation). Returns the caller's role.
create or replace function public.current_user_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() in ('editor', 'admin'), false);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

-- These are trigger / policy helpers; they must not be callable as RPCs.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
