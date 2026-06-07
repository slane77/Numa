-- Foundations for scale: AI rate limiting + real (server-controlled) billing.

-- 1) Lightweight per-user usage log for rate limiting AI features.
create table usage_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  feature    text not null,
  created_at timestamptz not null default now()
);
create index usage_events_user_feature_idx
  on usage_events(user_id, feature, created_at desc);

alter table usage_events enable row level security;
create policy usage_events_all on usage_events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2) Billing fields on profiles. These are written ONLY by the Stripe webhook
--    using the service role; never by end users.
alter table profiles
  add column stripe_customer_id     text,
  add column stripe_subscription_id text,
  add column subscription_status    text,
  add column current_period_end     timestamptz;

create index profiles_stripe_customer_idx on profiles(stripe_customer_id);

-- 3) Lock down tier + billing: restrict what authenticated users may UPDATE to
--    their own non-sensitive profile fields. `tier` and the billing columns are
--    therefore only writable by the service role (which bypasses RLS/grants).
--    This closes the hole where a user could self-promote to premium.
revoke update on public.profiles from authenticated;
grant update (display_name, dob, height_cm, sex, activity_level)
  on public.profiles to authenticated;
