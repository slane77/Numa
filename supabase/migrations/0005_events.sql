-- Events: editors create company events (with a cover graphic); all staff can
-- RSVP and contribute photos/videos to each event's gallery.

create type rsvp_status as enum ('going', 'maybe', 'not_going');

create table events (
  id              uuid primary key default gen_random_uuid(),
  organiser_id    uuid references auth.users(id) on delete set null,
  title           text not null,
  description     text not null default '',
  location        text,
  cover_image_url text,
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  all_day         boolean not null default false,
  published       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index events_when_idx on events (starts_at);

create table event_rsvps (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  status     rsvp_status not null default 'going',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index event_rsvps_event_idx on event_rsvps (event_id);

create table event_media (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  url         text not null,
  kind        text not null default 'image' check (kind in ('image', 'video')),
  caption     text,
  created_at  timestamptz not null default now()
);
create index event_media_event_idx on event_media (event_id, created_at);

create trigger t_events_u      before update on events      for each row execute function set_updated_at();
create trigger t_event_rsvps_u before update on event_rsvps for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table events      enable row level security;
alter table event_rsvps enable row level security;
alter table event_media enable row level security;

-- EVENTS: staff read published events; editors see drafts too.
create policy "read published events"
  on events for select to authenticated
  using (published or public.is_editor());

create policy "editors create events"
  on events for insert to authenticated
  with check (public.is_editor() and organiser_id = auth.uid());

create policy "organisers update events"
  on events for update to authenticated
  using (organiser_id = auth.uid() or public.is_admin())
  with check (organiser_id = auth.uid() or public.is_admin());

create policy "organisers delete events"
  on events for delete to authenticated
  using (organiser_id = auth.uid() or public.is_admin());

-- RSVPS: everyone can see who's coming; you manage only your own RSVP.
create policy "read rsvps"
  on event_rsvps for select to authenticated using (true);
create policy "insert own rsvp"
  on event_rsvps for insert to authenticated with check (user_id = auth.uid());
create policy "update own rsvp"
  on event_rsvps for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own rsvp"
  on event_rsvps for delete to authenticated using (user_id = auth.uid());

-- GALLERY: any member of staff can add photos/videos; you (or an admin/editor)
-- can remove your own contribution.
create policy "read event media"
  on event_media for select to authenticated using (true);
create policy "add event media"
  on event_media for insert to authenticated with check (uploaded_by = auth.uid());
create policy "remove own event media"
  on event_media for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_editor());
