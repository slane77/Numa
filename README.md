# Day Webster — Compliance Portal

This project hosts the **Day Webster Compliance Portal** — an audit-grade
compliance and candidate-pipeline system for healthcare staffing.

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
