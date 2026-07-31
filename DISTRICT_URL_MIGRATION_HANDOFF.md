# District-Prefixed URL Restructure — Handoff

Phases 0-11 are complete and committed. The planned district-prefixed URL migration code is done across the web repo and the mobile defensive-scope repo. Remaining items are deployment/prod/ops verification only, listed below. This doc is self-contained — written so a fresh AI session (any tool) or a human engineer can resume without access to prior conversation history.

**Repo:** `D:\dev_abishek\massclick` — server (Express/Mongoose) at `server/`, client (React SPA) at `client/ui-app/`. Mobile app is a sibling repo at `D:\dev_abishek\massclick-mobile-app`.

**Branch:** `dev` for `D:\dev_abishek\massclick`; mobile work was committed on `D:\dev_abishek\massclick-mobile-app` branch `main`. Nothing has been pushed to remote, merged to `main`/`prod`, or verified in prod from this session.

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
1888ce43 chore(location): remove stale district URL cleanup paths                         [Phase 11, DONE]
85baee41 feat(location): redirect legacy public URLs                                     [Phase 10, DONE]
4aaf57a6 feat(location): emit district-prefixed sitemap URLs                             [Phase 8, DONE]
3f420405 docs(location): update district URL handoff through phase 7
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

Mobile sibling repo commit:

```
70c7203 feat(location): make mobile routes district-aware                                [Phase 9, DONE]
```

`0c6490ba` was **not written by this migration** — it was uncommitted work already sitting in the working tree when this session started (a sitemap cross-join restructure + admin cache endpoint). It got committed early in the session because it was blocking a clean `git status`, and in the process 16 double-encoded em-dashes were found and fixed in `sitemapRoutes.js` (2 of them were inside the `/llms.txt` output actually served to crawlers). Mentioned here only so nobody mistakes it for migration work when reading `git log`.

---

## What's done (Phases 0–11 complete)

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

### Phase 8 — Sitemap district prefixes (DONE)

Commit: `4aaf57a6 feat(location): emit district-prefixed sitemap URLs`

- `server/routes/sitemapRoutes.js` now emits district-prefixed URLs for location sitemap entries, business sitemap entries, HTML sitemap links, and LLM crawler output.
- Verified with `node --check`, `git diff --check`, and a temporary DB-backed `server/verifyPhase8Sitemaps.mjs` script, then deleted before commit.

### Phase 9 — Mobile app defensive scope (DONE)

Sibling repo commit: `70c7203 feat(location): make mobile routes district-aware`

- Added district-aware route handling for category and business deep-link shapes, including `/business/:district/:location/:businessSlug/:id`.
- Mobile search now serializes `district` for business search calls, normalizes analytics page paths, persists district/public slugs for verified locations and recents, and updates the marketing profile fallback URL.
- Added focused tests in `test/business_search_repository_test.dart` and `test/district_url_migration_test.dart`; both passed with `flutter test test/business_search_repository_test.dart test/district_url_migration_test.dart`.
- Explicitly still deferred: `assetlinks.json`, AASA, and Android `autoVerify` ops work.

### Phase 10 — 301 redirects (DONE)

Commit: `85baee41 feat(location): redirect legacy public URLs`

- Added `server/middleware/legacyUrlRedirectMiddleware.js`, mounted after public API routes and before static/SSR handling.
- The middleware first proves a request is already district-prefixed/new-style and only then reinterprets non-new-style paths as legacy. This avoids redirecting valid district URLs.
- Legacy category paths redirect to `/:district/:location/:category[/subcategory]`; district-wide docs redirect to `/:district/:category[/subcategory]`.
- Legacy business paths redirect to `/business/:district/:location/:businessSlug/:id`.
- QR/certificate business-profile URL generation now mints the new shape for new QRs while accepting both legacy and new URL text as current for existing QR images.
- Verified with `node --check`, `git diff --check`, and a temporary DB-backed `server/verifyPhase10LegacyRedirects.mjs` script, then deleted before commit.

### Phase 11 — Cleanup (DONE)

Commit: `1888ce43 chore(location): remove stale district URL cleanup paths`

- Deleted the unreferenced `CategoryDynamicPage` code path at `client/ui-app/src/Internals/clientComponent/cards/popularCategories/popularCategoryDrawer.js`.
- Confirmed no computed district-aware URL array remains in the popular-categories components.
- Added a TODO to dormant `server/generateStaticPages.js` warning that it still writes legacy `/:location/:category` folders if someone revives it.
- Verified with `node --check server/generateStaticPages.js`, `git diff --check`, and `rg` checks for removed/stale symbols.

## Remaining work

No planned migration code remains from Phases 0-11. Remaining items are operational:

- Run the Phase 1 `server/scripts/backfillPublicLocationSlug.js` equivalent against prod before deploying routes that depend on `publicLocationSlug`/`urlAlias`.
- Verify staging before prod, especially legacy 301 behavior and new-style non-redirect behavior. Do not deploy the redirect middleware straight to prod untested.
- Run the Phase 0 prod investigation query if desired: `db.users.countDocuments({"leadsData.location":"global"})`.
- Complete mobile deep-link ops later: `assetlinks.json`, AASA, and Android `autoVerify`.
- Push/merge/deploy both repos when ready.

---

## Conventions established this session — follow these in future follow-up

1. **`district` is always a URL slug, always optional, always resolved internally.** Every function that accepts it does `resolveDistrictBySlug(district)` (or composes via `resolveRouteLocation`) rather than expecting the caller to have pre-resolved it. Never accept a raw district *name* ("Tiruchirappalli") where a slug ("trichy") is expected, or vice versa — this exact confusion existed in the pre-migration `findBusinessesByCategory(category, district)` signature (where `district` was actually neither, just free text) and caused real design friction when fixing it.
2. **`server/helper/location/locationSlug.js` is the single authority** for anything slug- or display-name-related on a masterlocation doc: `getPublicLocationSlug`, `computePublicLocationSlugs`, `getDistrictUrlSlug`, `getDistrictDisplayName`. Don't reimplement any of these a third time — grep for the function name first.
3. **Two slugify implementations exist server-side and are NOT interchangeable**: `server/slugify.js` (canonical, used for all URL-facing slugs) vs the local one inside `locationResolver.js` (used only for free-text search matching against the full hierarchical `slug` field). Mixing them silently breaks matching. `urlSegmentClassifier.js` and the new resolver functions import `slugify` from `server/slugify.js` aliased as `publicSlugify` specifically to make this obvious at the call site.
4. **`ssrMiddleware.js` has now been rewritten for Phase 6 and Phase 7.** Do not look for the old `TODO(Phase 6...)` placeholders; they were removed when SSR route classification, district-aware cache keys, analytics continuity, and breadcrumb rendering were completed. The remaining work is deployment/prod verification and ops follow-up, not planned migration code.
5. **Testing pattern**: never start the dev server or run `npm start`/`npm run build` without asking first (explicit standing user preference from before this session). Instead, write a throwaway `.mjs` script **inside `server/`** (not the OS temp dir — Node ESM resolves `node_modules` relative to the script's own location, not cwd, so a script outside `server/` can't `import` any package), connect to Mongo directly, invoke the controller/helper function with a hand-built fake `req`/`res`, inspect the result, disconnect, then delete the script before committing. Every phase in this session was verified this way against real `massClick_dev` data, not just syntax-checked. `git status --short` should be clean (no stray debug files) before every commit — check it.
6. **Commit at phase boundaries, not mid-phase**, and only once the phase's own changes are individually syntax-checked (`node --check`) AND behaviorally verified against real data. Every commit message in this migration explains *why*, not just *what* — matches this repo's existing commit style, keep doing that.
7. **Dev DB connection** (already used throughout, see `C:\Users\USER\.claude\projects\D--dev-abishek\memory\dev_database_connection.md` if that memory file is available in the new session): `mongodb://admin:Massclick123@127.0.0.1:27018/massClick_dev?authSource=admin`. Prod is a different host — never touch it without asking first, and nobody has run any of this session's verification queries against prod yet (see Phase 0's open item above).
8. **Two "investigated, turned out to be correct, not a bug" dead ends from this session**, so nobody re-investigates them: (a) `findBusinessesByCategory` returning 0 for `srirangam`+`hotels`+`trichy` while `mainSearchController` returns 12 for the same params — not a bug, `mainSearchController` has an extra `MIN_RESULTS` district-wide widening fallback that `findBusinessesByCategory` was never asked to have; both agree there are genuinely 0 hotels linked to the Srirangam zone specifically. (b) `categoryModel.exists(...).lean()` — `.lean()` is a harmless no-op on `.exists()` in Mongoose 8, confirmed by direct testing, not worth removing but not a bug either.

---

## Prompt to paste into a new session for follow-up

```
Continue follow-up for the completed district-prefixed URL restructure.
Read D:\dev_abishek\massclick\DISTRICT_URL_MIGRATION_HANDOFF.md in full
first. Phases 0-11 are complete and committed in the web repo; Phase 9 is
committed in D:\dev_abishek\massclick-mobile-app. No planned migration code
remains. Focus only on the remaining operational items: prod slug backfill,
staging/prod verification, mobile deep-link ops (assetlinks/AASA/autoVerify),
and push/merge/deploy. Do not run prod commands or deploy without explicit
approval.
```
