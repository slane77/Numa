-- Security hardening (addresses Supabase database linter warnings)

-- 1) Pin search_path on the updated_at trigger helper so it can't be hijacked.
create or replace function set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

-- 2) handle_new_user() is a trigger function only; it must never be callable as
--    an RPC by API roles. Triggers fire as the table owner regardless, so
--    revoking EXECUTE from the exposed roles does not affect signup.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
