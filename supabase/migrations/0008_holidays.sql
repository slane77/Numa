-- Holidays: per-person allowance + line-manager approval hierarchy.

-- 1) Profile additions: who you report to, and your annual leave entitlement.
alter table profiles
  add column manager_id        uuid references auth.users(id) on delete set null,
  add column annual_leave_days numeric(4,1) not null default 25;

-- Stop ordinary staff escalating their own role / allowance / manager by hitting
-- the API directly. Only admins may change these privileged fields.
create or replace function guard_profile_privileged_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role
      or new.manager_id is distinct from old.manager_id
      or new.annual_leave_days is distinct from old.annual_leave_days)
     and not public.is_admin() then
    raise exception 'Only an admin can change role, manager or leave allowance';
  end if;
  return new;
end; $$;

create trigger t_profiles_guard
  before update on profiles
  for each row execute function guard_profile_privileged_fields();

-- 2) Helper: am I the line manager of this person?
create or replace function public.is_manager_of(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = target and manager_id = auth.uid()
  );
$$;

-- 3) Requests
create type holiday_status as enum ('pending', 'approved', 'declined', 'cancelled');

create table holiday_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  start_date    date not null,
  end_date      date not null,
  working_days  numeric(4,1) not null,
  note          text,
  status        holiday_status not null default 'pending',
  decided_by    uuid references auth.users(id) on delete set null,
  decided_at    timestamptz,
  decision_note text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_date >= start_date)
);
create index holiday_requests_user_idx on holiday_requests (user_id, start_date);
create index holiday_requests_status_idx on holiday_requests (status);

create trigger t_holiday_requests_u
  before update on holiday_requests
  for each row execute function set_updated_at();

-- 4) RLS
alter table holiday_requests enable row level security;

-- See your own requests; managers see their reports'; admins see all.
create policy "read holiday requests"
  on holiday_requests for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_manager_of(user_id)
    or public.is_admin()
  );

-- Raise a request only for yourself.
create policy "create own holiday request"
  on holiday_requests for insert to authenticated
  with check (user_id = auth.uid());

-- Owner (to cancel) or the approving manager / admin can update.
create policy "update holiday request"
  on holiday_requests for update to authenticated
  using (
    user_id = auth.uid()
    or public.is_manager_of(user_id)
    or public.is_admin()
  )
  with check (
    user_id = auth.uid()
    or public.is_manager_of(user_id)
    or public.is_admin()
  );
