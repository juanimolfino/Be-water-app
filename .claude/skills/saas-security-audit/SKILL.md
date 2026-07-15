---
name: saas-security-audit
description: Security audit for AI micro-SaaS built on Next.js + Supabase + Stripe/Mercado Pago + fal.ai/ElevenLabs/Deepgram/Anthropic, with credit-based billing. Use when asked to "audit security", "security review", "find vulnerabilities", "check credit theft", "review webhooks", "blindar la app", "revisar seguridad", or before shipping a new endpoint that touches auth, credits, payments, uploads, or third-party API keys. Detects the vulnerability AND emits the exact code fix.
allowed-tools: Read, Grep, Glob, Bash
---

<!--
Reference material adapted from OWASP Cheat Sheet Series (CC BY-SA 4.0)
https://cheatsheetseries.owasp.org/
Tailored to the ai-saas-base boilerplate stack:
Next.js (App Router) · Supabase (auth + RLS + storage) · Drizzle ORM ·
Stripe + Mercado Pago · fal.ai · ElevenLabs · Deepgram · Anthropic · Inngest · Upstash Redis
-->

# SaaS Security Audit Skill

Find **exploitable** security holes in an AI micro-SaaS and emit the **exact fix**. Optimized for one thing above all: **nobody steals credits, nobody reads another user's data, nobody spends your third-party API budget for free.**

## Golden rule: research before you flag

Never flag on pattern-match alone. For every candidate issue, trace the data flow first:

- Where does this value come from — `request` (attacker-controlled) or `process.env` / config (server-controlled)?
- Is there an ownership check, RLS policy, or validation upstream?
- What does the framework already mitigate (React auto-escaping, Drizzle parameterization)?

Report only **HIGH confidence** findings (vulnerable pattern + attacker-controlled input, no upstream mitigation). Note MEDIUM as "needs verification". Skip LOW / theoretical.

## Confidence & severity

| Confidence | Meaning | Action |
|---|---|---|
| HIGH | Attacker-controlled input reaches vulnerable sink, no mitigation | Report + fix |
| MEDIUM | Vulnerable pattern, input source unclear | Note "needs verification" |
| LOW | Theoretical / defense-in-depth only | Do not report (unless asked) |

| Severity | Examples for this stack |
|---|---|
| **Critical** | Credit deduction bypass, IDOR to another user's job/photos, unverified payment webhook grants credits, leaked service_role / API key, RLS disabled in prod |
| **High** | IDOR write (missing userId in WHERE), race condition on credits, missing webhook idempotency, SSRF via user-supplied URL to a paid API |
| **Medium** | Missing rate limit on a costly/sensitive endpoint, price trusted from client, verbose error leaking internals |
| **Low** | Missing security header, noisy logging, `unsafe-inline` CSP |

---

## Audit sequence

Run these in order. Each section says **what to grep**, **what's a real bug vs a false positive**, and **the exact fix**.

### 1. Credit theft & race conditions (HIGHEST PRIORITY)

This is where the money leaks. The credit deduction MUST be atomic (row lock inside a transaction) and MUST happen server-side before the paid work is enqueued.

**Detect:**
```bash
grep -rn "createPendingJob\|deductCredits\|spendCredits\|\.for(\"update\")\|forUpdate\|db.transaction" lib --include="*.ts"
grep -rn "credits\|balance" app/api --include="*.ts" | grep -iv test
```

**Real bug — non-atomic deduction (race condition):** a `SELECT balance` followed by a separate `UPDATE balance - cost` without a row lock lets two concurrent requests both read the old balance and each spend it. Attacker fires N parallel requests and gets N jobs for the price of one.

**Fix — lock the row inside the transaction:**
```ts
await db.transaction(async (tx) => {
  const [row] = await tx.select().from(credits)
    .where(eq(credits.userId, userId))
    .for("update");                 // <-- row lock; serializes concurrent spends
  if (!row || row.balance < cost) throw new Error("INSUFFICIENT_CREDITS");
  await tx.update(credits)
    .set({ balance: sql`${credits.balance} - ${cost}` })
    .where(eq(credits.userId, userId));
  // insert job + transaction ledger row in the SAME tx
});
```

**Also verify:** credits are computed **server-side** from the provider config, never trusted from the request body. Grep for `body.credits`, `body.cost`, `input.creditsUsed` being read from the client → that's a bug. The cost must come from `provider.calculateCredits()` / a server constant.

**Refund path:** on enqueue failure the credits must be refunded, and the refund must be **idempotent** (guard on job status `done` and/or `onConflictDoNothing` on a unique key) so a double-fire doesn't double-refund.

### 2. IDOR / BOLA — reading or writing another user's data

Every route that takes an `id` from the URL must scope the DB query to the authenticated user. The read path is usually fine; the **write path is where it's forgotten**.

**Detect:**
```bash
# Routes with a dynamic [id] param:
find app/api -path "*\[id\]*" -name "route.ts"
# Ownership helper usage vs raw id-only queries:
grep -rn "getJobForUser\|eq(.*\.id, id)\|eq(.*\.userId" app/api --include="*.ts" | grep -iv test
```

For each `[id]` route, confirm the query filters by BOTH id and userId. A common trap: the handler does an ownership check (`getJobForUser(id, profile.id)`) but the subsequent `UPDATE`/`DELETE` filters only by `id`:

**Real bug — IDOR write (defense-in-depth gap):**
```ts
// ownership was checked above, but this UPDATE trusts only `id`:
await db.update(jobs).set({ ... }).where(eq(jobs.id, id));   // <-- fragile
```
If anyone later moves or removes the ownership check, this becomes a cross-user write.

**Fix — always scope the mutation itself:**
```ts
await db.update(jobs).set({ ... })
  .where(and(eq(jobs.id, id), eq(jobs.userId, profile.id)));  // <-- both
```
Apply the identical `and(...)` to every `UPDATE` and `DELETE`. The ownership check stays; this is the belt to its suspenders.

### 3. Supabase RLS (verify in production — not just in the repo)

RLS SQL living in `lib/db/rls.sql` proves **intent**, not **deployment**. The anon key is `NEXT_PUBLIC_` and therefore public; if RLS is off, that key reads your tables directly.

**Detect (repo):**
```bash
find . -name "rls.sql" -o -name "*policy*.sql" | grep -v node_modules
grep -rn "getSupabaseAdmin\|service_role\|SERVICE_ROLE" lib app --include="*.ts" | grep -iv test
```

**Verify (production — the agent cannot do this; instruct the user):** run in the Supabase SQL editor:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';
-- every app table must show rowsecurity = true
SELECT * FROM pg_policies WHERE schemaname='public';  -- confirm policies exist
```

**service_role isolation:** the service-role client (`getSupabaseAdmin()`) must be imported **only** in server files (route handlers, server actions, Inngest functions). Grep for it in any `"use client"` file or component → Critical leak. It must never be `NEXT_PUBLIC_`.

### 4. Payment webhooks — Stripe AND Mercado Pago

An unverified payment webhook = free credits: an attacker POSTs a fake "payment succeeded" and you grant a subscription.

**Detect:**
```bash
find app/api -path "*webhook*" -name "route.ts"
grep -rn "constructEvent\|verifyWebhook\|x-signature\|x-request-id\|stripeEventId\|idempoten" app/api lib --include="*.ts" | grep -iv test
```

**Stripe — must verify signature with the raw body:**
```ts
const sig = req.headers.get("stripe-signature")!;
const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
```
Read the body as `await req.text()` (raw), not `req.json()` — parsing first breaks signature verification.

**Mercado Pago — verify the `x-signature` HMAC.** MP sends `x-signature: ts=<ts>,v1=<hash>` and `x-request-id`. The manifest is `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` HMAC-SHA256'd with your webhook secret. Compare in constant time:
```ts
import { createHmac, timingSafeEqual } from "crypto";
const [tsPart, v1Part] = req.headers.get("x-signature")!.split(",");
const ts = tsPart.split("=")[1];
const received = v1Part.split("=")[1];
const manifest = `id:${dataId};request-id:${req.headers.get("x-request-id")};ts:${ts};`;
const expected = createHmac("sha256", process.env.MP_WEBHOOK_SECRET!).update(manifest).digest("hex");
if (!timingSafeEqual(Buffer.from(received), Buffer.from(expected))) return new Response("Unauthorized", { status: 401 });
```
Never use `===` on secrets/signatures — use `timingSafeEqual` (timing attack).

**Idempotency (both providers):** store the event/payment id with a UNIQUE constraint and `onConflictDoNothing`. Payment providers retry; without idempotency a retry double-grants credits.

**Order the grant on the ledger, not the request:** grant credits based on the verified event payload amount/price id, never on anything the client sent.

### 5. fal.ai webhook (async job results)

Your generation results come back via webhook. If it's not verified, an attacker forges "job done" with their own result URL, or replays to trigger re-processing.

**Detect:**
```bash
grep -rn "verifyFalWebhookSignature\|ED25519\|jwks\|FAL_WEBHOOK" app/api lib --include="*.ts" | grep -iv test
```

**Fix:** verify fal's ED25519 signature against their JWKS. If you have a legacy URL-secret fallback, compare it with `timingSafeEqual`, log when the legacy path is hit, and keep a removal date — a permanent plaintext `?secret=` fallback weakens the whole check.

### 6. Third-party AI API keys — server-only + SSRF + budget abuse

fal.ai, ElevenLabs, Deepgram, Anthropic keys are **money**. If leaked or callable without limits, someone drains your balance.

**Detect key leaks:**
```bash
grep -rn "NEXT_PUBLIC.*\(FAL\|ELEVEN\|DEEPGRAM\|ANTHROPIC\|OPENAI\|API_KEY\|SECRET\)" . --include="*.ts" --include="*.tsx" | grep -v node_modules
git log -p --all | grep -niE "sk-ant-|sk_live_|fal_|xi-api-key|Bearer [A-Za-z0-9]{20,}" | head
```
Any AI key under `NEXT_PUBLIC_` or in git history = Critical. History fix: **rotate the key** (a new commit doesn't remove it from history), then purge with `git filter-repo` if needed.

**Proxy pattern:** all calls to these APIs must go through YOUR server route (which checks auth + credits + rate limit), never from the browser directly. Grep client components for `elevenlabs`, `deepgram`, `fal.` SDK imports → they belong server-side.

**SSRF (Deepgram/ElevenLabs URL inputs):** Deepgram transcription and some TTS/audio flows accept a URL to fetch. If that URL comes from the user, an attacker points it at internal metadata endpoints (`169.254.169.254`) or your own private services.
```ts
// VULNERABLE: user-supplied source URL passed straight to the API
deepgram.listen.prerecorded.transcribeUrl({ url: body.audioUrl });
```
**Fix:** allowlist the host, reject private/link-local ranges, or only accept files you uploaded to your own storage and pass a signed URL you generated.

**Anthropic prompt injection / cost abuse:** if you expose an LLM feature, (a) cap `max_tokens` server-side, (b) rate-limit per user, (c) never let user text redefine the system prompt, (d) treat model output as untrusted (don't `eval` it, don't render it as raw HTML).

### 7. Rate limiting coverage

Every endpoint that costs money (calls a paid API), sends email, or is sensitive (delete, auth) needs a per-user limit. Cheap read-only endpoints don't.

**Detect:**
```bash
for f in $(find app/api -name route.ts | grep -iv test); do
  echo "$(grep -cE 'atelimit|ateLimit|reserveJobSlot' "$f") $f"; done | sort -n
```
Zero-count rows are candidates. **Prioritize:** anything hitting fal/Eleven/Deepgram/Anthropic, `account/delete`, auth/magic-link, checkout. **Fix:** wrap with Upstash `@upstash/ratelimit` keyed on `profile.id`, fail-closed on paid endpoints (deny if the limiter errors) — but you may fail-open on non-costly ones to avoid blocking legit users.

### 8. Input validation & injection

**Detect:**
```bash
grep -rn "safeParse\|z\.\|zod" app/api --include="*.ts" | grep -iv test   # coverage
grep -rn "await request.json()" app/api --include="*.ts" | grep -iv test  # each must be validated after
grep -rn "sql\`\|\.raw(\|execute(" lib --include="*.ts" | grep -iv test    # raw SQL
grep -rn "dangerouslySetInnerHTML\|eval(\|new Function\|child_process" app lib components --include="*.ts" --include="*.tsx" | grep -iv test
```
Every `request.json()` must be followed by a Zod `safeParse`. Drizzle's `eq/and` parameterize automatically — safe. Only flag raw `sql` template literals that interpolate **user input**. `dangerouslySetInnerHTML` is only a bug if the `__html` value contains user-controlled data (JSON-LD from server constants is safe).

**Upload validation (biometric-sensitive):** headshot/photo uploads are biometric data. Confirm: MIME allowlist, extension allowlist, size cap, filename sanitization (strip path separators), and a short storage expiration. Grep the upload initiate route for `ALLOWED_IMAGE_TYPES`, `MAX_FILE_SIZE`, `sanitizeFilename`.

### 9. Secrets, logging, headers (lower priority)

```bash
grep -rn "console\.\(log\|error\|warn\)" app/api lib --include="*.ts" | grep -iv test | grep -iE "token|secret|key|password|email|signature"
grep -rn "Content-Security-Policy\|Strict-Transport\|X-Frame-Options" next.config.* middleware.ts 2>/dev/null
```
Flag logging of tokens/secrets/signatures. Confirm the security-header block exists (CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy). `unsafe-inline` in `script-src` is a known Next.js App Router tradeoff (Low) — the real fix is a nonce-based CSP via middleware.

---

## Output format

For each finding:

```markdown
### [SEV-CONF] <Vulnerability> — <severity>
- **Location**: `path/to/file.ts:line`
- **Confidence**: High / Medium
- **Issue**: what it is, in one line
- **Impact**: what an attacker gains (steal credits / read user X's data / drain API budget)
- **Fix**:
  ```ts
  // exact corrected code
  ```
```

End with:
1. A prioritized punch list (Critical → Low).
2. **Manual verification items** the agent cannot check from code — RLS `rowsecurity` in prod, webhook secrets set in the deploy env, keys rotated after any history leak.

If nothing found in a section, say so briefly and move on. Do not invent findings to fill the report.

## What NOT to flag (false-positive guard)

- Values from `process.env` / `settings` (server-controlled), not from `request`.
- Drizzle `eq()/and()` queries (parameterized).
- React `{variable}` (auto-escaped); `dangerouslySetInnerHTML` with server constants.
- Endpoints reachable only after an auth + ownership check (note the requirement instead of flagging).
- Test files, dead/commented code.
- Missing rate limit on a cheap read-only endpoint with no paid-API call.
