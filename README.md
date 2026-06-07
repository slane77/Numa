# Numa

AI meal planning that knows what's already in your kitchen. Numa builds meal
plans and shopping lists around your existing pantry to cut food waste and
spend, while helping you hit your health goals.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase
(Postgres, Auth, RLS) · Anthropic Claude (AI meal planning).

---

## Phase 1 (this build)

- ✅ Next.js + TypeScript + Tailwind scaffold, App Router
- ✅ Supabase server + browser clients, session refresh in `proxy.ts`
- ✅ Schema + Row Level Security migrated to Supabase, typed DB client generated
- ✅ Email auth (sign up / sign in) + onboarding (profile, first goal, starting weight)
- ✅ Weight tracking (free): log weights + trend chart toward target
- ✅ Tier gating via `requirePremium()` server guard (Stripe deferred)
- ✅ AI meal-plan API route (`/api/meal-plan`) with Claude structured tool-use

### Feature build order (next phases)

goals → food preferences → pantry inventory → recipes/ingredients →
manual meal planning → AI meal planning (premium) → shopping list generation →
protein/calorie rollups.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable                        | Where           | Purpose                                            |
| ------------------------------- | --------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | public          | Supabase project URL                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public          | Supabase publishable/anon key                      |
| `ANTHROPIC_API_KEY`             | **server only** | Claude API key for AI meal planning                |
| `NUMA_MEAL_PLAN_MODEL`          | optional        | Override quality model (default `claude-opus-4-8`) |
| `NUMA_MEAL_PLAN_MODEL_FAST`     | optional        | Override fast model (default `claude-sonnet-4-6`)  |

The Anthropic key is read only on the server (no `NEXT_PUBLIC_` prefix) and is
never sent to the browser.

---

## Database

The Supabase project is migrated via the SQL in `supabase/`:

- `migrations/0001_init.sql` — tables, enums, triggers, auto-profile-on-signup
- `migrations/0002_rls.sql` — Row Level Security (owner-scoped) on every table
- `migrations/0003_hardening.sql` — pins function `search_path`, locks down the
  signup trigger function (clears the Supabase security linter)
- `seed.sql` — optional public starter recipes (attach to a system user)

Regenerate the typed client (`lib/types/database.ts`) after schema changes with
the Supabase CLI or MCP `generate_typescript_types`.

### Data model (11 tables)

`profiles` · `goals` · `weight_logs` · `food_preferences` · `inventory` ·
`recipes` · `recipe_ingredients` · `meal_plans` · `meal_plan_items` ·
`shopping_lists` · `shopping_list_items`

Every table has RLS enabled and is scoped to the owning user (`auth.uid()`);
recipes additionally allow public read when `is_public = true`.

---

## Tiers

`profiles.tier ∈ { free, premium }`.

- **Free:** weight tracking, manual meal planning, shopping lists.
- **Premium:** AI meal planning, pantry intelligence, goal forecasting, event
  mode, family planning, advanced shopping optimisation.

Premium features are gated server-side with `requirePremium()`
(`lib/auth/requirePremium.ts`), which returns HTTP `402` for free/anonymous
users. Billing (Stripe) is intentionally deferred — flip a user to premium by
setting `profiles.tier = 'premium'`.

---

## Project structure

```
app/
  page.tsx              Landing page
  login/                Email auth (sign in / sign up)
  auth/                 Email/OAuth callback + sign-out route handlers
  onboarding/           First-run: profile, first goal, starting weight
  dashboard/            Overview (active goal, latest weight, premium CTA)
  weight/               Weight logging + trend chart + history
  api/meal-plan/        Premium AI meal-plan route (Claude tool-use)
components/             AppNav, WeightChart
lib/
  supabase/             server / browser / proxy session clients
  auth/                 user helpers + requirePremium guard
  ai/                   Anthropic client + meal-plan generator
  types/database.ts     Generated Supabase types
supabase/               SQL migrations + seed
proxy.ts                Session refresh + route gating (Next 16 proxy convention)
```

---

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel (framework auto-detected as
   Next.js).
2. Add the environment variables above in **Project → Settings → Environment
   Variables**.
3. In Supabase **Authentication → URL Configuration**, set the Site URL to your
   Vercel domain and add `https://<your-domain>/auth/callback` as a redirect URL.
4. Deploy.
