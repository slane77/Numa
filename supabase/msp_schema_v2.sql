-- ============================================================================
--  MSP schema v2 — compliance checks, timesheet workflow, worker & client
--  tokens, invoicing, availability, documents, bank holidays, rate history.
--  Idempotent. Run after msp_schema.sql.
-- ============================================================================

-- ---------- services: tokens, lock window, invoice settings ----------
alter table public.msp_services
  add column if not exists client_token uuid not null default gen_random_uuid(),
  add column if not exists rota_lock_days int not null default 14,
  add column if not exists invoice_prefix text,
  add column if not exists invoice_terms_days int not null default 30,
  add column if not exists vat_rate numeric(5,2) not null default 20,
  add column if not exists po_ref text,
  add column if not exists billing_contact text,
  add column if not exists billing_address text,
  add column if not exists fee_period text not null default 'monthly' check (fee_period in ('weekly','monthly','none'));

-- ---------- pool: candidate pipeline, registration, worker token, limits ----------
alter table public.msp_pool
  add column if not exists candidate_id uuid,
  add column if not exists stage text not null default 'sourced' check (stage in ('sourced','interviewed','offered','compliance','cleared','inducted','left')),
  add column if not exists reg_body text,
  add column if not exists reg_number text,
  add column if not exists worker_token uuid not null default gen_random_uuid(),
  add column if not exists max_weekly_hours numeric(5,2) not null default 48,
  add column if not exists home_postcode text;

-- ---------- compliance checks per worker ----------
create table if not exists public.msp_pool_checks (
  id          uuid primary key default gen_random_uuid(),
  pool_id     uuid not null references public.msp_pool(id) on delete cascade,
  check_name  text not null,
  status      text not null default 'pending' check (status in ('pending','cleared','expired','failed','n/a')),
  expiry_date date,
  evidence_ref text,
  notes       text,
  updated_at  timestamptz not null default now(),
  unique (pool_id, check_name)
);

-- derived compliance: cleared only if every check is cleared/n/a and none expired
create or replace function public.msp_pool_compliance(p_pool uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when not exists (select 1 from public.msp_pool_checks where pool_id = p_pool) then 'pending'
    when exists (select 1 from public.msp_pool_checks where pool_id = p_pool and status = 'failed') then 'failed'
    when exists (select 1 from public.msp_pool_checks where pool_id = p_pool and (status = 'expired' or (status = 'cleared' and expiry_date is not null and expiry_date < current_date))) then 'expired'
    when exists (select 1 from public.msp_pool_checks where pool_id = p_pool and status = 'pending') then 'in_progress'
    else 'cleared' end;
$$;
create or replace function public.msp_sync_pool_compliance() returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid; begin
  pid := coalesce(new.pool_id, old.pool_id);
  update public.msp_pool set compliance = public.msp_pool_compliance(pid) where id = pid;
  return null; end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'sync_compliance') then
    create trigger sync_compliance after insert or update or delete on public.msp_pool_checks for each row execute function public.msp_sync_pool_compliance();
  end if; end $$;

-- default check set by role title keyword
create or replace function public.msp_default_checks(p_pool uuid) returns int
language plpgsql security definer set search_path = public as $$
declare t text; base text[]; extra text[]; n int := 0; c text;
begin
  select lower(coalesce(r.title,'') || ' ' || coalesce(r.grade,'')) into t from public.msp_pool p left join public.msp_roles r on r.id = p.role_id where p.id = p_pool;
  base := array['Right to work','Enhanced DBS (update service)','ID & address','References x2','Occupational health / immunisations','Mandatory & statutory training','Professional indemnity','Client induction','IR35 / engagement paperwork'];
  if t ~ '(gp|doctor|medical|registrar|consultant)' then extra := array['GMC registration & licence','Performers List (England)','Appraisal / revalidation date','Basic Life Support'];
  elsif t ~ '(nurse|rn|rmn|band 5|band 6|band 7|lead)' then extra := array['NMC PIN','Revalidation date','Immediate Life Support'];
  elsif t ~ '(acp|anp|enp|paramedic|physio|hcpc)' then extra := array['NMC / HCPC registration','Non-medical prescribing (if applicable)','Immediate Life Support'];
  else extra := array['Care Certificate / equivalent','Basic Life Support']; end if;
  foreach c in array base || extra loop
    insert into public.msp_pool_checks(pool_id, check_name) values (p_pool, c) on conflict do nothing; n := n + 1;
  end loop;
  return n; end $$;
grant execute on function public.msp_default_checks(uuid) to authenticated;

-- ---------- shifts: timesheet workflow + invoice link ----------
alter table public.msp_shifts
  add column if not exists worker_hours numeric(5,2),
  add column if not exists worker_notes text,
  add column if not exists worker_submitted_at timestamptz,
  add column if not exists worker_accepted_at timestamptz,
  add column if not exists client_approved_at timestamptz,
  add column if not exists client_approved_by text,
  add column if not exists dw_approved_at timestamptz,
  add column if not exists dw_approved_by text,
  add column if not exists query_note text,
  add column if not exists invoice_id uuid,
  add column if not exists published boolean not null default false,
  add column if not exists is_cover_for uuid references public.msp_shifts(id) on delete set null;

-- ---------- availability ----------
create table if not exists public.msp_availability (
  id       uuid primary key default gen_random_uuid(),
  pool_id  uuid not null references public.msp_pool(id) on delete cascade,
  day      date not null,
  status   text not null default 'available' check (status in ('available','unavailable','preferred')),
  unique (pool_id, day)
);

-- ---------- rota publications / lock ----------
create table if not exists public.msp_rota_publications (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.msp_services(id) on delete cascade,
  week_start  date not null,
  published_at timestamptz not null default now(),
  published_by text,
  unique (service_id, week_start)
);

-- ---------- bank holidays (England & Wales) ----------
create table if not exists public.msp_bank_holidays (day date primary key, name text not null);
insert into public.msp_bank_holidays(day, name) values
 ('2026-12-25','Christmas Day'),('2026-12-28','Boxing Day (substitute)'),('2027-01-01','New Year''s Day'),('2027-03-26','Good Friday'),('2027-03-29','Easter Monday'),
 ('2027-05-03','Early May bank holiday'),('2027-05-31','Spring bank holiday'),('2027-08-30','Summer bank holiday'),('2027-12-27','Christmas Day (substitute)'),('2027-12-28','Boxing Day (substitute)')
on conflict do nothing;

-- ---------- invoices ----------
create sequence if not exists public.msp_invoice_seq start 1001;
create table if not exists public.msp_invoices (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid not null references public.msp_services(id) on delete cascade,
  number       text not null unique,
  kind         text not null default 'invoice' check (kind in ('invoice','credit_note')),
  period_from  date not null,
  period_to    date not null,
  po_ref       text,
  status       text not null default 'draft' check (status in ('draft','sent','paid','void')),
  subtotal     numeric(12,2) not null default 0,
  vat_rate     numeric(5,2) not null default 20,
  vat          numeric(12,2) not null default 0,
  total        numeric(12,2) not null default 0,
  notes        text,
  credits_invoice_id uuid references public.msp_invoices(id),
  created_at   timestamptz not null default now(),
  created_by   text,
  sent_at      timestamptz,
  paid_at      timestamptz,
  due_date     date
);
create table if not exists public.msp_invoice_lines (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.msp_invoices(id) on delete cascade,
  kind        text not null default 'shift' check (kind in ('shift','fee','extra','credit')),
  shift_id    uuid references public.msp_shifts(id) on delete set null,
  description text not null,
  qty         numeric(10,2) not null default 1,
  unit        text not null default 'hrs',
  rate        numeric(10,2) not null default 0,
  amount      numeric(12,2) not null default 0,
  sort        int not null default 0
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'msp_shifts_invoice_fk') then
    alter table public.msp_shifts add constraint msp_shifts_invoice_fk foreign key (invoice_id) references public.msp_invoices(id) on delete set null;
  end if; end $$;

-- ---------- documents ----------
create table if not exists public.msp_documents (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.msp_services(id) on delete cascade,
  pool_id     uuid references public.msp_pool(id) on delete cascade,
  name        text not null,
  kind        text not null default 'other' check (kind in ('contract','call_off','sds_ir35','indemnity','rate_card','induction','timesheet','invoice','compliance','other')),
  storage_path text not null,
  uploaded_by text,
  created_at  timestamptz not null default now()
);
insert into storage.buckets (id, name, public) values ('msp-docs','msp-docs', false) on conflict do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='msp_docs_staff') then
    create policy msp_docs_staff on storage.objects for all to authenticated using (bucket_id = 'msp-docs' and public.msp_is_staff()) with check (bucket_id = 'msp-docs' and public.msp_is_staff());
  end if; end $$;

-- ---------- rate history ----------
create table if not exists public.msp_rate_history (
  id          bigserial primary key,
  role_id     uuid not null references public.msp_roles(id) on delete cascade,
  changed_at  timestamptz not null default now(),
  changed_by  text,
  old_rates   jsonb,
  new_rates   jsonb
);
create or replace function public.msp_rate_audit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (old.pay_std,old.pay_sat,old.pay_sun,old.charge_std,old.charge_sat,old.charge_sun,old.oncost_pct,old.price_cap) is distinct from (new.pay_std,new.pay_sat,new.pay_sun,new.charge_std,new.charge_sat,new.charge_sun,new.oncost_pct,new.price_cap) then
    insert into public.msp_rate_history(role_id, changed_by, old_rates, new_rates) values (new.id, (select email from auth.users where id = auth.uid()),
      jsonb_build_object('pay_std',old.pay_std,'pay_sat',old.pay_sat,'pay_sun',old.pay_sun,'charge_std',old.charge_std,'charge_sat',old.charge_sat,'charge_sun',old.charge_sun,'oncost_pct',old.oncost_pct,'price_cap',old.price_cap),
      jsonb_build_object('pay_std',new.pay_std,'pay_sat',new.pay_sat,'pay_sun',new.pay_sun,'charge_std',new.charge_std,'charge_sat',new.charge_sat,'charge_sun',new.charge_sun,'oncost_pct',new.oncost_pct,'price_cap',new.price_cap));
  end if; return new; end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'rate_audit') then
    create trigger rate_audit after update on public.msp_roles for each row execute function public.msp_rate_audit();
  end if; end $$;

-- ---------- RLS for new tables ----------
do $$ declare t text; begin
  foreach t in array array['msp_pool_checks','msp_availability','msp_rota_publications','msp_invoices','msp_invoice_lines','msp_documents','msp_rate_history','msp_bank_holidays'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='staff_all') then
      execute format('create policy staff_all on public.%I for all to authenticated using (public.msp_is_staff()) with check (public.msp_is_staff())', t);
    end if;
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop; end $$;
grant usage, select on sequence public.msp_rate_history_id_seq, public.msp_invoice_seq to authenticated;

-- ============================================================================
--  Rate helpers
-- ============================================================================
create or replace function public.msp_day_type(d date) returns text language sql stable as $$
  select case when exists (select 1 from public.msp_bank_holidays b where b.day = d) then 'sun'
              when extract(dow from d) = 0 then 'sun' when extract(dow from d) = 6 then 'sat' else 'std' end;
$$;
create or replace function public.msp_shift_hours(s public.msp_shifts) returns numeric language sql stable as $$
  select coalesce(s.hours_worked, s.worker_hours,
    greatest(0, (extract(epoch from (s.end_time - s.start_time)) / 3600.0 + case when s.end_time <= s.start_time then 24 else 0 end) - s.unpaid_break_mins / 60.0))::numeric(6,2);
$$;

-- ============================================================================
--  Worker-facing RPCs (token based, no login). Anon may execute.
-- ============================================================================
create or replace function public.msp_worker_home(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare w record; out jsonb;
begin
  select p.*, r.title as role_title, s.name as service_name, s.client, s.site, s.id as sid into w
    from public.msp_pool p join public.msp_services s on s.id = p.service_id left join public.msp_roles r on r.id = p.role_id
   where p.worker_token = p_token and p.active;
  if w is null then return null; end if;
  select jsonb_build_object(
    'worker', jsonb_build_object('name', w.full_name, 'role', w.role_title, 'service', w.service_name, 'client', w.client, 'site', w.site, 'compliance', w.compliance),
    'my_shifts', coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'date',x.shift_date,'start',x.start_time,'end',x.end_time,'break',x.unpaid_break_mins,'status',x.status,'ts_status',x.ts_status,'worker_hours',x.worker_hours,'hours_worked',x.hours_worked,'worker_notes',x.worker_notes,'accepted',x.worker_accepted_at is not null,'submitted',x.worker_submitted_at is not null,'query',x.query_note,'planned_hours',public.msp_shift_hours(x)) order by x.shift_date, x.start_time)
        from public.msp_shifts x where x.pool_id = w.id and x.shift_date >= current_date - 42 and x.status <> 'cancelled'), '[]'::jsonb),
    'open_shifts', coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'date',x.shift_date,'start',x.start_time,'end',x.end_time,'role',r.title) order by x.shift_date, x.start_time)
        from public.msp_shifts x join public.msp_roles r on r.id = x.role_id
        where x.service_id = w.sid and x.status = 'open' and x.published and x.shift_date >= current_date and (w.role_id is null or x.role_id = w.role_id)), '[]'::jsonb),
    'availability', coalesce((select jsonb_object_agg(a.day, a.status) from public.msp_availability a where a.pool_id = w.id and a.day >= current_date - 7), '{}'::jsonb)
  ) into out;
  return out; end $$;

create or replace function public.msp_worker_accept(p_token uuid, p_shift uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare w record; n int;
begin
  select * into w from public.msp_pool where worker_token = p_token and active; if w is null then return false; end if;
  if w.compliance <> 'cleared' then raise exception 'Compliance not cleared — contact the Day Webster team'; end if;
  -- accept own filled shift
  update public.msp_shifts set worker_accepted_at = now(), status = case when status = 'filled' then 'confirmed' else status end
   where id = p_shift and pool_id = w.id; get diagnostics n = row_count; if n > 0 then return true; end if;
  -- or claim an open published shift (first to accept wins)
  update public.msp_shifts set pool_id = w.id, status = 'confirmed', worker_accepted_at = now()
   where id = p_shift and pool_id is null and status = 'open' and published and service_id = w.service_id and (w.role_id is null or role_id = w.role_id);
  get diagnostics n = row_count;
  if n > 0 then insert into public.msp_activity(service_id, actor, action, detail) values (w.service_id, w.full_name, 'shift', 'accepted open shift ' || p_shift); end if;
  return n > 0; end $$;

create or replace function public.msp_worker_submit(p_token uuid, p_shift uuid, p_hours numeric, p_notes text) returns boolean
language plpgsql security definer set search_path = public as $$
declare w record; n int;
begin
  select * into w from public.msp_pool where worker_token = p_token and active; if w is null then return false; end if;
  update public.msp_shifts set worker_hours = p_hours, worker_notes = p_notes, worker_submitted_at = now(), ts_status = 'submitted',
         status = case when status in ('filled','confirmed') then 'worked' else status end
   where id = p_shift and pool_id = w.id and ts_status in ('pending','queried') and shift_date <= current_date;
  get diagnostics n = row_count; return n > 0; end $$;

create or replace function public.msp_worker_availability(p_token uuid, p_days jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare w record; k text; v text; n int := 0;
begin
  select * into w from public.msp_pool where worker_token = p_token and active; if w is null then return 0; end if;
  for k, v in select * from jsonb_each_text(p_days) loop
    if v = 'clear' then delete from public.msp_availability where pool_id = w.id and day = k::date;
    else insert into public.msp_availability(pool_id, day, status) values (w.id, k::date, v) on conflict (pool_id, day) do update set status = excluded.status; end if;
    n := n + 1;
  end loop; return n; end $$;

grant execute on function public.msp_worker_home(uuid), public.msp_worker_accept(uuid, uuid), public.msp_worker_submit(uuid, uuid, numeric, text), public.msp_worker_availability(uuid, jsonb) to anon, authenticated;

-- ============================================================================
--  Client-facing RPCs (token based)
-- ============================================================================
create or replace function public.msp_client_home(p_token uuid, p_week date default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s record; ws date; out jsonb;
begin
  select * into s from public.msp_services where client_token = p_token; if s is null then return null; end if;
  ws := coalesce(p_week, (current_date - ((extract(dow from current_date)::int + 6) % 7)));
  select jsonb_build_object(
    'service', jsonb_build_object('name', s.name, 'client', s.client, 'site', s.site, 'status', s.status, 'week_start', ws),
    'rota', coalesce((select jsonb_agg(jsonb_build_object('date',x.shift_date,'start',x.start_time,'end',x.end_time,'role',r.title,'status',x.status,'worker',case when x.status in ('filled','confirmed','worked') then p.full_name end) order by x.shift_date, r.sort, x.start_time)
        from public.msp_shifts x join public.msp_roles r on r.id = x.role_id left join public.msp_pool p on p.id = x.pool_id
        where x.service_id = s.id and x.shift_date between ws and ws + 6 and x.status <> 'cancelled'), '[]'::jsonb),
    'pending_timesheets', coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'date',x.shift_date,'start',x.start_time,'end',x.end_time,'role',r.title,'worker',p.full_name,'hours',public.msp_shift_hours(x),'notes',x.worker_notes) order by x.shift_date)
        from public.msp_shifts x join public.msp_roles r on r.id = x.role_id left join public.msp_pool p on p.id = x.pool_id
        where x.service_id = s.id and x.ts_status = 'submitted' and x.client_approved_at is null), '[]'::jsonb),
    'kpis', (select jsonb_build_object(
        'fill_14d', (select case when count(*) = 0 then null else round(100.0 * count(*) filter (where status in ('filled','confirmed','worked')) / count(*), 0) end from public.msp_shifts where service_id = s.id and shift_date between current_date and current_date + 14 and status <> 'cancelled'),
        'fill_4w', (select case when count(*) = 0 then null else round(100.0 * count(*) filter (where status in ('confirmed','worked')) / count(*), 0) end from public.msp_shifts where service_id = s.id and shift_date between current_date - 28 and current_date - 1 and status <> 'cancelled'),
        'hours_4w', (select coalesce(sum(public.msp_shift_hours(x)),0) from public.msp_shifts x where x.service_id = s.id and x.status = 'worked' and x.shift_date between current_date - 28 and current_date - 1),
        'sick_4w', (select count(*) from public.msp_shifts where service_id = s.id and status = 'sick' and shift_date between current_date - 28 and current_date - 1),
        'open_incidents', (select count(*) from public.msp_incidents where service_id = s.id and status <> 'closed'))),
    'incidents', coalesce((select jsonb_agg(jsonb_build_object('date',i.occurred_on,'kind',i.kind,'status',i.status) order by i.occurred_on desc) from (select * from public.msp_incidents where service_id = s.id order by occurred_on desc limit 10) i), '[]'::jsonb),
    'invoices', coalesce((select jsonb_agg(jsonb_build_object('number',i.number,'period_from',i.period_from,'period_to',i.period_to,'total',i.total,'status',i.status,'due',i.due_date) order by i.created_at desc) from public.msp_invoices i where i.service_id = s.id and i.status <> 'draft'), '[]'::jsonb)
  ) into out; return out; end $$;

create or replace function public.msp_client_approve(p_token uuid, p_shifts uuid[], p_by text, p_query text default null) returns int
language plpgsql security definer set search_path = public as $$
declare s record; n int;
begin
  select * into s from public.msp_services where client_token = p_token; if s is null then return 0; end if;
  if p_query is null then
    update public.msp_shifts set client_approved_at = now(), client_approved_by = p_by where service_id = s.id and id = any(p_shifts) and ts_status = 'submitted';
  else
    update public.msp_shifts set ts_status = 'queried', query_note = p_query where service_id = s.id and id = any(p_shifts) and ts_status = 'submitted';
  end if;
  get diagnostics n = row_count;
  insert into public.msp_activity(service_id, actor, action, detail) values (s.id, p_by, 'client', case when p_query is null then 'approved ' || n || ' timesheets' else 'queried ' || n || ' timesheets: ' || p_query end);
  return n; end $$;
grant execute on function public.msp_client_home(uuid, date), public.msp_client_approve(uuid, uuid[], text, text) to anon, authenticated;

-- ============================================================================
--  Invoicing
-- ============================================================================
create or replace function public.msp_build_invoice(p_service uuid, p_from date, p_to date, p_include_fee boolean default true, p_extras jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare s record; inv uuid; num text; sub numeric := 0; x record; h numeric; rate numeric; fee numeric := 0; e jsonb; i int := 0; who text;
begin
  if not public.msp_is_staff() then raise exception 'not allowed'; end if;
  select * into s from public.msp_services where id = p_service;
  select email into who from auth.users where id = auth.uid();
  num := coalesce(nullif(s.invoice_prefix,''), 'DW') || '-' || nextval('public.msp_invoice_seq');
  insert into public.msp_invoices(service_id, number, period_from, period_to, po_ref, vat_rate, created_by, due_date)
    values (p_service, num, p_from, p_to, s.po_ref, s.vat_rate, who, current_date + s.invoice_terms_days) returning id into inv;
  for x in select sh.id, sh.shift_date, sh.start_time, sh.end_time, public.msp_shift_hours(sh) as hrs, r.title, r.charge_std, r.charge_sat, r.charge_sun, p.full_name
             from public.msp_shifts sh join public.msp_roles r on r.id = sh.role_id left join public.msp_pool p on p.id = sh.pool_id
            where sh.service_id = p_service and sh.shift_date between p_from and p_to and sh.status = 'worked' and sh.ts_status = 'approved' and sh.invoice_id is null
            order by sh.shift_date, r.sort loop
    h := x.hrs;
    rate := case public.msp_day_type(x.shift_date) when 'sun' then x.charge_sun when 'sat' then x.charge_sat else x.charge_std end;
    i := i + 1;
    insert into public.msp_invoice_lines(invoice_id, kind, shift_id, description, qty, unit, rate, amount, sort)
      values (inv, 'shift', x.id, to_char(x.shift_date,'Dy DD Mon') || ' · ' || x.title || ' · ' || coalesce(x.full_name,'') || ' · ' || to_char(x.start_time,'HH24:MI') || '–' || to_char(x.end_time,'HH24:MI'), h, 'hrs', rate, round(h * rate, 2), i);
    sub := sub + round(h * rate, 2);
    update public.msp_shifts set invoice_id = inv, ts_status = 'invoiced' where id = x.id;
  end loop;
  if p_include_fee and s.fee_period <> 'none' then
    fee := case s.fee_period when 'monthly' then coalesce((s.pricing->>'mgmt_fee_monthly')::numeric, 0) else coalesce((s.pricing->>'mgmt_fee_monthly')::numeric, 0) * 12 / 52 end;
    if fee > 0 then i := i + 1; insert into public.msp_invoice_lines(invoice_id, kind, description, qty, unit, rate, amount, sort) values (inv, 'fee', 'Managed service fee · ' || to_char(p_from,'DD Mon') || ' – ' || to_char(p_to,'DD Mon YYYY'), 1, s.fee_period, fee, fee, i); sub := sub + fee; end if;
  end if;
  for e in select * from jsonb_array_elements(p_extras) loop
    i := i + 1;
    insert into public.msp_invoice_lines(invoice_id, kind, description, qty, unit, rate, amount, sort)
      values (inv, 'extra', e->>'description', coalesce((e->>'qty')::numeric,1), coalesce(e->>'unit','each'), coalesce((e->>'rate')::numeric,0), round(coalesce((e->>'qty')::numeric,1) * coalesce((e->>'rate')::numeric,0), 2), i);
    sub := sub + round(coalesce((e->>'qty')::numeric,1) * coalesce((e->>'rate')::numeric,0), 2);
  end loop;
  update public.msp_invoices set subtotal = sub, vat = round(sub * s.vat_rate / 100, 2), total = sub + round(sub * s.vat_rate / 100, 2) where id = inv;
  insert into public.msp_activity(service_id, actor, action, detail) values (p_service, who, 'invoice', 'built ' || num || ' for ' || p_from || '–' || p_to || ' (' || i || ' lines, £' || sub || ')');
  return inv; end $$;

create or replace function public.msp_credit_invoice(p_invoice uuid, p_amount numeric, p_reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare o record; cn uuid; num text; who text;
begin
  if not public.msp_is_staff() then raise exception 'not allowed'; end if;
  select * into o from public.msp_invoices where id = p_invoice; select email into who from auth.users where id = auth.uid();
  num := split_part(o.number,'-',1) || '-CN-' || nextval('public.msp_invoice_seq');
  insert into public.msp_invoices(service_id, number, kind, period_from, period_to, po_ref, status, subtotal, vat_rate, vat, total, notes, credits_invoice_id, created_by)
    values (o.service_id, num, 'credit_note', o.period_from, o.period_to, o.po_ref, 'sent', -p_amount, o.vat_rate, -round(p_amount * o.vat_rate / 100, 2), -(p_amount + round(p_amount * o.vat_rate / 100, 2)), p_reason, o.id, who) returning id into cn;
  insert into public.msp_invoice_lines(invoice_id, kind, description, qty, unit, rate, amount) values (cn, 'credit', 'Credit against ' || o.number || ': ' || p_reason, 1, 'each', -p_amount, -p_amount);
  return cn; end $$;

create or replace function public.msp_void_invoice(p_invoice uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.msp_is_staff() then raise exception 'not allowed'; end if;
  update public.msp_shifts set invoice_id = null, ts_status = 'approved' where invoice_id = p_invoice;
  update public.msp_invoices set status = 'void' where id = p_invoice and status = 'draft';
end $$;
grant execute on function public.msp_build_invoice(uuid, date, date, boolean, jsonb), public.msp_credit_invoice(uuid, numeric, text), public.msp_void_invoice(uuid) to authenticated;

-- ============================================================================
--  Rostering helpers
-- ============================================================================
-- eligible workers for a shift, with reasons
create or replace function public.msp_eligible(p_shift uuid) returns table(pool_id uuid, full_name text, compliance text, reserve boolean, availability text, week_hours numeric, max_weekly_hours numeric, already_on boolean, score int)
language sql stable security definer set search_path = public as $$
  with sh as (select * from public.msp_shifts where id = p_shift),
  wk as (select (sh.shift_date - ((extract(dow from sh.shift_date)::int + 6) % 7)) as ws from sh)
  select p.id, p.full_name, p.compliance, p.reserve,
         (select a.status from public.msp_availability a where a.pool_id = p.id and a.day = sh.shift_date) as availability,
         coalesce((select sum(public.msp_shift_hours(x)) from public.msp_shifts x, wk where x.pool_id = p.id and x.status in ('filled','confirmed','worked') and x.shift_date between wk.ws and wk.ws + 6), 0) as week_hours,
         p.max_weekly_hours,
         exists (select 1 from public.msp_shifts x where x.pool_id = p.id and x.shift_date = sh.shift_date and x.status in ('filled','confirmed','worked') and x.id <> sh.id) as already_on,
         (case when p.compliance = 'cleared' then 40 else 0 end) + (case (select a.status from public.msp_availability a where a.pool_id = p.id and a.day = sh.shift_date) when 'preferred' then 30 when 'available' then 20 when 'unavailable' then -100 else 5 end) + (case when p.reserve then -5 else 10 end) as score
    from public.msp_pool p, sh
   where p.service_id = sh.service_id and p.active and (p.role_id is null or p.role_id = sh.role_id)
   order by score desc, p.full_name;
$$;
grant execute on function public.msp_eligible(uuid) to authenticated;

-- mark sick: creates a cover shift linked to the original
create or replace function public.msp_mark_sick(p_shift uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare o record; c uuid; who text;
begin
  if not public.msp_is_staff() then raise exception 'not allowed'; end if;
  select * into o from public.msp_shifts where id = p_shift; select email into who from auth.users where id = auth.uid();
  update public.msp_shifts set status = 'sick' where id = p_shift;
  insert into public.msp_shifts(service_id, role_id, shift_date, start_time, end_time, unpaid_break_mins, published, is_cover_for, notes)
    values (o.service_id, o.role_id, o.shift_date, o.start_time, o.end_time, o.unpaid_break_mins, true, o.id, 'Cover for sickness') returning id into c;
  insert into public.msp_activity(service_id, actor, action, detail) values (o.service_id, who, 'sick', 'shift ' || o.shift_date || ' marked sick; cover shift opened');
  return c; end $$;
grant execute on function public.msp_mark_sick(uuid) to authenticated;

-- publish a week: flags shifts published, records publication
create or replace function public.msp_publish_week(p_service uuid, p_week date) returns int
language plpgsql security definer set search_path = public as $$
declare n int; who text;
begin
  if not public.msp_is_staff() then raise exception 'not allowed'; end if;
  select email into who from auth.users where id = auth.uid();
  update public.msp_shifts set published = true where service_id = p_service and shift_date between p_week and p_week + 6 and status <> 'cancelled';
  get diagnostics n = row_count;
  insert into public.msp_rota_publications(service_id, week_start, published_by) values (p_service, p_week, who) on conflict (service_id, week_start) do update set published_at = now(), published_by = excluded.published_by;
  insert into public.msp_activity(service_id, actor, action, detail) values (p_service, who, 'rota', 'published week of ' || p_week || ' (' || n || ' shifts)');
  return n; end $$;
grant execute on function public.msp_publish_week(uuid, date) to authenticated;

-- ============================================================================
--  Actuals vs plan, by week
-- ============================================================================
create or replace function public.msp_weekly_actuals(p_service uuid, p_from date, p_to date)
returns table(week_start date, shifts int, filled int, worked int, sick int, hours numeric, cost numeric, charge numeric)
language sql stable security definer set search_path = public as $$
  select (x.shift_date - ((extract(dow from x.shift_date)::int + 6) % 7)) as week_start,
         count(*)::int, count(*) filter (where x.status in ('filled','confirmed','worked'))::int, count(*) filter (where x.status = 'worked')::int, count(*) filter (where x.status = 'sick')::int,
         coalesce(sum(public.msp_shift_hours(x)) filter (where x.status = 'worked'), 0),
         coalesce(sum(public.msp_shift_hours(x) * (case public.msp_day_type(x.shift_date) when 'sun' then r.pay_sun when 'sat' then r.pay_sat else r.pay_std end) * (1 + r.oncost_pct / 100)) filter (where x.status = 'worked'), 0),
         coalesce(sum(public.msp_shift_hours(x) * (case public.msp_day_type(x.shift_date) when 'sun' then r.charge_sun when 'sat' then r.charge_sat else r.charge_std end)) filter (where x.status = 'worked'), 0)
    from public.msp_shifts x join public.msp_roles r on r.id = x.role_id
   where x.service_id = p_service and x.shift_date between p_from and p_to and x.status <> 'cancelled'
   group by 1 order by 1;
$$;
grant execute on function public.msp_weekly_actuals(uuid, date, date) to authenticated;
