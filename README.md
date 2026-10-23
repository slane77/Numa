# Day Webster — Managed Services & Compliance Portal

The front door (`/`, `/msp`, `/services` → `msp.html`) is the **Managed
Services** system: it runs a managed-service or insourcing contract from first
enquiry to invoice — scoping questions, service design (roles, rates, weekly
shift pattern), pricing model (hourly + management fee, or tariff-discount for
insourcing), mobilisation plan, staffing pool, rota generation and fill,
timesheets / invoice export, incidents and MI.

- Code: `msp.html` + `js/msp.js`; schema: `supabase/msp_schema.sql`
  (`public.msp_*` tables, RLS restricted to group email domains).
- Backend: the `MSP_SUPABASE_*` values in `js/config.js`. The msp tables
  currently run on the *Urgent Staffing Outreach* project; to move them to the
  Numa project run `supabase/msp_schema.sql` there and repoint the two values.
- Sign in with the same Day Webster email/password as the Outreach app.

Underneath it this project still hosts the **Day Webster Compliance Portal**
(`dashboard.html` and friends) — an audit-grade compliance and
candidate-pipeline system for healthcare staffing.

It is a static site (HTML + `js/` + `dw-theme.css`) served by Vercel and backed
by a Supabase project (`candidate` schema) for data, auth, storage and edge
functions. The front door is `dashboard.html`; clean URLs are configured in
`vercel.json`.

> The previous Next.js "Hub" intranet that lived on this branch has been
> replaced by the Compliance Portal. Its history is preserved in git and on the
> other branches of this repository.

## Configuration

`js/config.js` holds the Supabase project URL and publishable (anon) key. Both
are safe to commit — access is protected by Row Level Security, not key secrecy.
