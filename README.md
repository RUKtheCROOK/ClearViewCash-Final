# ClearViewCash

Personal finance for couples and households. One codebase ships to iOS, Android, and web.

## Stack

- **Frontend:** Expo (React Native + React Native Web) with Expo Router for the mobile + web app, and a thin Next.js app on Vercel for marketing pages and Stripe API routes.
- **Backend:** Supabase Postgres + Auth + Edge Functions. Plaid for banking, Stripe for billing.
- **Language:** TypeScript everywhere.

## Repository layout

```
apps/
  mobile/    Expo Router app (iOS + Android + RN Web export)
  web/       Next.js 15 (marketing + Stripe API + Plaid API)
packages/
  ui/        Shared RN components
  types/     Zod schemas + generated Supabase types
  domain/    Pure logic: forecast, payment-link math, recurring detection
  api-client/Supabase wrapper + typed queries/mutations
supabase/
  migrations/  Schema + RLS
  functions/   Edge Functions (Plaid, Stripe, forecast)
  tests/       pgTAP RLS test suite
```

## First-time setup

```bash
# Install pnpm if needed
npm install -g pnpm@9

# Install Supabase CLI
# https://supabase.com/docs/guides/cli/getting-started

# Install all workspace deps
pnpm install

# Copy env file and fill in keys
cp .env.example .env

# Start Supabase locally (Postgres + Auth + Functions)
pnpm supabase:start

# Run migrations + seed
pnpm supabase:reset

# Generate typed schema for the client
pnpm supabase:gen-types
```

## Development

```bash
# Run mobile app (interactive — press w for web, i for iOS, a for Android)
pnpm mobile

# Run Next.js web app (marketing + API)
pnpm web

# Run all dev processes
pnpm dev

# Type-check everything
pnpm typecheck

# Run domain tests (forecast, payment-link, recurring)
pnpm --filter @cvc/domain test

# Run RLS test suite — runs in CI on every migration
pnpm supabase:test
```

## Required environment variables

See [.env.example](.env.example). At minimum:

- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Edge Functions only)
- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` (sandbox/development/production)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_HOUSEHOLD`

## Deploying

### Supabase
```bash
supabase link --project-ref <ref>
supabase db push
supabase functions deploy plaid-link-token plaid-exchange plaid-sync plaid-webhook stripe-webhook forecast-recompute
supabase secrets set PLAID_CLIENT_ID=... PLAID_SECRET=... STRIPE_SECRET_KEY=...
```

Schedule the nightly forecast recompute via `pg_cron`:
```sql
select cron.schedule(
  'forecast-recompute-daily', '0 8 * * *',
  $$ select net.http_post(
       url := 'https://<ref>.functions.supabase.co/forecast-recompute',
       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
     ) $$
);
```

### Web (Vercel)
```bash
cd apps/web
vercel --prod
```

Add Stripe webhook endpoint pointing at `https://<your-domain>/api/stripe/webhook` (or use the Edge Function endpoint directly).

### Mobile (EAS)
```bash
cd apps/mobile
eas build --platform ios --profile preview
eas build --platform android --profile preview
# Production:
eas build --platform all --profile production
eas submit --platform ios
eas submit --platform android
```

**Submit feature-complete builds to App Store + Play Store at the start of M3** (week 12 in the plan), not at the end. Apple finance-app review cycles often run 2–3 weeks; starting early gives you a buffer for rejections.

## Critical files

- [supabase/migrations/20260501000000_init.sql](supabase/migrations/20260501000000_init.sql) — schema + RLS (most load-bearing file in the project)
- [supabase/tests/rls.sql](supabase/tests/rls.sql) — pgTAP suite gating every migration
- [packages/domain/src/forecast.ts](packages/domain/src/forecast.ts) — cash-flow engine (client + server)
- [packages/domain/src/payment-links.ts](packages/domain/src/payment-links.ts) — effective-available + split math
- [packages/domain/src/recurring.ts](packages/domain/src/recurring.ts) — pattern detection
- [supabase/functions/plaid-sync/index.ts](supabase/functions/plaid-sync/index.ts) — incremental sync
- [supabase/functions/stripe-webhook/index.ts](supabase/functions/stripe-webhook/index.ts) — subscription state writer

## Implementation milestones

See [C:\Users\Johng\.claude\plans\please-look-at-the-floofy-coral.md](C:\Users\Johng\.claude\plans\please-look-at-the-floofy-coral.md) for the full V1 plan.

- **M1 — Foundation (weeks 1–4):** auth, Plaid, accounts, raw transactions, RLS green.
- **M2 — Core surfaces (weeks 5–8):** Dashboard, full Transactions, Bills, Income, Spaces.
- **M3 — Differentiators (weeks 9–13):** Payment Links, Forecast, Budgets, Goals, Stripe.  **Submit to App Store/Play Store mid-M3.**
- **M4 — Polish + launch (weeks 14–16):** Reports, account deletion, store approvals.

## Pricing (V1)

| Plan         | Price        | What's included                                              |
|--------------|--------------|-------------------------------------------------------------|
| Starter      | Free         | 1 space, 2 linked accounts, basic transactions & budgets.    |
| Personal Pro | $9.99/mo     | Unlimited accounts, 3 spaces, Forecast, Goals, Bills, Reports. |
| Household    | $14.99/mo    | Everything in Pro + unlimited spaces, 5 members per space.   |

Business tier ($29.99/mo) with QuickBooks sync, role permissions, audit logs is **V2**.
