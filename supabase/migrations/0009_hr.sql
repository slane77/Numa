-- HR back-end: confidential records, documents, appraisals, probation, RTW,
-- TOIL and long-service — with tiered access enforced in the database.
--
-- Access tiers:
--   * employee  — sees/edits their own basics (personal details, next of kin),
--                 sees their own pay/docs read-only
--   * manager   — sees their reports' appraisals, probation, RTW, TOIL
--                 (NOT pay, documents, address)
--   * HR        — sees/edits everything HR (new is_hr flag, separate from admin)
--   * admin     — sees everything (counts as HR access too)

-- 1) HR capability flag (separate from the site role) ------------------------
alter table profiles add column is_hr boolean not null default false;

-- HR access = the HR flag, or a site admin.
create or replace function public.is_hr()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_hr from public.profiles where id = auth.uid()) or public.is_admin(),
    false
  );
$$;

-- Carry the HR flag through the sign-up allow-list.
alter table editor_allowlist add column is_hr boolean not null default false;

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role;
  v_is_hr boolean;
begin
  select role, is_hr into v_role, v_is_hr
  from public.editor_allowlist
  where lower(email) = lower(new.email);

  insert into public.profiles (id, display_name, role, is_hr)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    coalesce(v_role, 'employee'),
    coalesce(v_is_hr, false)
  );
  return new;
end; $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Rebecca runs HR.
update editor_allowlist set is_hr = true
  where lower(email) = 'rebecca.howell@daywebster.com';

-- The privileged-fields guard must also cover is_hr.
create or replace function guard_profile_privileged_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role
      or new.manager_id is distinct from old.manager_id
      or new.annual_leave_days is distinct from old.annual_leave_days
      or new.is_hr is distinct from old.is_hr)
     and not public.is_admin() then
    raise exception 'Only an admin can change role, HR access, manager or allowance';
  end if;
  return new;
end; $$;

-- 2) Personal details (employee-editable PII) --------------------------------
create table personal_details (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  dob            date,
  home_address   text,
  personal_phone text,
  personal_email text,
  updated_at     timestamptz not null default now()
);
create trigger t_personal_details_u before update on personal_details
  for each row execute function set_updated_at();

-- 3) Next of kin -------------------------------------------------------------
create table next_of_kin (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  relationship text,
  phone        text,
  email        text,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index next_of_kin_user_idx on next_of_kin (user_id);

-- 4) HR employment record (PAY — HR-write, self/HR-read) ---------------------
create table hr_records (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  start_date      date,
  employment_type text,
  salary          numeric(12,2),
  pay_period      text not null default 'annual'
                    check (pay_period in ('annual','daily','hourly')),
  ni_number       text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger t_hr_records_u before update on hr_records
  for each row execute function set_updated_at();

-- 5) Probation (manager + HR) ------------------------------------------------
create table probation (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  end_date    date,
  status      text not null default 'pending'
                check (status in ('pending','passed','extended','failed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  notes       text,
  updated_at  timestamptz not null default now()
);
create trigger t_probation_u before update on probation
  for each row execute function set_updated_at();

-- 6) Appraisals (manager + HR) ----------------------------------------------
create table appraisals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  due_date      date,
  scheduled_for date,
  status        text not null default 'due'
                  check (status in ('due','scheduled','completed')),
  rating        text,
  summary       text,
  conducted_by  uuid references auth.users(id) on delete set null,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index appraisals_user_idx on appraisals (user_id, due_date);
create trigger t_appraisals_u before update on appraisals
  for each row execute function set_updated_at();

-- 7) Return-to-work interviews (manager + HR) -------------------------------
create table rtw_interviews (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  absence_start date,
  absence_end   date,
  reason        text,
  notes         text,
  conducted_by  uuid references auth.users(id) on delete set null,
  conducted_at  date not null default current_date,
  created_at    timestamptz not null default now()
);
create index rtw_user_idx on rtw_interviews (user_id);

-- 8) TOIL ledger (manager + HR manage; employee views balance) --------------
create table toil_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  entry_date  date not null default current_date,
  hours       numeric(5,2) not null,           -- + earned, - taken
  reason      text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index toil_user_idx on toil_entries (user_id);

-- 9) Document vault metadata (HR-manage; self/HR-read) ----------------------
create table employee_documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  category     text not null default 'General',
  file_path    text not null,
  content_type text,
  uploaded_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index employee_documents_user_idx on employee_documents (user_id);

-- 10) Long-service awards (celebratory; readable by all staff) --------------
create table service_awards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  years      integer not null,
  awarded_on date not null default current_date,
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, years)
);

-- 11) Audit log (HR-readable) -----------------------------------------------
create table hr_audit (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references auth.users(id) on delete set null,
  subject_id uuid references auth.users(id) on delete set null,
  action     text not null,
  detail     text,
  created_at timestamptz not null default now()
);
create index hr_audit_subject_idx on hr_audit (subject_id, created_at);
