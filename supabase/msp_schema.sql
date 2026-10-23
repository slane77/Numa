-- ============================================================================
--  Day Webster — Managed Service Provision (MSP) schema
--  Tables live in `public` with an msp_ prefix so they are API-exposed on any
--  Supabase project without touching the "Exposed schemas" setting.
--  Portable: paste the whole file into the SQL editor of another project.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------- helper: is the caller a Day Webster group user? ----------
create or replace function public.msp_is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select split_part(email,'@',2) in ('daywebster.com','urgentnursing.co.uk','homecareproviders.co.uk')
       from auth.users where id = auth.uid()),
    false);
$$;

-- ---------- services (one row per managed service / insourcing contract) ----------
create table if not exists public.msp_services (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  client        text not null,
  site          text,
  framework     text,                       -- e.g. RM6281 Lot 2, RM6276
  model         text not null default 'managed_service'
                check (model in ('managed_service','insourcing')),
  status        text not null default 'enquiry'
                check (status in ('enquiry','scoping','proposal','awarded','mobilising','live','closed','lost')),
  start_date    date,
  end_date      date,
  contact_name  text,
  contact_email text,
  contact_phone text,
  owner_name    text,                       -- DW lead
  summary       text,
  pricing       jsonb not null default '{}'::jsonb,  -- management fee, tariff, margin targets etc.
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- scoping / discovery answers ----------
create table if not exists public.msp_scoping (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.msp_services(id) on delete cascade,
  section     text not null,
  question    text not null,
  answer      text,
  status      text not null default 'open' check (status in ('open','answered','n/a')),
  sort        int not null default 0,
  updated_at  timestamptz not null default now()
);

-- ---------- roles & rates ----------
create table if not exists public.msp_roles (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid not null references public.msp_services(id) on delete cascade,
  title         text not null,              -- GP, ACP, Band 5 RN, Band 7 Lead, HCA
  grade         text,
  pay_std       numeric(8,2) not null default 0,   -- £/hr Mon–Fri
  pay_sat       numeric(8,2) not null default 0,
  pay_sun       numeric(8,2) not null default 0,   -- Sunday / bank holiday
  oncost_pct    numeric(5,2) not null default 0,   -- 0 if umbrella/all-in rate
  charge_std    numeric(8,2) not null default 0,
  charge_sat    numeric(8,2) not null default 0,
  charge_sun    numeric(8,2) not null default 0,
  rate_basis    text not null default 'umbrella' check (rate_basis in ('umbrella','paye','ltd')),
  price_cap     numeric(8,2),                      -- NHSE cap if applicable
  sort          int not null default 0
);

-- ---------- shift pattern (the service design) ----------
create table if not exists public.msp_shift_patterns (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.msp_services(id) on delete cascade,
  role_id     uuid not null references public.msp_roles(id) on delete cascade,
  dow         int  not null check (dow between 0 and 6),   -- 0=Sun … 6=Sat
  start_time  time not null,
  end_time    time not null,
  headcount   int  not null default 1,
  unpaid_break_mins int not null default 0
);

-- ---------- mobilisation plan ----------
create table if not exists public.msp_tasks (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.msp_services(id) on delete cascade,
  title       text not null,
  owner       text,
  due_date    date,
  status      text not null default 'todo' check (status in ('todo','doing','done','blocked')),
  notes       text,
  sort        int not null default 0,
  updated_at  timestamptz not null default now()
);

-- ---------- staffing pool ----------
create table if not exists public.msp_pool (
  id               uuid primary key default gen_random_uuid(),
  service_id       uuid not null references public.msp_services(id) on delete cascade,
  role_id          uuid references public.msp_roles(id) on delete set null,
  full_name        text not null,
  email            text,
  phone            text,
  employment_type  text default 'umbrella' check (employment_type in ('umbrella','paye','ltd')),
  compliance       text not null default 'pending' check (compliance in ('pending','in_progress','cleared','expired','failed')),
  compliance_ref   text,                    -- link/id into the Compliance Portal
  induction_done   boolean not null default false,
  reserve          boolean not null default false,
  active           boolean not null default true,
  notes            text,
  created_at       timestamptz not null default now()
);

-- ---------- rota shifts (generated from the pattern, then filled) ----------
create table if not exists public.msp_shifts (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid not null references public.msp_services(id) on delete cascade,
  role_id       uuid not null references public.msp_roles(id) on delete cascade,
  pool_id       uuid references public.msp_pool(id) on delete set null,
  shift_date    date not null,
  start_time    time not null,
  end_time      time not null,
  unpaid_break_mins int not null default 0,
  status        text not null default 'open'
                check (status in ('open','filled','confirmed','worked','sick','cancelled')),
  hours_worked  numeric(5,2),
  ts_status     text not null default 'pending' check (ts_status in ('pending','submitted','approved','invoiced','queried')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists msp_shifts_service_date on public.msp_shifts(service_id, shift_date);

-- ---------- incidents / complaints / escalations ----------
create table if not exists public.msp_incidents (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid not null references public.msp_services(id) on delete cascade,
  occurred_on  date not null default current_date,
  kind         text not null default 'incident' check (kind in ('incident','complaint','safeguarding','absence','escalation','other')),
  description  text not null,
  status       text not null default 'open' check (status in ('open','investigating','closed')),
  reported_by  text,
  created_at   timestamptz not null default now()
);

-- ---------- activity log ----------
create table if not exists public.msp_activity (
  id          bigserial primary key,
  service_id  uuid references public.msp_services(id) on delete cascade,
  actor       text,
  action      text not null,
  detail      text,
  created_at  timestamptz not null default now()
);

-- ---------- updated_at trigger ----------
create or replace function public.msp_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['msp_services','msp_scoping','msp_tasks','msp_shifts'] loop
    if not exists (select 1 from pg_trigger tg join pg_class c on c.oid=tg.tgrelid where c.relname=t and tg.tgname='touch') then
      execute format('create trigger touch before update on public.%I for each row execute function public.msp_touch()', t);
    end if;
  end loop; end $$;

-- ---------- RLS: group staff only ----------
do $$ declare t text; begin
  foreach t in array array['msp_services','msp_scoping','msp_roles','msp_shift_patterns','msp_tasks','msp_pool','msp_shifts','msp_incidents','msp_activity'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='staff_all') then
      execute format('create policy staff_all on public.%I for all to authenticated using (public.msp_is_staff()) with check (public.msp_is_staff())', t);
    end if;
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop; end $$;
grant usage, select on sequence public.msp_activity_id_seq to authenticated;

-- ---------- rota generation: create open shifts for a date range from the pattern ----------
create or replace function public.msp_generate_rota(p_service uuid, p_from date, p_to date)
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; d date; p record; i int; existing int;
begin
  if not public.msp_is_staff() then raise exception 'not allowed'; end if;
  d := p_from;
  while d <= p_to loop
    for p in select * from public.msp_shift_patterns where service_id = p_service and dow = extract(dow from d)::int loop
      select count(*) into existing from public.msp_shifts s
        where s.service_id = p_service and s.role_id = p.role_id and s.shift_date = d
          and s.start_time = p.start_time and s.end_time = p.end_time and s.status <> 'cancelled';
      if p.headcount > existing then
        for i in 1..(p.headcount - existing) loop
          insert into public.msp_shifts(service_id, role_id, shift_date, start_time, end_time, unpaid_break_mins)
          values (p_service, p.role_id, d, p.start_time, p.end_time, p.unpaid_break_mins);
          n := n + 1;
        end loop;
      end if;
    end loop;
    d := d + 1;
  end loop;
  return n;
end $$;
grant execute on function public.msp_generate_rota(uuid, date, date) to authenticated;
