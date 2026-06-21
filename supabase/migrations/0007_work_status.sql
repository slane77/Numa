-- "Who's working where" — each person sets, per day, whether they're in the
-- office, working from home, or away. Later, approved holidays will populate
-- the 'away' status automatically; for now it's set by hand.

create type work_location as enum ('office', 'home', 'away');

create table work_status (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  location   work_location not null,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);
create index work_status_day_idx on work_status (day);

create trigger t_work_status_u
  before update on work_status
  for each row execute function set_updated_at();

alter table work_status enable row level security;

-- Everyone can see where everyone is working.
create policy "read work status"
  on work_status for select to authenticated using (true);

-- You set only your own status.
create policy "insert own work status"
  on work_status for insert to authenticated with check (user_id = auth.uid());
create policy "update own work status"
  on work_status for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own work status"
  on work_status for delete to authenticated using (user_id = auth.uid());
