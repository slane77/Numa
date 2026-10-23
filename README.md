# Day Webster — Managed Services & Compliance Portal

The front door (`/`, `/msp`, `/services` → `msp.html`) is the **Managed
Services** system: it runs a managed-service or insourcing contract from first
enquiry to invoice — scoping questions, service design (roles, rates, weekly
shift pattern), pricing model (hourly + management fee, or tariff-discount for
insourcing), mobilisation plan, staffing pool, rota generation and fill,
timesheets / invoice export, incidents and MI.

- Code: `msp.html` + `js/msp.js` (staff app); `worker.html?t=<token>`
  (worker's personal page: confirm shifts, take open shifts, availability,
  submit hours); `client.html?t=<token>` (Trust portal: rota, fill rate,
  approve/query timesheets, invoices); `invoice.html?id=` (printable
  invoice + backing schedule, staff login).
- Schema: `supabase/msp_schema.sql` then `supabase/msp_schema_v2.sql`
  (`public.msp_*` tables, RLS restricted to group email domains; token RPCs
  for the worker and client pages; `msp_build_invoice`, `msp_generate_rota`,
  `msp_publish_week`, `msp_mark_sick`, `msp_eligible`, `msp_weekly_actuals`).
- Timesheet flow: worker submits → client approves (portal) → DW approves →
  `msp_build_invoice` rolls approved shifts + fee + extras into one invoice
  and locks them. Compliance is derived from `msp_pool_checks` (any pending =
  in progress; expired/failed block assignment; worker can't accept shifts
  until cleared).
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
