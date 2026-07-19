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
  `reservationStatus` (`active`/`cancelled` — the booking-cancellation workflow, §6.5),
  `paymentStatus` (`paid`/`unpaid`, default `paid` — whether the *customer* has paid; drives the
  agenda color, §6.5.1 — a third, independent axis from `commissionStatus` and
  `reservationStatus`), `saleDate` (when logged), `tourDate` (when the tour happens — drives the
  agenda), `customerName`/`customerPhone`/`customerEmail` (required except email), `notes`,
  cancellation fields (`cancellationReason`, `cancelledByUserId`, `cancelledAt`), validation
  fields (`validatedByUserId`, `validatedAt`).

  Three independent status axes on a sale, easy to conflate — don't: `commissionStatus` (has the
  admin approved paying the *seller*), `reservationStatus` (is the booking still on), and
  `paymentStatus` (has the *customer* paid the center). A sale can be any combination, e.g.
  `commissionStatus: pending`, `reservationStatus: active`, `paymentStatus: unpaid` all at once.
- **`expense_categories`**: `diveCenterId`, `name`, unique per center
  (`expense_categories_center_name_idx` on `(diveCenterId, name)`) — admin-defined, arbitrary
  (e.g. "Combustible", "Alquiler", "Mantenimiento").
- **`expenses`**: money the center has **already paid** (§6.7) — not a payable/pending concept
  like sales commissions. `diveCenterId`, `categoryId` (FK, `onDelete: "restrict"` — can't delete a
  category with expenses on it, same guard pattern as `deleteActivity`), `amount`, `currency`
  (`USD`/`CRC`), `paymentMethod` (`cash`/`bank_transfer` — a **different** enum from
  `sales.paymentMethod`, no `card`/`tour_operator` concept here), `expenseDate` (a plain `date`,
  like `sales.tourDate` — drives filtering, not `createdAt`), `description`, `providerName`
  (free text, who got paid — not linked to `activities.providerName`), `createdByUserId`.

Relations are declared with Drizzle `relations()` at the bottom of `schema.ts` and power the
`with: { activity: true, seller: true }` / `with: { category: true }` query patterns in
`lib/db/queries.ts`.

## 5. Feature map: who does what, and where the code is

### Superadmin (`/superadmin`)
- `app/superadmin/page.tsx`: overview of every dive center — activity/seller counts, pending
  sales, approved-commission total (`listDiveCentersWithStats()` in `lib/db/queries.ts`).
- `components/superadmin/dive-center-form.tsx` + `POST /api/superadmin/dive-centers`: creates a
  dive center **and** its admin user together in one form (center name/phone/location/email, plus
  admin name/email/password). See §2.

### Admin (`/admin`, layout in `app/admin/layout.tsx` — nav: Inicio, Actividades, Vendedores,
Ventas, Agenda, Período, Gastos, Configuración)
- `/admin` (`app/admin/page.tsx`): stat cards (activities, sellers, pending sales).
- `/admin/activities` (`app/admin/activities/page.tsx` → `components/admin/activity-manager.tsx`):
  full CRUD over the catalog.
  - `components/admin/activity-form.tsx`: create/edit form. Own vs. third-party toggle changes
    which fields show (own activities: manual `commissionAmount`; third-party: `netPrice` +
    `website` appear, `commissionAmount` is auto-computed and disabled — see §6.1).
  - `components/activities/activity-card.tsx`: read display used everywhere activities are shown
    (admin manager, seller catalog); accepts optional `onEdit`/`onDelete` to render admin-only
    controls. For third-party activities with a `phone`, it also renders
    `components/activities/whatsapp-link.tsx` next to the number — a `wa.me` deep link
    (`lib/activities/whatsapp.ts` builds it, stripping non-digits and pre-filling an availability
    question) so a seller can message that provider in one tap. Not shown for own activities
    (nothing to "check availability with" — same center).
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
  **commission-free** sale directly (no seller involved; see §6.1 "admin sale" case). Both tables
  use the shared `components/sales/*` row components (§6.6) for the tour-date status, the colored
  commission amount, and a per-row cancel action.
- `/admin/agenda` (`app/admin/agenda/page.tsx` → `components/agenda/weekly-agenda.tsx`): week grid
  of tours by `tourDate`. Each day always lists own-activity reservations first, then a dashed
  divider, then third-party ones, each group labeled ("Propias"/"Terceros") — fixed ordering, not
  configurable per center. Reservation block color/cancel behavior: see §6.5.1. This is a separate,
  calendar-shaped cancel UI from the one in `components/sales/cancel-sale-button.tsx` (§6.6) — same
  API, different component, not deduplicated (different layout needs: one modal shared across a
  week grid vs. one self-contained button per table row).

  **Note:** this repo has grown a lot of agenda-adjacent surface since this doc's last full pass
  (staff members/responsables, manual "ventas por fuera" agenda items, agenda notices, provider
  payments, a day report modal, `activities.category`) that isn't documented here yet — read
  `components/agenda/weekly-agenda.tsx` directly for those, this section only covers what's below.

  **Cupo (capacity) box**: each day cell, when there's at least one active own-activity
  reservation/item OR the day is flagged full, shows a small box aggregating **quantity by
  `activities.category`** across both `sales` and manually-added `agenda_items` for that day —
  `ownDayCounts()` in `weekly-agenda.tsx`. It tracks `buceo`, `snorkel`, and `pasajero` separately
  (a diver takes more boat space than a snorkeler or a passenger) and only renders the "Pasajeros"
  line when that count is > 0. **This is derived/computed, not stored** — no schema involved in
  showing the numbers.

  **"Full" toggle**: a day can be manually flagged full by anyone with agenda access (admin or
  seller — same `["admin", "seller"]` guard as `POST /api/admin/agenda/items`), turning the whole
  cupo box red. Unlike the counts above, this genuinely needs persistence (shared across
  admin/seller, survives refresh) — backed by `agenda_capacity_flags` (`diveCenterId`, `flagDate`,
  unique together). **Row existence is the flag** — there's no `isFull` boolean column; marking
  full inserts the row (`markAgendaDayFull()`, `onConflictDoNothing` so a double-click is a no-op),
  unmarking deletes it (`unmarkAgendaDayFull()`). Both actions go through one shared endpoint,
  `POST`/`DELETE /api/admin/agenda/capacity` (reused from the seller page too, same pattern as
  `itemEndpoint` already does for agenda items — don't add a `/api/seller/...` duplicate for this).
  `components/agenda/day-capacity-toggle.tsx` is the button; it's scoped to the **whole day's**
  own-activity cupo, not per-category — that was an explicit product decision (asked, not assumed)
  when this shipped, not a simplification to revisit casually.
- `/admin/report` (`app/admin/report/page.tsx`): the payment-period report — a quick-filter row of
  the last 6 closed payment periods plus a manual date/activity/provider filter form, revenue/
  commission/provider-payment summaries, daily breakdown, full sale detail table. See §6.4.
- `/admin/expenses` (`app/admin/expenses/page.tsx`): money the center has already paid out — see
  §6.7 for the full model. `components/admin/expense-category-manager.tsx` (create/delete
  categories inline, immediate persist per click — unlike `payment-days-form.tsx`'s stage-then-save
  chips) and `components/admin/expense-form.tsx` (a modal reachable from a normal button on desktop
  **and** a `fixed`, mobile-only floating "+" button — `hidden md:inline-flex` /
  `md:hidden` pair). Same quick-period-filter + manual-filter-form pattern as `/admin/report`
  (reuses `getCurrentPaymentPeriod`/`getPastPaymentPeriods`), plus a "Mes en curso" quick filter and
  category/provider selects. Total for the active filter is computed from the **full** filtered
  set via `formatMoneyTotals`, then only `limit` rows (default 10, `?limit=` bumps by 10 via a "Ver
  10 más" link — no client-side pagination state) are rendered in the table, newest
  `expenseDate` first.
- `/admin/settings` (`app/admin/settings/page.tsx` + `components/admin/payment-days-form.tsx`):
  edit `dive_centers.commissionPaymentDays` (`PATCH /api/admin/settings/payment-days`), the days
  of the month that close a payment period (§6.4).

### Seller (`/seller`, layout in `app/seller/layout.tsx` — nav: Vender, Agenda)
- `/seller` (`app/seller/page.tsx`): sale form + "Mis ventas" history (tour-date status, colored
  commission, cancel action — §6.6) + `components/seller/activity-catalog.tsx` (read-only catalog
  with a live text search over provider/tour/location).
- `components/seller/sale-form.tsx`: shared with the admin's commission-free flow (see above).
  Selecting an activity auto-fills unit price and currency; changing payment method recalculates
  the price live (card adds 13%, §6.2) — the price input is **read-only**, sellers cannot type an
  arbitrary price. Requires `tourDate`, `customerName`, `customerPhone` (email optional), and a
  "El cliente todavía no pagó (falta pagar)" checkbox that sets `paymentStatus: "unpaid"` (defaults
  unchecked → `"paid"`, §6.5.1). `POST /api/seller/sales`.
- `/seller/agenda` (`app/seller/agenda/page.tsx`): same `WeeklyAgenda` component scoped to the
  seller's own sales, with its own cancel endpoint (`POST /api/seller/sales/[id]/cancel`, can only
  cancel their own reservations) and its own mark-paid endpoint
  (`POST /api/seller/sales/[id]/mark-paid`, same ownership restriction).

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
  `{ start, nextPaymentDate }` — the report defaults its date filter to that window (from
  `period.start` through today, since the ongoing period isn't closed yet).
- `getPastPaymentPeriods(paymentDays, count, now)` (same file) instead returns the `count` most
  recently **completed** periods, most recent first, each `{ start, end }` bounded by two
  consecutive payment days (both dates inclusive) — e.g. for `[1, 15]` as of July 17: "1/7–15/7",
  then "15/6–1/7", then "1/6–15/6". `/admin/report` renders these as a row of quick-filter links
  (`?from=...&to=...`) above the manual filter form, plus a "Período actual" link back to the
  default (no query params). The active one is highlighted by comparing `params.from`/`params.to`
  to each period's formatted dates.
- The report also aggregates **what the center owes each third-party provider**: for every
  active, non-own-activity sale in the filtered range, it sums `activity.netPrice × quantity`
  grouped by `(providerName, currency)`. This is the center's payable, independent of what it
  collected from customers or paid its sellers.
- Cancelled reservations (`reservationStatus: "cancelled"`) are excluded from every financial
  total in the report (revenue, commissions, provider payments) but still appear in the sale
  detail table marked "Anulada" with the cancellation reason, so the history isn't lost.
- The report's financial totals are **not** affected by `paymentStatus` (§6.5.1) yet — an unpaid
  sale still counts as revenue in "Ingresos" etc. If a future request wants unpaid sales excluded
  or broken out separately, that's a report-page change, not a schema change.

### 6.5 Reservations and cancellation

A `sales` row is really a reservation once it has a `tourDate`. Cancelling
(`cancelSale()` in `lib/db/queries.ts`, via `/api/admin/sales/[id]/cancel` or
`/api/seller/sales/[id]/cancel` — sellers can only cancel their own) sets `reservationStatus:
"cancelled"` plus `cancellationReason`/`cancelledByUserId`/`cancelledAt`. It does **not** delete
the row or touch `commissionStatus`/`paymentStatus`. Effects: excluded from report financial
totals (§6.4), shown red in the weekly agenda (`components/agenda/weekly-agenda.tsx`), but still
counts as sales history. A sale can only be cancelled once (`cancelSale` filters on
`reservationStatus = "active"`, so a second attempt returns 404 "ya fue anulada").

#### 6.5.1 Payment status and the agenda color

The weekly agenda color-codes each reservation block by whether the **customer has paid** — not
by `commissionStatus` (that's about paying the *seller*, a separate concern, §6.3). Both sale
forms (`components/seller/sale-form.tsx`, used by seller and admin flows alike) default new sales
to `paymentStatus: "paid"`; checking "El cliente todavía no pagó (falta pagar)" sends
`paymentStatus: "unpaid"` instead.

`getSaleAgendaStatus(reservationStatus, paymentStatus)` in `lib/sales/status.ts` (unit-tested)
derives the block's status, cancellation always winning:
- `cancelled` → red, "Anulada" (unchanged from before).
- `active` + `unpaid` → **also red**, but labeled **"Debe"** — deliberately the same red family as
  cancelled since both need attention, distinguished by label text, not a third color.
- `active` + `paid` → green, "Confirmada".

`saleAgendaStatusClasses`/`saleAgendaStatusLabel` (same file) back
`components/agenda/weekly-agenda.tsx`'s `ReservationBlock`. An unpaid-and-active block also shows
a small **"Marcar pagado"** button (`components/sales/mark-paid-button.tsx`) that posts to
`${cancelEndpoint}/[id]/mark-paid` (admin: `/api/admin/sales/[id]/mark-paid`; seller:
`/api/seller/sales/[id]/mark-paid`, own reservations only) — `markSalePaid()` in
`lib/db/queries.ts` flips `paymentStatus` to `paid`, guarded to only affect currently-`unpaid`,
`active` rows. There is currently no reverse action (mark unpaid again); add one the same way if
needed.

`paymentStatus` is only surfaced in the agenda today, not in the "Mis ventas"/admin sales tables
or the report — a natural next isolated improvement if the admin wants "Debe" visible there too.

### 6.6 Sales table status display (`lib/sales/status.ts`, `components/sales/*`)

Any table that lists `sales` rows (seller "Mis ventas", admin "Ventas" pending + historial,
`/admin/report`'s "Detalle de ventas") uses these shared pieces instead of inlining status/color
logic — reuse them for any new sales table:

- `lib/sales/status.ts`: pure helpers, unit-tested in `lib/sales/status.test.ts`.
  `getTourStatus(tourDate, reservationStatus, now?)` derives a `TourStatus` —
  `"cancelled"` (reservation was cancelled, regardless of date), `"done"` (tour date is strictly
  before today), or `"upcoming"` (today or later) — plus `tourStatusLabel`/`tourStatusClasses` and
  `commissionStatusClasses` color maps (red/green/amber, matching the palette already used in
  `components/agenda/weekly-agenda.tsx`).
- `components/sales/reservation-date-cell.tsx`: renders the tour date plus a colored
  `TourStatus` badge ("Pendiente" amber, "Realizada" green, "Cancelada" red). Renders a bare "—"
  when `tourDate` is null (legacy sales from before that column existed).
- `components/sales/commission-amount.tsx`: renders the commission amount colored by
  `commissionStatus` (approved green / pending amber / rejected red); pass `cancelled` to render
  "—" instead for cancelled reservations, matching the report page's convention.
- `components/sales/commission-status-badge.tsx`: a `Badge` colored the same way (green/amber/red)
  with the Spanish label ("Aprobada"/"Pendiente"/"Rechazada"), backed by `commissionStatusLabel`/
  `commissionStatusBadgeClasses` in `lib/sales/status.ts`. This is deliberately a **separate**
  badge from the tour-date one above — mixing "is the tour done" with "is the commission approved"
  in one badge reads as confusing, so every sales table shows both, and always labels this one
  "Estado de comisión" (never just "Estado") to keep them visually and textually distinct. Always
  place it immediately next to the `Comisión` amount column, not elsewhere in the row.
- `components/sales/cancel-sale-button.tsx`: a self-contained button + confirm modal (reason
  required, ≥3 chars) that posts to `${endpoint}/[id]/cancel` — pass `endpoint="/api/admin/sales"`
  or `"/api/seller/sales"`. Only render it for `reservationStatus === "active"` rows.
- `lib/reports/money.ts` (`formatMoneyTotals`): sums a list of `{ currency, amount }` rows per
  currency and formats them (`"$12.50"`, or `"$10.00 · ₡500.00"` when mixed, `"—"` when empty).
  Shared by `/admin/report`, `/admin/expenses` (§6.7), and the seller period footer below — don't
  re-sum currency totals inline, add a new row shape and call this.
- `lib/reports/date.ts` (`dateInputValue`, `parseDate`): `Date` ↔ `"YYYY-MM-DD"` (`<input
  type="date">` value) conversion. Shared by `/admin/report` and `/admin/expenses` — both build
  their quick-filter/manual-filter query strings with these instead of hand-rolling
  `toISOString().slice(0, 10)` again.

Column order convention adopted across these tables: tour date/status first, financial columns in
the middle, `Fecha de venta` (sale date) then `Estado de comisión` immediately before `Comisión`
(last data column), row actions after that.

`/seller` "Mis ventas" also has a `<tfoot>` summary row: the current payment period range (via
`getCurrentPaymentPeriod()`, §6.4) and, for `active` sales with `saleDate` inside that period, the
approved vs. pending commission totals (`formatMoneyTotals`). This mirrors `/admin/report` at
seller scale so a seller can see what they're about to get paid without needing report access.

### 6.7 Expenses (`/admin/expenses`)

Expenses are **already-paid** center costs — a different concept from sales' pending/approved
commission workflow, and currently has no validation step at all (nothing to approve; the admin
logging it already paid it).

- Categories (`expense_categories`) are per-center and admin-managed: create via
  `POST /api/admin/expense-categories` (409 if the name already exists for that center — enforced
  by the DB unique index, caught in the route handler by matching the constraint name in the
  thrown error message), delete via `DELETE /api/admin/expense-categories/[id]` (409 if any
  expense still references it — `deleteExpenseCategory()` checks first, same pattern as
  `deleteActivity()`).
- Creating an expense (`POST /api/admin/expenses`, `createExpense()` in `lib/db/queries.ts`)
  re-validates that `categoryId` belongs to the caller's `diveCenterId`
  (`getExpenseCategoryForCenter()`) before inserting — a category id alone doesn't prove tenant
  ownership the way it does for FKs scoped through `sales`/`activities`.
- `listExpensesForCenter()` takes optional `from`/`to` (plain `"YYYY-MM-DD"` strings, compared
  directly against the `date`-typed `expenseDate` column with `gte`/`lte` — no `Date` parsing, so
  no timezone edge cases), `categoryId`, `providerName`, and returns **every** matching row
  (sorted newest `expenseDate` first); the page slices it for pagination and sums it for the total
  — see the `/admin/expenses` bullet in §5 for how those two derive from the one fetch.
  `listExpenseProvidersForCenter()` (a `selectDistinct` query) powers the provider filter dropdown
  from historical `providerName` values, independent of the current filter (so picking a provider
  doesn't remove other providers from the dropdown).
- Not built yet, intentionally out of scope for this pass: editing/deleting an individual expense,
  and any "Ganancias" (revenue − expenses) view or charts — the user's stated next step once this
  ships. When building that, reuse `formatMoneyTotals`/the payment-period helpers rather than
  re-deriving totals, and pull both `listSalesForCenter` and `listExpensesForCenter` results into
  one page.

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
| `0009_overconfident_cyclops` | `payment_status` enum (`paid`/`unpaid`) + `sales.paymentStatus`, default `paid`. |
| `0010_overconfident_raider` | `expense_payment_method` enum + `expense_categories`/`expenses` tables. |
| `0011_orange_spiral` | `provider_payment_status` enum + provider-payment fields on `sales`; `agenda_items`, `agenda_notices` tables. |
| `0012_motionless_deadpool` | `staff_role`/`staff_affiliation` enums + `staff_members` table; `sales.assignedStaffId`, `agendaItems.responsibleStaffId`/`activityId`. |
| `0013_hard_magma` | `users.active`. |
| `0014_nifty_arachne` | Added `via_link`/`referral` to `payment_method`. |
| `0015_wooden_maestro` | `agendaItems.active`. |
| `0016_amused_forge` | `agendaItems.customerName`/`customerPhone`/`isWeTravelSale`. |
| `0017_tired_stranger` | `activity_category` enum + `activities.category`. |
| `0018_nebulous_slayback` | `agenda_capacity_flags` table (day-level "full" flag, §5's cupo box). **Generated but not yet applied** — batch with the next `db:migrate` run. |

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

## 10. Full route map

**This section is stale** relative to the actual app (missing `/admin/profits`, staff/agenda-item/
agenda-notice/provider-payment routes, sellers `[id]`, etc. added since this doc's last full
pass) — run `npm run build` for the authoritative current list rather than trusting this fully.
Kept here for the routes it does still get right, plus newly added ones:

Pages:
- `/` marketing landing (legacy), `/pricing` (legacy).
- `/login` — email+password for all roles.
- `/home` — post-login role router.
- `/superadmin` — global center overview + create center/admin.
- `/admin`, `/admin/activities`, `/admin/sellers`, `/admin/sales`, `/admin/agenda`,
  `/admin/report`, `/admin/expenses`, `/admin/settings`.
- `/seller`, `/seller/agenda`.
- `/dashboard` — legacy AI-jobs demo (unused).

API routes:
- `POST /api/superadmin/dive-centers`
- `POST /api/admin/sellers`
- `POST /api/admin/activities`, `PATCH /api/admin/activities/[id]`,
  `DELETE /api/admin/activities/[id]`
- `POST /api/admin/sales` (commission-free admin sale), `POST /api/admin/sales/[id]/validate`,
  `POST /api/admin/sales/[id]/cancel`, `POST /api/admin/sales/[id]/mark-paid`
- `POST /api/admin/expense-categories`, `DELETE /api/admin/expense-categories/[id]`
- `POST /api/admin/expenses`
- `POST`/`DELETE /api/admin/agenda/capacity` (day-full toggle, shared by admin + seller pages)
- `PATCH /api/admin/settings/payment-days`
- `POST /api/seller/sales`, `POST /api/seller/sales/[id]/cancel`,
  `POST /api/seller/sales/[id]/mark-paid`
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
