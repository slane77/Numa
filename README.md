# The Hub — Day Webster intranet

The internal hub for the Day Webster Group: company news, how-to guides, events,
holidays and who's working where. Built so the team can post updates, pictures
and videos with **no technical skill required**.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase
(Postgres, Auth, Storage, Row Level Security). Sign-in is via **Microsoft 365**
(with email as a fallback).

---

## What's built

- ✅ Microsoft 365 sign-in (Azure OAuth) + email fallback
- ✅ Staff directory (`profiles`) with roles: employee / editor / admin
- ✅ Editor **allow-list** — listed work emails become editors automatically on
  first sign-in (seeded with the comms team)
- ✅ **Home hub** — greeting, quick links, latest news, what's coming up
- ✅ **Company news** — create, edit, delete, pin, draft/publish
- ✅ **Events** — create with a graphic, RSVP (going/maybe/can't make it), and a
  photo/video gallery anyone can contribute to
- ✅ **Drag-and-drop media uploads** (images & short videos) to Supabase Storage
- ✅ Editable personal profile (name, job title, team, location)
- ✅ Navigable stubs for the next modules (Guides, Who's-in, Holidays)

### Roadmap (next phases)

Who's-working-where calendar → Holiday requests & approvals → How-to guides
(knowledge base) → Staff directory search.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable                        | Where        | Purpose                                |
| ------------------------------- | ------------ | -------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | public       | Supabase project URL                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public       | Supabase publishable/anon key          |
| `SUPABASE_SERVICE_ROLE_KEY`     | server only  | Optional — future admin tooling        |

---

## Database

Apply the SQL in `supabase/migrations/` (in order) to a Supabase project — via
the SQL editor, the Supabase CLI, or the MCP `apply_migration` tool:

- `0001_intranet.sql` — `profiles` + `news_posts`, enums, triggers, role helpers
- `0002_rls.sql` — Row Level Security (staff read; editors/admins write)
- `0003_storage.sql` — public `media` bucket for images/videos + write policies
- `0004_editor_allowlist.sql` — auto-grant editor role from an email allow-list
- `0005_events.sql` — `events`, `event_rsvps`, `event_media` + RLS
- `0006_storage_uploads.sql` — let all staff upload (for event galleries)

Regenerate `lib/types/database.ts` after schema changes with the Supabase CLI or
MCP `generate_typescript_types`.

### Roles

`profiles.role ∈ { employee, editor, admin }`.

- **employee** — read everything, edit own profile.
- **editor** — also create/edit news, upload media.
- **admin** — also manage any content and other people's roles.

Everyone signs in as `employee` unless their email is on the **editor
allow-list** (`editor_allowlist`), in which case they're granted that role the
first time they sign in. Add your team's work emails there:

```sql
insert into editor_allowlist (email, role, note) values
  ('scott.lane@daywebster.com',  'admin',  'Owner'),
  ('teammate@daywebster.com',    'editor', 'Comms team')
on conflict (email) do nothing;
```

`scott.lane@daywebster.com` (admin) and `rebecca.howell@daywebster.com` (editor)
are seeded in `0004_editor_allowlist.sql`. To change someone who has **already**
signed in, update their profile directly:

```sql
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'scott.lane@daywebster.com');
```

---

## Microsoft 365 sign-in (Azure)

So staff sign in with their existing work account:

1. In **Microsoft Entra / Azure AD → App registrations**, register an app.
   - Add a **Web** redirect URI:
     `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Create a **client secret** and note the **Application (client) ID** and the
     **Directory (tenant) ID**.
2. In **Supabase → Authentication → Providers → Azure**, enable it and paste the
   client ID, secret, and (for a single-tenant company login) the tenant URL
   `https://login.microsoftonline.com/<TENANT_ID>/v2.0`.
3. In **Supabase → Authentication → URL Configuration**, set the Site URL to your
   app's domain and add `https://<your-domain>/auth/callback` as a redirect URL.

Until Azure is wired up, use the **"Sign in with email"** fallback on the login
screen for local testing.

> Tip: to lock the intranet to staff only, restrict the Azure app to your
> company tenant and/or add an allow-list check on sign-up.

---

## Project structure

```
app/
  page.tsx              Redirects to /home (signed in) or /login
  login/                Microsoft 365 + email sign-in
  auth/                 OAuth callback + sign-out route handlers
  (hub)/                Authenticated app shell (top nav + footer)
    home/               The hub: greeting, quick links, news, upcoming events
    news/               News feed: list, view, create, edit (+ actions)
    events/             Events: list, view, create, edit, RSVP, gallery
    profile/            Edit your directory profile
    guides/             Planned modules (navigable stubs)
    calendar/ holidays/
components/             AppNav, NavMenu, Logo, PostCard, EventCard,
                        MediaUpload, ComingSoon
lib/
  supabase/             server / browser / admin / proxy clients
  auth/user.ts          user + profile + role helpers
  posts.ts              news queries (author-name joins)
  events.ts             event queries + date formatting + RSVPs
  news.ts               categories, colours, date formatting
  types/database.ts     Supabase types
supabase/migrations/    SQL schema, RLS, storage
proxy.ts                Session refresh + route gating
```

---

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel (Next.js auto-detected).
2. Add the environment variables above in **Project → Settings → Environment
   Variables**.
3. Configure Supabase auth URLs + the Azure provider (see above).
4. Deploy.
