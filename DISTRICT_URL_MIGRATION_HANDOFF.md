# District-Prefixed URL Restructure — Handoff

Phases 0-7 are complete and committed. Stopped after Phase 7 — next up is Phase 8 (sitemap district prefixes). Phase 8 was read fresh but not implemented; no code changes for it are in progress. Everything committed so far is tested and working within the constraints noted below. This doc is self-contained — written so a fresh AI session (any tool) or a human engineer can resume without access to prior conversation history.

**Repo:** `D:\dev_abishek\massclick` — server (Express/Mongoose) at `server/`, client (React SPA) at `client/ui-app/`. Mobile app is a sibling repo at `D:\dev_abishek\massclick-mobile-app`.

**Branch:** `dev`. All work so far is committed there, nothing pushed to remote, nothing merged to `main`/`prod`.

**Full original plan:** `C:\Users\USER\.claude\plans\c-users-user-claude-plans-fancy-orbiting-breezy-sprout.md` (Windows path, local to the machine this session ran on). This handoff doc reproduces everything load-bearing from it, but that file has the original phase-by-phase rationale in full prose if something here is ambiguous.

---

## Why this migration exists

Public URLs are `/:location/:category` (e.g. `/srirangam/hotels`) with no district segment. **390 of 6,493 distinct locality/ward/zone names are shared across 2+ districts** — "Anna Nagar" exists in 4 districts, "Puthur" in 7 — so a bare `/anna-nagar/hotels` is ambiguous and today silently returns whichever district's businesses the free-text matcher happens to rank first.

Target URL shapes:
- `/:district` — district-wide landing page
- `/:district/:category` — district-wide category
- `/:district/:location/:category` — locality-specific
- `/:district/:location/:category/:subcategory`
- `/business/:district/:location/:businessSlug/:id`

---

## Commits so far (newest first)

```
5684b82b feat(location): unify district breadcrumbs                                      [Phase 7, DONE]
612e6dfe feat(location): make SSR and analytics district-aware                           [Phase 6, DONE]
f96300da feat(location): migrate frontend links to district URL builders                 [Phase 5, DONE]
af8f0c60 feat(location): wire district-prefixed frontend routing                         [Phase 4, DONE]
b927e800 docs: update handoff doc — Phase 3 complete
53f40fde feat(location): add GET /v2/location/resolve endpoint                              [Phase 3, DONE]
00e5395d docs: add district URL migration handoff/continuation doc
8aa3ed69 feat(location): thread optional district param through search/business/SEO APIs    [Phase 3]
66a48fa4 feat(location): add district-URL resolver, segment classifier, and crumb builder    [Phase 2, DONE]
9acc5884 feat(location): add district-aware public URL slugs for masterlocations             [Phase 1, DONE]
a499a5cc fix(leads): fail closed when a search location cannot be resolved                   [Phase 0, DONE]
0c6490ba feat(sitemap): emit full location x category matrix + admin cache reset             [pre-existing, unrelated — see note below]
```

`0c6490ba` was **not written by this migration** — it was uncommitted work already sitting in the working tree when this session started (a sitemap cross-join restructure + admin cache endpoint). It got committed early in the session because it was blocking a clean `git status`, and in the process 16 double-encoded em-dashes were found and fixed in `sitemapRoutes.js` (2 of them were inside the `/llms.txt` output actually served to crawlers). Mentioned here only so nobody mistakes it for migration work when reading `git log`.

---

## What's done (Phases 0–7 complete)

### Phase 0 — Fail-closed lead guard (standalone, shipped independently)
Fixed a bug **unrelated to and predating this migration**, found while researching it: an unresolved search location normalized to the sentinel `"global"`, which then **disabled** the location filter on lead matching (`server/controller/businessList/logSearchController.js`) instead of blocking it — so an unresolvable location caused WhatsApp/FCM lead alerts to fan out to businesses **nationwide**, sorted by who pays the most. Six producers could already trigger this before any URL change. Now fails closed behind a `lead_guard_require_location` setting (default true, admin-toggleable in Settings → Lead Guards). Also added `district`/`masterLocationSlug` fields to `searchLogSchema.js`, currently unused by any writer except the guard itself.

**Not verified in prod.** Dev DB had zero lead data (`searchlogs`/`leadsData` both empty), so the fix's correctness is verified by direct code-path testing, but whether the bug was *actually firing* in prod was never confirmed — that needs `db.users.countDocuments({"leadsData.location":"global"})` run against prod, which nobody has done.

### Phase 1 — Schema, slugs, canonical cleanup
- `server/schema/location/masterLocationSchema.js`: added `publicLocationSlug` (indexed, compound `{district:1, publicLocationSlug:1}`) and `urlAlias` (district docs only).
- `server/helper/location/locationSlug.js` (new file) — the single slug/display-name authority:
  - `getPublicLocationSlug(doc)` — bare candidate slug, NOT guaranteed unique.
  - `computePublicLocationSlugs(docs)` — **the important one**. Batch-computes collision-resolved slugs. **Discovered live:** 93 candidate slugs collide at the exact same level within the same district (Tiruchirappalli alone has 9 localities named "Anna Nagar" in 9 different wards) — the plan's original "deepest level wins" tie-break only handles cross-level collisions, not same-level ones. Fixed by qualifying with progressively more of the ancestor chain (ward, then zone) until unique — e.g. `anna-nagar-lalgudi`. Falls back to a numeric suffix only when the full chain is exhausted (14 of 371 originally-colliding nodes; spot-checked two — genuine pre-existing duplicate data, e.g. two zone docs in Salem both named "Attur", one of which is actually "Attur Panchayat Union").
  - `getDistrictUrlSlug(doc)` — district's URL segment (urlAlias-first).
  - `getDistrictDisplayName(doc)` — district's display label (urlAlias-first, title-cased with hyphens converted to spaces).
- `server/scripts/backfillPublicLocationSlug.js` (new, **not committed** — `server/scripts/` is gitignored repo-wide, matching every other one-off script already there) — populates the new fields, runs the collision-gate checks, refuses to write if a check fails. **Already run against `massClick_dev`**: all 8,206 active docs have a unique `publicLocationSlug` within their district+level; `urlAlias:"trichy"` seeded on Tiruchirappalli; zero district-slug collisions with reserved routes. **Has NOT been run against prod.**
- `server/schema/seoSchema/seoPageContentBlogSchema.js` — removed a `pre("validate")` hook that auto-wrote a pre-migration-shape `canonicalUrl` into every new doc. Verified that field is write-only (nothing reads it anywhere in server or client) before removing rather than migrating it.
- Deleted `server/helper/seo/renderSeoHtml.js` — dead code, never imported, did positional `req.path.split("/")`.

### Phase 2 — Resolver, classifier, crumb builder
- `server/helper/location/locationResolver.js` gained: `getAllDistrictDocs()` (5min cache, ~38 docs), `resolveDistrictBySlug(slug)`, `resolveLocationWithinDistrict(districtDoc, slug)`, `resolveRouteLocation({districtSlug, locationSlug})`. Uses `publicSlugify` (aliased import from `server/slugify.js`) — **NOT** this file's own local `slugify`, which is a different, incompatible implementation used for free-text search matching. Mixing them up silently breaks matching (verified: 4 of 7 sample names differ between the two, e.g. "K.K. Nagar" → `k-k-nagar` vs `kk-nagar`).
- `server/helper/location/urlSegmentClassifier.js` (new) — `classifyMiddleSegment({districtDoc, p2, p3})` disambiguates the one genuinely ambiguous URL shape: `/:district/:p2/:p3` means either "district-wide category + subcategory" or "locality-specific category" depending on whether `p2` is a known top-level category slug (`categoryType: "Primary Category"` in the category schema) or resolves as a location within the district. Kept separate from `locationResolver.js` since it composes both domains (verified no circular import risk).
- `server/helper/seo/breadcrumbBuilder.js` + `client/ui-app/src/utils/breadcrumbs.js` (new, parallel files) — `buildCrumbs(...)` → `[{name, path}]` (site-relative paths, origin applied once at the JSON-LD boundary — this is what prevents the pre-existing www/non-www split in `SearchResult.js`'s old breadcrumb code), `crumbsToJsonLd`, `crumbsToUiItems`. Wired into pages in Phase 7. Server version takes raw Mongoose docs; client version takes flat already-resolved strings (client has no DB access) — this divergence is deliberate and documented in both files' headers; what MUST stay identical between them is the crumb *sequencing logic*, not the function signature.
- Converged the two pre-existing `BreadcrumbList` generators (`server/utils/htmlUtils.js`'s `buildBreadcrumbSchema` was `{name,item}`, client used `{name,url}`). Phase 7 later moved the SSR category/blog breadcrumbs onto `helper/seo/breadcrumbBuilder.js`, so `ssrMiddleware.js` no longer depends on the old positional breadcrumb objects.

### Phase 3 — Backend district param support (DONE)

Every endpoint below: `district` is always an optional URL slug (e.g. `"trichy"`), resolved internally, absent = pre-migration behavior byte-for-byte unchanged. **This convention must be preserved for anything added later — don't accept a raw district name anywhere.**

- `mainSearchController` (`server/controller/businessList/businessListController.js:~785`) — the actual collision fix. Verified directly: `location=anna-nagar` under `district=trichy` → 2,455 results (all Tiruchirappalli); under `district=dindigul` → 71 results (all Dindigul). Same text, disjoint sets.
- `findBusinessesByCategory` (`server/helper/businessList/businessListHelper.js`) — signature changed from `(category, district)` (where `district` was actually free text, never a real district) to `(category, {locationText} | {districtSlug, locationSlug})`. Both call sites updated (`ssrMiddleware.js:176`, `businessListController.js`'s `viewBusinessByCategory`) — mechanical only, zero behavior change for existing callers.
- `findBusinessBySlug` / `getBusinessBySlugAction` — optional `district`, filtered against `masterLocation.district`.
- `getSeoMeta` (`server/helper/seo/seoHelper.js`) — `district` now part of the cache key (`seo-meta:...`). Without this, two districts sharing a location/category text would share a 24h-cached canonical — verified directly that `anna-nagar`+`trichy` and `anna-nagar`+`dindigul` now cache separately. `buildDynamicSeoMeta` (the fallback used for most long-tail pages) and `seoTemplateHelper.js`'s `renderSeoMetaFromTemplate` both prepend the district slug to the canonical when supplied.
- `getV2ParentOfSubCategoryAction` (`server/controller/categoryDisplaySettings/categoryDisplaySettingsController.js`) — now also returns `parentName` alongside `parentSlug`, needed for Phase 7's subcategory breadcrumb (title-casing a slug client-side breaks on `&`, "and", acronyms).
- `GET /api/v2/location/resolve` (new — `server/controller/location/masterLocationController.js`'s `resolveRouteLocationAction`, mounted in `server/routes/masterLocationRoute.js`) — wraps the classifier for Phase 4's `DistrictRouteResolver` to call. Accepts `district`, optional `p2`/`p3`; returns `{district, classification}` where `classification.type` is `"district"`, `"districtCategory"`, `"location"` (reshaped to flat `{slug, name, level}`, not the raw Mongoose doc), or `"unknown"` (no hard 404, matches the plan's best-effort fallback). Verified all seven cases directly against dev data, including the Phase 1 qualified-slug edge case (`anna-nagar-lalgudi` resolves correctly and returns its clean display name "Anna Nagar", not the internal qualified slug).

Deferred (per original plan, don't block on these): `getEnhancedSuggestionsController`, `viewBusinessByCategory` — neither builds canonical public URLs.

---

### Phase 4 — Frontend routing + corrupting-rewrite fix (DONE)

Commit: `af8f0c60 feat(location): wire district-prefixed frontend routing`

- `client/ui-app/src/App.js` now has district-prefixed public routes after named/static routes:
  `/:district`, `/:district/:category`, `/:district/:p2/:p3`, `/:district/:location/:category/:subcategory`, and `/business/:district/:location/:businessSlug/:id`.
- `DistrictRouteResolver` calls `/api/v2/location/resolve` and passes explicit `routeContext` down instead of making downstream components infer meaning from raw positional params.
- `categoryRouter.js` was updated for district-aware routing and the category/subcategory rendering decision no longer depends on shifted raw params.
- `SearchResult.js` mismatch redirect now rebuilds targets with `buildCategoryPath(...)`, preserving district-prefixed URLs instead of replacing them with legacy paths.
- Verified with focused client ESLint and a direct route-resolution script against dev Mongo for `/trichy`, `/trichy/hotels`, `/trichy/srirangam/hotels`, `/trichy/hotels/luxury-hotels`, and qualified-slug cases.

### Phase 5 — Shared URL builders + migrate link sites (DONE)

Commit: `f96300da feat(location): migrate frontend links to district URL builders`

- `client/ui-app/src/utils/searchResultNavigation.js` now exports the central URL builders and context helpers: `createSlug`, `createDistrictSlug`, `getLocationContext`, `buildCategoryPath`, `buildBusinessPath`, and district-aware `getEffectiveSearchLocation`.
- Search bars and `locationReducer` now persist structured selected-location context (`districtName`, `districtSlug`, `locationSlug`, `masterLocationSlug`) while keeping legacy keys available.
- Migrated frontend link/schema/canonical/share sites to shared builders across SearchResult business links, business detail sharing/copy/canonical URLs, favorites, visiting-card fallback, review success redirect, categories, service-card schema URLs, trending/top tourist/popular category flows, blog listing CTAs/navbar, dormant popularCategoryDrawer code, and SEO schema URL generation.
- Fixed shared slug parity for ampersands (`&` → `and`) after a throwaway builder verifier caught a server/client mismatch.
- Verified with focused ESLint and a temporary `client/ui-app/verifyPhase5UrlBuilders.cjs` script, then deleted before commit. Remaining known warnings only: `cardDetails.js` unused `err`, `searchResultNavigation.js` unused `dispatch`.

### Phase 6 — SSR, canonical, cache, analytics continuity (DONE)

Commit: `612e6dfe feat(location): make SSR and analytics district-aware`

- `server/middleware/ssrMiddleware.js` now classifies category routes through `resolveCategoryRouteContext(...)` instead of positional first/second/third segment parsing.
- SSR cache keys are district-aware (`district:<districtSlug>:<locationSlug|all>:<category>:<subcategory>`) and business lookups pass `{districtSlug, locationSlug}` where available.
- Category canonical URLs for SSR are built from the classified route, preserving district prefixes and subcategories.
- SSR business URLs in JSON-LD, visible HTML, and markdown use the district-aware business path builder.
- `server/helper/webAnalytics/webAnalyticsHelper.js` normalizes new district-prefixed category/business paths at ingest so legacy and new shapes do not split dashboard metrics.
- Verified with `node --check`, `git diff --check`, and DB-backed route/analytics checks against dev Mongo. `seoHelper.js` still has district in the dynamic SEO cache key.

### Phase 7 — Breadcrumbs (first-class) (DONE)

Commit: `5684b82b feat(location): unify district breadcrumbs`

- Wired `buildCrumbs`/`crumbsToJsonLd`/`crumbsToUiItems` into `SearchResult.js`, `cardDetails.js`, `categories.js`, `blogDetails.js`, and `ssrMiddleware.js`.
- SSR now uses the same crumb trail for JSON-LD, visible HTML breadcrumbs, and AI-crawler markdown.
- `categories.js` now has visible breadcrumbs.
- Search results now use the Phase 3 `parentName` response to add the parent category crumb on subcategory pages.
- Blog breadcrumbs now point to `/blog` instead of guessing a category/location listing URL.
- Business-detail SSR breadcrumbs remain explicitly deferred because business detail pages are still not SSR-rendered.
- Verified with `node --check`, `git diff --check`, focused client ESLint (`--no-inline-config` to bypass a pre-existing missing hook-rule inline disable) and client/server pure-helper breadcrumb fixtures. Remaining known warning: `cardDetails.js` unused `err`.

## Remaining work (Phases 8–11)

### Phase 8 — Sitemap district prefixes (mechanical, ships after Phase 5)

`server/routes/sitemapRoutes.js` — thread the district's public slug into the location sitemap and business sitemap URLs. This file already got restructured once this session (the pre-existing `0c6490ba` commit) for the location×category cross-join — that work is unrelated to this migration but touches the same file, so read it fresh before editing. Phase 8 was started only as an inspection pass after Phase 7; no sitemap edits have been made yet.

### Phase 9 — Mobile app defensive scope

Sibling repo `D:\dev_abishek\massclick-mobile-app`. The Flutter router's only multi-segment route is `/:location/:category` — 3/4/5-segment district URLs hit `NotFoundScreen`. Minimum scope: a `go_router` redirect accepting the new shapes (especially `/business/:d/:l/:slug/:id`, the shape printed on physical visiting cards), update `marketing_profile.dart`'s fallback URL, fix the analytics path shape sent to the web-shared `/site-events` stream (including a pre-existing bug where un-slugged `currentCity` emits paths containing spaces), start sending `district` on `/businesslist/search` so mobile and web stop returning different results for the same query. Explicitly deferred: `assetlinks.json`/AASA/`autoVerify` (pre-existing gap, ops work, wrong time to add during a URL migration).

### Phase 10 — 301 redirects (ships LAST, staging first, never straight to prod)

New `server/middleware/legacyUrlRedirectMiddleware.js`. **Single highest-risk line in the whole migration:** always try resolving the incoming path as new-style first and `next()` on success; only reinterpret as legacy if that fails. Backwards, this redirect-loops or misredirects every new-style request. QR codes baked into business certificates/visiting cards mean this redirect layer is **permanent infrastructure**, not a migration-window thing — put a comment saying so, someone will try to delete it in two years. Businesses without a QR yet get the new URL shape minted; existing QRs are never mass-regenerated (the idempotency check should accept either shape as current).

### Phase 11 — Cleanup (anytime, low priority)

Delete two confirmed-dead code paths (`popularCategoryDrawer.js`'s unreferenced `CategoryDynamicPage`, `popularCategories.js`'s computed-but-never-used district-aware URL array) and leave a TODO on the confirmed-dormant `server/generateStaticPages.js`.

---

## Conventions established this session — follow these in every remaining phase

1. **`district` is always a URL slug, always optional, always resolved internally.** Every function that accepts it does `resolveDistrictBySlug(district)` (or composes via `resolveRouteLocation`) rather than expecting the caller to have pre-resolved it. Never accept a raw district *name* ("Tiruchirappalli") where a slug ("trichy") is expected, or vice versa — this exact confusion existed in the pre-migration `findBusinessesByCategory(category, district)` signature (where `district` was actually neither, just free text) and caused real design friction when fixing it.
2. **`server/helper/location/locationSlug.js` is the single authority** for anything slug- or display-name-related on a masterlocation doc: `getPublicLocationSlug`, `computePublicLocationSlugs`, `getDistrictUrlSlug`, `getDistrictDisplayName`. Don't reimplement any of these a third time — grep for the function name first.
3. **Two slugify implementations exist server-side and are NOT interchangeable**: `server/slugify.js` (canonical, used for all URL-facing slugs) vs the local one inside `locationResolver.js` (used only for free-text search matching against the full hierarchical `slug` field). Mixing them silently breaks matching. `urlSegmentClassifier.js` and the new resolver functions import `slugify` from `server/slugify.js` aliased as `publicSlugify` specifically to make this obvious at the call site.
4. **`ssrMiddleware.js` has now been rewritten for Phase 6 and Phase 7.** Do not look for the old `TODO(Phase 6...)` placeholders; they were removed when SSR route classification, district-aware cache keys, analytics continuity, and breadcrumb rendering were completed. The remaining server-side public URL work is sitemap/redirect focused.
5. **Testing pattern**: never start the dev server or run `npm start`/`npm run build` without asking first (explicit standing user preference from before this session). Instead, write a throwaway `.mjs` script **inside `server/`** (not the OS temp dir — Node ESM resolves `node_modules` relative to the script's own location, not cwd, so a script outside `server/` can't `import` any package), connect to Mongo directly, invoke the controller/helper function with a hand-built fake `req`/`res`, inspect the result, disconnect, then delete the script before committing. Every phase in this session was verified this way against real `massClick_dev` data, not just syntax-checked. `git status --short` should be clean (no stray debug files) before every commit — check it.
6. **Commit at phase boundaries, not mid-phase**, and only once the phase's own changes are individually syntax-checked (`node --check`) AND behaviorally verified against real data. Every commit message in this migration explains *why*, not just *what* — matches this repo's existing commit style, keep doing that.
7. **Dev DB connection** (already used throughout, see `C:\Users\USER\.claude\projects\D--dev-abishek\memory\dev_database_connection.md` if that memory file is available in the new session): `mongodb://admin:Massclick123@127.0.0.1:27018/massClick_dev?authSource=admin`. Prod is a different host — never touch it without asking first, and nobody has run any of this session's verification queries against prod yet (see Phase 0's open item above).
8. **Two "investigated, turned out to be correct, not a bug" dead ends from this session**, so nobody re-investigates them: (a) `findBusinessesByCategory` returning 0 for `srirangam`+`hotels`+`trichy` while `mainSearchController` returns 12 for the same params — not a bug, `mainSearchController` has an extra `MIN_RESULTS` district-wide widening fallback that `findBusinessesByCategory` was never asked to have; both agree there are genuinely 0 hotels linked to the Srirangam zone specifically. (b) `categoryModel.exists(...).lean()` — `.lean()` is a harmless no-op on `.exists()` in Mongoose 8, confirmed by direct testing, not worth removing but not a bug either.

---

## Prompt to paste into a new session to continue

```
Continue the district-prefixed URL restructure for the Massclick repo at
D:\dev_abishek\massclick (branch `dev`). Read
D:\dev_abishek\massclick\DISTRICT_URL_MIGRATION_HANDOFF.md in full first —
it has everything: what's done (Phases 0-7 complete, all committed and
tested), full detail on Phases 8-11, and conventions you must follow to
stay consistent with what's already committed (git log shows the commits).
Verify against the dev MongoDB directly (connection string is in the
handoff doc) using the same non-HTTP testing pattern used throughout —
don't start the dev server without asking first. Start with Phase 8 and
continue through Phase 11 in order, committing at each phase boundary the
same way the existing commits do (check `git log --oneline -10` for the
style). Phase 8 is sitemap-only; read `server/routes/sitemapRoutes.js` fresh
before editing because it was recently restructured by the pre-existing
`0c6490ba` sitemap matrix commit.
```
