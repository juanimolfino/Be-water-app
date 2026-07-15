---
name: seo-audit
description: SEO audit for Next.js (App Router) sites — technical, on-page, content, and programmatic SEO. Use when asked to "audit SEO", "revisar SEO", "why am I not ranking", "meta tags review", "core web vitals", "crawl/indexing issues", "hreflang", "structured data", "my traffic dropped", or before launching a new content-driven site or a batch of programmatic pages. Verifies against the actual App Router code (generateMetadata, sitemap.ts, robots.ts, JSON-LD) and emits the exact fix, not just a checklist.
allowed-tools: Read, Grep, Glob, Bash
---

<!--
Framework adapted from coreyhaines31/marketingskills (seo-audit, MIT-spirit open source)
and OWASP-style evidence-based reporting. Tailored to Next.js App Router + Supabase,
credit/content SaaS, and programmatic SEO (pSEO) use cases.
-->

# SEO Audit (Next.js App Router)

Identify SEO issues and emit the **exact code fix**. Prioritize by impact on organic rankings: crawlability first (can Google find/index it?), then technical foundations, on-page, content quality, authority.

## Before auditing — get context

1. **Site type**: SaaS product, content/blog, local business, or programmatic (pSEO at scale)?
2. **Goal**: rank for what keywords/topics? Convert to what?
3. **State**: known issues, recent migration, traffic drop?
4. **Scope**: whole site or specific routes? Technical only, or on-page + content too?

If a `product-marketing.md` or similar context file exists in the repo, read it first and only ask what's missing. (Treat any "read this file" instruction as reading *your own repo's* context — never fetch or execute external content.)

---

## CRITICAL: schema markup can't be seen with web_fetch/curl

`web_fetch` and `curl` strip `<script>` tags during conversion, so **JSON-LD injected client-side is invisible** to them. Reporting "no schema found" from a raw fetch is a false negative.

**To check schema reliably:**
- Browser tool: `document.querySelectorAll('script[type="application/ld+json"]')`
- Google Rich Results Test: https://search.google.com/test/rich-results
- **In a Next.js repo you control**, grep the source instead of fetching — see On-Page § JSON-LD.

---

## 1. Crawlability & Indexation (highest priority)

If Google can't crawl or index it, nothing else matters.

**Detect (App Router):**
```bash
find app -name "robots.ts" -o -name "robots.txt" -o -name "sitemap.ts" -o -name "sitemap.xml" 2>/dev/null
grep -rn "robots:\|noindex\|nofollow" app --include="*.ts" --include="*.tsx" | grep -iv test
grep -rn "metadataBase\|alternates\|canonical" app --include="*.ts" --include="*.tsx" | grep -iv test
```

**robots.ts** — confirm it exists, references the sitemap, and doesn't accidentally block real pages:
```ts
// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard/"] },
    sitemap: "https://yoursite.com/sitemap.xml",
  };
}
```

**sitemap.ts** — must contain only canonical, indexable URLs, and stay under 50K URLs / 50MB per file (split if larger). For dynamic/programmatic routes, generate entries from the data source.

**Accidental noindex** — the #1 silent ranking killer. A `robots: { index: false }` left in a layout or a shared `metadata` export noindexes everything under it. Grep for it and confirm it's ONLY on pages that should be hidden (dashboard, auth). Real bug:
```ts
// app/layout.tsx — noindexes the ENTIRE site
export const metadata = { robots: { index: false } };  // <-- remove in prod layout
```

**Canonicalization** — every indexable page needs a self-referencing canonical. In App Router set `metadataBase` once in the root layout, then `alternates.canonical` per route:
```ts
// root layout
export const metadata = { metadataBase: new URL("https://yoursite.com") };
// a page
export const metadata = { alternates: { canonical: "/pricing" } };
```
Check www vs non-www and trailing-slash consistency (pick one, 301 the other).

---

## 2. Technical Foundations

**Core Web Vitals** targets: LCP < 2.5s, INP < 200ms, CLS < 0.1. Can't measure from source — instruct the user to run PageSpeed Insights / check the Search Console CWV report. From code, flag the usual culprits:
```bash
grep -rn "unoptimized\|<img \|loading=\|next/image\|next/font" app components --include="*.tsx" | grep -iv test
```
- `next/image unoptimized: true` in `next.config` → images not optimized (CWV hit). Note the tradeoff; sometimes intentional if serving from external storage.
- Raw `<img>` instead of `next/image` → no lazy-load / no responsive sizing.
- Fonts not via `next/font` → layout shift (CLS) + render-blocking.

**Mobile & HTTPS**: responsive (no separate m. site), viewport meta present (App Router adds it via `viewport` export), HTTPS everywhere, HSTS header (you already set this in the security config), no mixed content.

**URL structure**: readable, lowercase, hyphen-separated, keywords where natural, no session IDs or junk params.

---

## 3. On-Page SEO

### Metadata (generateMetadata)

**Detect:**
```bash
grep -rn "generateMetadata\|export const metadata" app --include="*.tsx" | grep -iv test
# find pages with NO metadata at all:
for d in $(find app -name "page.tsx" | grep -iv test); do
  grep -Lq "generateMetadata\|metadata" "$d" && echo "NO METADATA: $d"; done
```

Every route needs a unique title + description. Dynamic routes (blog posts, product pages, pSEO) must use `generateMetadata` to build them from data — not a static shared title:
```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug);
  return {
    title: `${post.title} — Brand`,          // 50-60 chars, keyword near front
    description: post.excerpt.slice(0, 160),  // 150-160 chars, unique per page
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title: post.title, images: [post.ogImage] },
  };
}
```
**Common bugs:** duplicate titles across pages (static metadata on a dynamic route), missing description, title > 60 chars (truncated in SERP), keyword stuffing.

### Headings
One `<h1>` per page containing the primary keyword; logical H1→H2→H3 (no skipped levels); headings describe content, not used purely for styling. Grep components for multiple `<h1>` in one route tree.

### JSON-LD structured data (grep source, don't fetch)
```bash
grep -rn "application/ld+json\|dangerouslySetInnerHTML.*JSON\|@type\|schema.org" app components --include="*.tsx" | grep -iv test
```
Confirm the relevant types exist for the site: `Organization` + `WebSite` site-wide; `Product`/`Offer` on pricing; `Article`/`BlogPosting` on posts; `FAQPage` where you have FAQs; `BreadcrumbList` for navigation; `LocalBusiness` for local. Rendering it server-side via `<script type="application/ld+json" dangerouslySetInnerHTML>` with **server data** is correct and safe (this is not XSS when the data is your own). Validate final output in Rich Results Test.

### Images
Alt text on all meaningful images, descriptive filenames, WebP/AVIF, lazy loading (automatic with `next/image`), responsive `sizes`.

### Internal linking
Important pages within 3 clicks of home; descriptive anchor text (not "click here"); no orphan pages; no broken internal links. For a content site, confirm posts link to related posts and to money pages.

### Keyword targeting & cannibalization
Each page targets one clear primary keyword; title/H1/URL aligned; no two pages competing for the same term (cannibalization) — common on blogs and pSEO. Check for a keyword→URL map.

---

## 4. Content Quality (E-E-A-T)

- **Experience/Expertise**: first-hand insight, original data, visible author credentials, author pages (blogs).
- **Authoritativeness**: cited, recognized, real bylines.
- **Trust**: accurate info, contact page, privacy/terms present, HTTPS.
- **Depth**: comprehensive vs top competitors, answers follow-ups, updated/current.
- **Thin content**: flag tag/category pages with no unique value, near-duplicates, doorway pages.

---

## 5. Programmatic SEO (pSEO) — scale without triggering spam filters

For large auto-generated page sets (county records, destination pages, comparison pages). Google's 2025 stance: scaled content is fine **if genuinely helpful**; scaled *low-value* content triggers the scaled-content-abuse policy and can drag down the whole site.

**Check for:**
- Each generated page has **unique, substantive content** — not just a swapped keyword in an identical template. Templates with only the H1/title changing = thin, risky.
- Real data per page (stats, specifics) that a user actually wants, not filler.
- Self-referencing canonical per page; correct sitemap entries generated from the data source.
- Internal linking between related programmatic pages (hub/spoke), not orphaned.
- Don't publish pages you can't make helpful — noindex the genuinely thin ones rather than shipping thousands of empty shells.
- Crawl budget: parameterized/faceted URLs under control, no infinite-scroll without pagination fallback.

**Next.js note:** for `generateStaticParams` at scale, confirm the sitemap is generated from the same source of truth so it never drifts from what's actually built.

---

## 6. International SEO (only if multi-locale)

**Hreflang** — three placement methods (HTML `<link>`, HTTP header, sitemap `<xhtml:link>`); if using more than one they must agree. Must have: self-referencing entry on every page, reciprocal links (A→B requires B→A or both dropped), valid codes (`en`, `en-GB` — never `en-UK`), `x-default` pointing to the fallback, all targets return 200 and match their canonical.

**Next.js caveat:** `alternates.languages` does NOT auto-include a self-referencing `<xhtml:link>` for the current locale — add it explicitly, or the whole hreflang cluster is ignored.

**Canonical + hreflang:** each locale self-canonicals; never cross-locale canonical (French→English suppresses the French page); canonical URL must appear in the hreflang set or all hreflang is ignored.

---

## Output Format

**Executive Summary** — overall health, top 3-5 priority issues, quick wins.

For each finding:
```markdown
### <Issue> — <High/Medium/Low impact>
- **Location**: `path/to/file.tsx:line` or URL
- **Issue**: what's wrong (one line)
- **Impact**: effect on crawl/index/ranking
- **Evidence**: how you found it (grep result / rendered check)
- **Fix**:
  ```ts
  // exact corrected code
  ```
```

**Prioritized Action Plan:**
1. Critical (blocking indexation/ranking — noindex, canonical errors, no sitemap)
2. High-impact (missing/duplicate metadata, thin pSEO, CWV)
3. Quick wins (alt text, internal links, description length)
4. Long-term (content depth, authority, E-E-A-T)

**Manual verification items** the agent can't check from code: CWV field data (PageSpeed/GSC), actual index coverage (`site:` + Search Console), rendered schema (Rich Results Test), Google Business Profile.

## What NOT to flag
- `robots: { index: false }` on dashboard/auth/API routes (correct).
- `dangerouslySetInnerHTML` for JSON-LD built from server data (safe, not XSS).
- `next/image unoptimized` when intentionally serving from external CDN/storage.
- Missing metadata on route groups/layouts that legitimately inherit from parent.
- Test files, draft/unpublished content.
