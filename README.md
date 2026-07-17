# AI SaaS Boilerplate

Production-oriented starter for launching AI micro-SaaS products with Next.js App Router, Supabase Auth/Postgres/Storage, Drizzle, Upstash Redis, Inngest, Stripe, Resend, fal.ai, and OpenAI TTS.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env vars:

```bash
cp .env.example .env.local
```

3. Create the Supabase project, private storage bucket `ai-results`, Stripe products/prices, Upstash Redis database, Inngest app, Resend API key, fal.ai key, and OpenAI API key. Use fresh credentials per product; never reuse the template project's secrets.

4. Run database migrations:

```bash
npm run db:generate
npm run db:migrate
```

5. Apply [lib/db/rls.sql](./lib/db/rls.sql) in the Supabase SQL editor.

6. Start the app and Inngest dev server:

```bash
npm run dev
npm run inngest
```

## AI Provider Pattern

Each provider implements `AiProvider` from [lib/ai/types.ts](./lib/ai/types.ts). Add a new provider in `lib/ai/providers`, register it in [lib/ai/providers/index.ts](./lib/ai/providers/index.ts), add a job type to the Drizzle enum, and extend [lib/ai/validation.ts](./lib/ai/validation.ts).

The reusable pipeline is:

`POST /api/jobs/create` validates auth and input, reserves a Redis concurrency slot, debits credits atomically, stores a pending job, sends `ai/job.created` to Inngest, and returns `{ jobId }`. The worker generates the result, uploads it to Supabase Storage, marks the job done, or refunds credits on failure.

## Stripe Plans and Prices

Credit pack and plan metadata live in [lib/stripe/pricing.ts](./lib/stripe/pricing.ts). Create matching Stripe Prices and put their IDs in `.env.local`:

```bash
STRIPE_PRICE_ID_CREDITS_10=
STRIPE_PRICE_ID_CREDITS_50=
STRIPE_PRICE_ID_PRO_MONTHLY=
```

Webhook endpoint:

```text
/api/stripe/webhook
```

Handled events are `checkout.session.completed`, `invoice.paid`, and `customer.subscription.deleted`.

Webhook credit grants are idempotent by `stripeEventId`, so replayed Stripe events do not increment balances twice.

## Mercado Pago Checkout Pro

Mercado Pago Checkout Pro supports one-time credit pack purchases. See [docs/mercado-pago.md](./docs/mercado-pago.md) for environment variables, webhook setup, sandbox versus production behavior, pricing minimums, and testing notes.

## Security Defaults

- Generated files should live in a private Supabase Storage bucket. The app stores object paths and serves authenticated, short-lived signed URLs through `/api/jobs/result/[id]`.
- `/api/health` is protected in production with `HEALTHCHECK_SECRET`; call it with `Authorization: Bearer <secret>`.
- Public auth/session debug endpoints are not part of the template.
- Credit debits, purchases, subscription grants, and refunds are recorded in `transactions`.
- Rotate every secret before creating a new product from this repo.

## Be Water: roles and setup

This app runs a role-based dive center manager on top of the boilerplate above.

- **Superadmin**: fixed by the `SUPERADMIN_EMAIL` env var. Its first password login at `/login`
  creates the profile, lands on `/superadmin`, and creates each dive center together with
  its admin user (email + password) from there.
- **Admin**: one per dive center, created only by the superadmin. Logs in with email + password,
  lands on `/admin`. Loads the center's own and third-party activities (`/admin/activities`),
  creates seller users (`/admin/sellers`), and validates daily commissions (`/admin/sales`).
- **Seller**: created only by their admin. Logs in with email + password, lands on `/seller`,
  where they see the center's activity catalog read-only and log sales with an auto-calculated
  commission that stays `pending` until the admin approves or rejects it.

Nobody else can self-register: `ensureUserProfile` in `lib/db/queries.ts` rejects any first-time
login whose email does not match `SUPERADMIN_EMAIL`, since admin/seller accounts only exist if
provisioned from above.

Deploy checklist specific to this feature set:

1. Set `SUPERADMIN_EMAIL` to the superadmin's login email.
2. Run `npm run db:migrate` against the production `DATABASE_URL` (includes the `dive_centers`,
   `activities`, and `sales` tables added in `drizzle/0002_absent_justice.sql`).
3. Apply the updated [lib/db/rls.sql](./lib/db/rls.sql) in the Supabase SQL editor (adds policies
   for the three new tables).
4. Log in once as `SUPERADMIN_EMAIL` to create the first dive center and admin from `/superadmin`.

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import it in Vercel.
3. Add every variable from [.env.example](./.env.example), including `SUPERADMIN_EMAIL`.
4. Configure Supabase auth redirect URLs for your Vercel domain (`/callback`).
5. Configure Stripe webhook signing secret for `https://your-domain.com/api/stripe/webhook` if you
   plan to use the billing boilerplate (currently unused by the Be Water flows).
6. Set `HEALTHCHECK_SECRET` in production if you want to use `/api/health`.
7. Run the database setup from the checklist above (migrate + RLS).
8. Deploy.

## Main Routes

- `/` marketing landing page with metadata, sitemap, robots, and JSON-LD.
- `/pricing` public pricing page.
- `/login` email+password for superadmin, admin, and seller users.
- `/home` post-login redirect to the right role home.
- `/superadmin` global view of all dive centers; create dive center + admin.
- `/admin`, `/admin/activities`, `/admin/sellers`, `/admin/sales` dive center admin dashboard.
- `/seller` seller's activity catalog and sale logging.
- `/dashboard` protected AI-jobs demo dashboard from the original boilerplate (unused by Be Water).
- `/api/jobs/create` async job creation.
- `/api/jobs/result/[id]` authenticated signed result URL redirect.
- `/api/jobs/status/[id]` job polling endpoint.
- `/api/inngest` Inngest function endpoint.
