# SEO Crawl Fixes — Tracker

Source: live crawl check of massclick.in, 2026-09-18 (Moz: DA 13, 56 ranking keywords).
Approved scope: fixes 1 (soft 404s), 3 (sitemap/page mismatch), 5 (robots.txt), plus the
thin-page rule — **location pages with fewer than 2 listings are noindexed and left out of
the sitemap**; district-wide pages need at least 1.

## Indexability rule (one rule, applied in three places)

| Page | Indexed when | Otherwise |
|---|---|---|
| Known category, district-wide (`/trichy/hotels`) | ≥ 1 listing | `noindex, follow` (200) |
| Known category, location (`/trichy/hotels-in-srirangam`) | ≥ 2 listings | `noindex, follow` (200) |
| Unknown category = free-text search (`/trichy/dosa`) | never | `noindex, follow`; **404** when 0 results |
| Business page whose business does not exist | never | **404** (SPA shell still sent as body) |

Applied by: SSR (`ssrMiddleware.js`), React (`SearchResult.js`, count threshold only), and the
sitemap (`sitemapRoutes.js`, emits only pages that pass).

## Checklist

### Root cause: same-named ward/locality resolved to the wrong node
- [x] `locationResolver.js` — `resolveLocationWithinDistrict` hydrates the path-index hit to the
      full doc (keeps searchGroupSlug / pincodes that search scope needs)
- [x] `businessListHelper.js` — `findBusinessesByCategory` resolves by `locationPath` first
- [x] `businessListController.js` — `mainSearchController` accepts optional `locationPath`
- [x] `ssrMiddleware.js` — passes `locationPath`; businesses cache key bumped v2 → v3
- [x] `SearchResult.js` — sends `locationPath` with every search request

### Fix 1 — soft 404s / thin pages (SSR)
- [x] Business: 3-segment publicId miss → 404; 4/5-segment legacy ObjectId miss → 404
- [x] Category: unknown category → noindex (+404 at 0 results); known below threshold → noindex
- [x] robots applied to `<meta name="robots">`, `window.__SSR_SEO__`, and `X-Robots-Tag`
- [x] Honour an explicit `noindex` stored on the SEO meta record (sanitised: it lands in a header)

### Fix 1 — React
- [x] `SearchResult.js` — below-threshold result count forces `noindex, follow` (only once the
      search has resolved, so a stored-meta page never flashes noindex mid-fetch)

### Fix 3 — sitemap
- [x] Location sitemaps: every (location, category) URL is round-tripped through the router's own
      classifier and credited only to the node it serves — fixes double counting when a locality
      collapses onto its same-named ward, and name collisions like Dindigul Central
- [x] Only rows the page's own text match would list (`pg/hostels` never matches "pg hostels")
- [x] Known categories only; threshold applied; one entry per URL (658 prod duplicates → 0)
- [x] Legacy-locations sitemap: same rules, and district-name free text skipped (was duplicating
      `/trichy/<category>`)

### Fix 5 — robots.txt
- [x] `wellKnownRoutes.js` (the live one) — single group so every bot gets the Disallow lines;
      `/dashboard` added
- [x] `client/ui-app/public/robots.txt` — kept in sync

### Verify (dev DB, read-only harness, Redis off)
- [x] `node --check` on every touched server file; Babel parse of `SearchResult.js`
- [x] Ward/locality: "bank in Sangiliyandapuram" 2 → 8 listings; search API 1 → 2 for Allithurai
- [x] Probes: fake category / free-text with 0 results / ghost business (all 3 URL shapes) → 404
      noindex; real category + business pages → 200 index; markdown variant follows suit
- [x] Sampled sitemap URLs: 299/300 render 200 + index + enough listings (the 1 is a Mannargudi
      legacy redirect — fix 4, out of scope)
- [ ] Full pass over every sitemap location URL (started, interrupted by session end — no results)
- [ ] User deploys; then re-run the live checks from the crawl check

## Not in scope (flagged, not done)
- Fix 2 content rewrite (templated locality copy) — next phase
- Fix 4 legacy sitemap redirects (Mannargudi businesses unlinked from masterlocations)
- Single-segment unknown paths (`/qwerty-page`) still 200 — needs a server-side SPA route list
- Deactivated (not live) businesses still render an indexable page
- `llms.txt` / `llms-full.txt` still list 1-listing location pages
