# Project Context — Be Water

**Read this file first.** It is the map of what this repo actually does today and where each
feature lives. Written for AI assistants (Claude, Codex) picking up work in a fresh session.

## 0. What this app is

Be Water is a **role-based sales and commission manager for dive/tour centers**, deployed on
Vercel. A superadmin oversees multiple dive centers; each dive center has one admin who manages
its activity catalog and staff; sellers log sales against that catalog and earn commissions that
the admin validates.

The repo started from a generic "AI SaaS boilerplate" (async AI jobs, credits, Stripe
subscriptions). That plumbing is still in the codebase and still builds, but **it is not used by
the product** — see [§8 Legacy boilerplate](#8-legacy-boilerplate-unused-by-be-water). Do not
extend it by default; if a task mentions "jobs", "credits", or "AI generation", confirm with the
user whether they actually mean the dive-center product before touching that code.

## 1. Stack

- **Next.js 16 App Router**, React 19, TypeScript, Tailwind CSS. Local UI primitives in
  `components/ui/` (Button, Input, Textarea, Badge — no external component library).
- **Supabase Auth**: email + password only (no magic link, no OAuth — both were removed, see
  §3). Server/browser clients: `lib/supabase/server.ts`, `lib/supabase/browser.ts`. Session
  refresh: `lib/supabase/middleware.ts`, wired in `proxy.ts`.
- **Supabase Postgres** via **Drizzle ORM**. Schema: `lib/db/schema.ts`. Queries:
  `lib/db/queries.ts`. Migrations: `drizzle/` (see §7). DB client: `lib/db/index.ts` (uses
  `DATABASE_URL` directly — **not** the Supabase client, so it does not go through RLS; the app
  enforces tenant/role isolation itself in route handlers and page loaders, not via RLS. RLS in
  `lib/db/rls.sql` is defense-in-depth for any future direct Supabase-client access).
- **Zod** for all API route input validation.
- **Vitest** for unit tests (`npm test`). Current suite: `lib/activities/pricing.test.ts`,
  `lib/reports/payment-period.test.ts`, plus the untouched boilerplate tests.
- **Vercel** deploy target.

## 2. Roles and who creates whom

Three roles, stored in `users.role` (`lib/db/schema.ts`): `superadmin`, `admin`, `seller`. Exactly
one `superadmin` row can exist (`users_one_superadmin_idx`, a partial unique index on
`role = 'superadmin'`).

```
superadmin (one, fixed by SUPERADMIN_EMAIL)
  └─ creates dive_center + admin together   → POST /api/superadmin/dive-centers
       admin (one per dive_center)
         └─ creates sellers for their center → POST /api/admin/sellers
              seller (many per dive_center)
```

- **Nobody self-registers except the superadmin**, and even that requires the Supabase Auth user
  (email+password) to already exist — see §3. `ensureUserProfile()` in `lib/db/queries.ts` is the
  single choke point: on first login it only creates a `users` row if the email matches
  `SUPERADMIN_EMAIL`; any other unrecognized email is rejected with "Esta cuenta no está
  habilitada...". Admin and seller `users` rows are always inserted directly by the
  provisioning API routes, never through this signup path.
- `dive_centers.ownerUserId` always points at that center's one admin (`createDiveCenterWithAdmin`
  in `lib/db/queries.ts` creates the admin `users` row, the `dive_centers` row, then links
  `users.diveCenterId` back — all in one transaction, with the just-created Supabase Auth user
  rolled back if any DB step fails).
- Route/page authorization pattern: every protected page calls `getCurrentProfile()` or
  `requireRole(...)` from `lib/auth/roles.ts` (redirects on failure); every protected API route
  calls `requireApiProfile(role)` from `lib/auth/api.ts` (returns a `NextResponse` 401/403 you
  must early-return on failure). Tenant isolation is manual: routes always filter by
  `profile.diveCenterId`, never trust a `diveCenterId` from the request body.

## 3. Auth flow

- `/login` renders `components/auth/login-form.tsx` — **email + password only** via
  `supabase.auth.signInWithPassword()`, for all three roles. Magic link and Google OAuth were
  removed (`app/(auth)/login/google/route.ts` deleted in commit `dc27763`).
- On success the client redirects to `/home` (`app/home/page.tsx`), a server component that calls
  `getCurrentProfile()` (which runs `ensureUserProfile()`) and redirects to the right role home
  via `homePathForRole()` in `lib/auth/roles.ts`: `/superadmin`, `/admin`, or `/seller`.
- `/callback` (`app/(auth)/callback/route.ts`) still exists for Supabase's code-exchange flow and
  also calls `ensureUserProfile()`, but nothing in the current UI links to a flow that hits it
  (kept from the boilerplate; harmless).
- **Getting the first superadmin account working** is an out-of-band step: create the Supabase
  Auth user (email + password) for `SUPERADMIN_EMAIL` directly in the Supabase dashboard (or via
  `auth.admin.createUser`), then log in at `/login` — `ensureUserProfile()` creates the `users`
  row with `role: "superadmin"` on that first successful password login.
- Logout: `POST /logout` (`app/(auth)/logout/route.ts`).
- `proxy.ts` matcher + `lib/supabase/middleware.ts` `protectedPrefixes` gate `/home`, `/admin`,
  `/seller`, `/superadmin`, `/dashboard` and their `/api/*` counterparts — redirect to `/login`
  when there's no session. Role correctness within those prefixes is enforced by the page/route
  guards from §2, not by the middleware.

## 4. Data model (`lib/db/schema.ts`)

- **`dive_centers`**: `name`, `ownerUserId` (unique → one admin per center), `phone`, `email`,
  `officeLocation`, `commissionPaymentDays` (`jsonb number[]`, default `[1, 15]` — see §6.4).
- **`users`**: `authUserId` (unique, → Supabase Auth), `email`, `fullName`, `role`,
  `diveCenterId` (FK, null only for superadmin).
- **`activities`**: a center's sellable catalog entry — either the center's own activity or a
  third party's that pays commission. Key fields: `diveCenterId`, `providerName`, `isOwnActivity`,
  `tourName`, `rackPrice` (price charged to the customer), `netPrice` (cost paid to a third-party
  provider — null for own activities), `commissionAmount` (per-unit seller commission — see §6.1
  for how it's computed differently for own vs. third-party), `currency` (`USD`/`CRC`), `website`
  (third-party link, shown to sellers), `active`, plus all the operational fields captured from
  the original tour spreadsheets: `phone`, `officeLocation`, `meetingPoint`,
  `distanceToActivity`, `meetingTime`, `duration`, `tourLocation`, `includes`, `excludes`,
  `whatToBring`, `whatYouWillSee`.
- **`sales`**: one row per sale/reservation. `diveCenterId`, `activityId`, `sellerId`, `quantity`,
  `unitPrice` (actual price charged, after any card surcharge — see §6.2), `currency`,
  `paymentMethod` (`cash`/`card`/`tour_operator`), `grossAmount` (`quantity × unitPrice`),
  `commissionAmount` (`quantity × commission-per-unit`), `commissionStatus`
  (`pending`/`approved`/`rejected` — the seller-commission validation workflow, §6.3),
  `reservationStatus` (`active`/`cancelled` — the booking-cancellation workflow, §6.5, independent
  of `commissionStatus`), `saleDate` (when logged), `tourDate` (when the tour happens — drives the
  agenda), `customerName`/`customerPhone`/`customerEmail` (required except email), `notes`,
  cancellation fields (`cancellationReason`, `cancelledByUserId`, `cancelledAt`), validation
  fields (`validatedByUserId`, `validatedAt`).

Relations are declared with Drizzle `relations()` at the bottom of `schema.ts` and power the
`with: { activity: true, seller: true }` query patterns in `lib/db/queries.ts`.

## 5. Feature map: who does what, and where the code is

### Superadmin (`/superadmin`)
- `app/superadmin/page.tsx`: overview of every dive center — activity/seller counts, pending
  sales, approved-commission total (`listDiveCentersWithStats()` in `lib/db/queries.ts`).
- `components/superadmin/dive-center-form.tsx` + `POST /api/superadmin/dive-centers`: creates a
  dive center **and** its admin user together in one form (center name/phone/location/email, plus
  admin name/email/password). See §2.

### Admin (`/admin`, layout in `app/admin/layout.tsx` — nav: Inicio, Actividades, Vendedores,
Ventas, Agenda, Período, Configuración)
- `/admin` (`app/admin/page.tsx`): stat cards (activities, sellers, pending sales).
- `/admin/activities` (`app/admin/activities/page.tsx` → `components/admin/activity-manager.tsx`):
  full CRUD over the catalog.
  - `components/admin/activity-form.tsx`: create/edit form. Own vs. third-party toggle changes
    which fields show (own activities: manual `commissionAmount`; third-party: `netPrice` +
    `website` appear, `commissionAmount` is auto-computed and disabled — see §6.1).
  - `components/activities/activity-card.tsx`: read display used everywhere activities are shown
    (admin manager, seller catalog); accepts optional `onEdit`/`onDelete` to render admin-only
    controls.
  - API: `POST /api/admin/activities` (create), `PATCH /api/admin/activities/[id]` (edit),
    `DELETE /api/admin/activities/[id]` (blocked with 409 if the activity already has sales —
    `deleteActivity()` in `lib/db/queries.ts` checks for existing sales first).
- `/admin/sellers` (`app/admin/sellers/page.tsx` + `components/admin/seller-form.tsx`): create
  seller accounts (email+password via `getSupabaseAdmin().auth.admin.createUser`, then
  `createSellerProfile()`), list existing sellers. `POST /api/admin/sellers`.
- `/admin/sales` (`app/admin/sales/page.tsx`): pending-commission queue with
  `components/admin/sale-validation-row.tsx` (approve/reject buttons →
  `POST /api/admin/sales/[id]/validate`), full history table, and
  `components/seller/sale-form.tsx` reused with `actor="admin" collapsible` — lets the admin log a
  **commission-free** sale directly (no seller involved; see §6.1 "admin sale" case).
- `/admin/agenda` (`app/admin/agenda/page.tsx` → `components/agenda/weekly-agenda.tsx`): week grid
  of tours by `tourDate`, split into own-activity vs. third-party blocks per day, with a cancel
  action per reservation (`POST /api/admin/sales/[id]/cancel`). See §6.5.
- `/admin/report` (`app/admin/report/page.tsx`): the payment-period report — date/activity/
  provider filters, revenue/commission/provider-payment summaries, daily breakdown, full sale
  detail table. See §6.4.
- `/admin/settings` (`app/admin/settings/page.tsx` + `components/admin/payment-days-form.tsx`):
  edit `dive_centers.commissionPaymentDays` (`PATCH /api/admin/settings/payment-days`), the days
  of the month that close a payment period (§6.4).

### Seller (`/seller`, layout in `app/seller/layout.tsx` — nav: Vender, Agenda)
- `/seller` (`app/seller/page.tsx`): sale form + "Mis ventas" history +
  `components/seller/activity-catalog.tsx` (read-only catalog with a live text search over
  provider/tour/location).
- `components/seller/sale-form.tsx`: shared with the admin's commission-free flow (see above).
  Selecting an activity auto-fills unit price and currency; changing payment method recalculates
  the price live (card adds 13%, §6.2) — the price input is **read-only**, sellers cannot type an
  arbitrary price. Requires `tourDate`, `customerName`, `customerPhone` (email optional).
  `POST /api/seller/sales`.
- `/seller/agenda` (`app/seller/agenda/page.tsx`): same `WeeklyAgenda` component scoped to the
  seller's own sales, with its own cancel endpoint (`POST /api/seller/sales/[id]/cancel`, can only
  cancel their own reservations).

## 6. Business rules — read this before changing pricing/commission code

All pricing/commission math lives in `lib/activities/pricing.ts` (unit-tested in
`lib/activities/pricing.test.ts`). **Never duplicate this math inline** — both the admin and
seller sale routes, and both activity-form components, import from here.

### 6.1 Commission calculation

- **Own activities** (`isOwnActivity: true`): the admin sets `activities.commissionAmount`
  manually per unit. Seller commission on a sale = `commissionAmount × quantity`.
- **Third-party activities** (`isOwnActivity: false`): the seller commission is **not** stored
  directly on the activity as a fixed number tied to `rackPrice` — it's derived at sale time from
  the actual price charged, so a card surcharge (§6.2) correctly increases the seller's cut too.
  `calculateThirdPartySellerCommission(customerPrice, providerCost)` splits the margin 50/50:
  `(customerPrice - providerCost) / 2`. Returns `null` if `customerPrice <= providerCost` (blocks
  the sale — "El precio cobrado debe ser mayor al costo del proveedor.").
  - The activity form still shows a **preview** of this commission (computed from `rackPrice`/
    `netPrice`) as a disabled field for the admin's reference when creating the catalog entry, but
    the authoritative number used per sale is always recomputed from `activity.netPrice` and the
    sale's actual `unitPrice` in `app/api/seller/sales/route.ts`.
- **Admin "commission-free" sale** (`app/api/admin/sales/route.ts`): admins can log a sale
  directly (e.g., walk-in, no seller involved). `commissionPerUnit: 0`,
  `commissionStatus: "approved"`, `validatedByUserId` set to the admin immediately — it never
  enters the pending queue. The sale form shows the center's estimated margin instead of a
  commission in this mode (`actor="admin"` in `components/seller/sale-form.tsx`).

### 6.2 Card surcharge

`calculateSaleUnitPrice(rackPrice, paymentMethod)`: `card` payments charge `rackPrice × 1.13`
(13%, matching the original spreadsheet's "TARJETA +13%" column); `cash` and `tour_operator`
charge `rackPrice` as-is. This runs both client-side (live price preview) and server-side (the
API routes always recompute it themselves from `activity.rackPrice` — they do **not** trust a
client-submitted `unitPrice` for the seller flow's base price, only the payment method and
quantity).

### 6.3 Commission validation workflow

New sales from a seller start `commissionStatus: "pending"`. The admin approves/rejects from
`/admin/sales` (`validateSale()` in `lib/db/queries.ts`, guarded to only affect rows currently
`pending`). Once `approved`, that commission is treated as final/payable. This status is
completely independent of `reservationStatus` (§6.5) — a sale can be `approved` and later
`cancelled`, or still `pending` when cancelled.

### 6.4 Payment periods and provider reporting (`/admin/report`)

- `dive_centers.commissionPaymentDays` (e.g. `[1, 15]`) defines the days of the month commissions
  get paid out. `getCurrentPaymentPeriod(paymentDays, now)` in `lib/reports/payment-period.ts`
  finds the most recent payment day before `now` and the next one after, and returns
  `{ start, nextPaymentDate }` — the report defaults its date filter to that window.
- The report also aggregates **what the center owes each third-party provider**: for every
  active, non-own-activity sale in the filtered range, it sums `activity.netPrice × quantity`
  grouped by `(providerName, currency)`. This is the center's payable, independent of what it
  collected from customers or paid its sellers.
- Cancelled reservations (`reservationStatus: "cancelled"`) are excluded from every financial
  total in the report (revenue, commissions, provider payments) but still appear in the sale
  detail table marked "Anulada" with the cancellation reason, so the history isn't lost.

### 6.5 Reservations and cancellation

A `sales` row is really a reservation once it has a `tourDate`. Cancelling
(`cancelSale()` in `lib/db/queries.ts`, via `/api/admin/sales/[id]/cancel` or
`/api/seller/sales/[id]/cancel` — sellers can only cancel their own) sets `reservationStatus:
"cancelled"` plus `cancellationReason`/`cancelledByUserId`/`cancelledAt`. It does **not** delete
the row or touch `commissionStatus`. Effects: excluded from report financial totals (§6.4), shown
struck-through/red in the weekly agenda (`components/agenda/weekly-agenda.tsx`), but still counts
as sales history. A sale can only be cancelled once (`cancelSale` filters on
`reservationStatus = "active"`, so a second attempt returns 404 "ya fue anulada").

## 7. Migrations (`drizzle/`)

Generate with `npm run db:generate` after editing `lib/db/schema.ts`, apply with
`npm run db:migrate`. In order:

| Migration | What it added |
|---|---|
| `0000_black_kang` | Original AI-SaaS boilerplate schema (users, credits, subscriptions, jobs, transactions). |
| `0001_add_credit_spend_transaction` | Boilerplate: added `credit_spend` transaction type. |
| `0002_absent_justice` | **Be Water v1**: `role` enum, `dive_centers`, `activities`, `sales`, `users.role`/`diveCenterId`. |
| `0003_dapper_lockjaw` | Unique partial index enforcing a single `superadmin`. |
| `0004_chubby_dark_beast` | `activities.website`. |
| `0005_flat_vengeance` | `sales.customerName`/`customerPhone`/`customerEmail`. |
| `0006_wide_pet_avengers` | `dive_centers.commissionPaymentDays`. |
| `0007_amazing_the_call` | `sales.tourDate`. |
| `0008_sloppy_aaron_stack` | `reservation_status` enum + cancellation fields on `sales`. |

After any schema change in production: run the migration against `DATABASE_URL`, then re-apply
`lib/db/rls.sql` if a new table was added.

## 8. Legacy boilerplate (unused by Be Water)

Still in the repo, still builds, **not wired into any Be Water page or flow**:

- `jobs`, `credits`, `subscriptions`, `transactions` tables and all of `lib/ai/`, `lib/inngest/`,
  `lib/redis/`, `lib/stripe/`, `lib/mercadopago/`, `lib/email/` (Resend), the `/dashboard` and
  `/pricing` pages, and `app/api/jobs/*`, `app/api/stripe/*`, `app/api/mercadopago/*`,
  `app/api/inngest`.
- `ensureUserProfile()` still grants free `credits`/a `free` subscription/a `signup_bonus`
  transaction to the superadmin on first login (harmless side effect, not read by anything in the
  Be Water UI).
- Treat these as available-but-dormant. Don't delete without asking — the user may still want
  billing later — but don't build new Be Water features on top of them, and don't assume
  `STRIPE_*`/`FAL_KEY`/`OPENAI_API_KEY`/etc. are configured in production; they aren't required.

## 9. Environment variables that matter today

Required for Be Water to function (see `.env.example` for the full legacy list too):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — auth
  + the admin API used to create seller/admin accounts.
- `DATABASE_URL` — Drizzle/Postgres connection.
- `SUPERADMIN_EMAIL` — the one email `ensureUserProfile()` will auto-provision as superadmin.
- `NEXT_PUBLIC_APP_URL` — canonical app URL (metadata, sitemap/robots).

Everything else in `.env.example` (`STRIPE_*`, `MERCADOPAGO_*`, `FAL_KEY`, `OPENAI_API_KEY`,
`INNGEST_*`, `UPSTASH_REDIS_*`, `RESEND_*`, `HEALTHCHECK_SECRET`, `SUPABASE_STORAGE_BUCKET`,
`FREE_SIGNUP_CREDITS`, `FREE_MONTHLY_CREDITS`, `PRO_MONTHLY_CREDITS`, `MAX_CONCURRENT_JOBS`)
belongs to the legacy boilerplate (§8) and is not required in production.

## 10. Full route map (current `npm run build` output)

Pages:
- `/` marketing landing (legacy), `/pricing` (legacy).
- `/login` — email+password for all roles.
- `/home` — post-login role router.
- `/superadmin` — global center overview + create center/admin.
- `/admin`, `/admin/activities`, `/admin/sellers`, `/admin/sales`, `/admin/agenda`,
  `/admin/report`, `/admin/settings`.
- `/seller`, `/seller/agenda`.
- `/dashboard` — legacy AI-jobs demo (unused).

API routes:
- `POST /api/superadmin/dive-centers`
- `POST /api/admin/sellers`
- `POST /api/admin/activities`, `PATCH /api/admin/activities/[id]`,
  `DELETE /api/admin/activities/[id]`
- `POST /api/admin/sales` (commission-free admin sale), `POST /api/admin/sales/[id]/validate`,
  `POST /api/admin/sales/[id]/cancel`
- `PATCH /api/admin/settings/payment-days`
- `POST /api/seller/sales`, `POST /api/seller/sales/[id]/cancel`
- `GET /callback`, `POST /logout`
- Legacy: `/api/jobs/*`, `/api/stripe/*`, `/api/mercadopago/*`, `/api/inngest`, `/api/health`.

## 11. Working in this repo

- `npm run dev` — dev server. `npm test` — vitest (fast, no DB needed; pricing/period logic is
  pure-function tested). `npx tsc --noEmit` and `npm run build` are the reliable pre-push checks
  in this sandbox (`npm run lint` currently fails here — `next lint` / ESLint 9 config mismatch,
  pre-existing and unrelated to any Be Water change, not something to "fix" reflexively).
  `npm run build` needs dummy `DATABASE_URL`/Supabase env vars to complete if `.env.local` is
  missing; it does not need a reachable database.
- Every new admin/seller-facing form in this codebase follows the same shape: a client component
  with local `useState` per field, `fetch()` to a Zod-validated Route Handler, `router.refresh()`
  on success. Follow that pattern rather than introducing a form library.
- When adding a field to `activities` or `sales`: update `lib/db/schema.ts`, run
  `npm run db:generate`, add it to the relevant Zod schema(s) in `app/api/**/route.ts`, thread it
  through the matching `lib/db/queries.ts` function, and surface it in both the form component and
  `components/activities/activity-card.tsx` (or the relevant table) — grep for an existing field
  like `meetingPoint` to see every place a single activity field touches.
- Tenant/role safety checklist for any new API route: call `requireApiProfile(role)` first and
  early-return if it's a `NextResponse`; always scope DB queries by `profile.diveCenterId` (never
  accept a `diveCenterId` from the request body); for seller-owned resources (like sale
  cancellation), also filter by `sellerId: profile.id`.
