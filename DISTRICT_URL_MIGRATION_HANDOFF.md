# District-Prefixed URL Restructure — Handoff

Stopped mid-Phase-3 to conserve session budget. Everything committed so far is tested and working. This doc is self-contained — written so a fresh AI session (any tool) or a human engineer can resume without access to prior conversation history.

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
8aa3ed69 feat(location): thread optional district param through search/business/SEO APIs   [Phase 3, PARTIAL]
66a48fa4 feat(location): add district-URL resolver, segment classifier, and crumb builder   [Phase 2, DONE]
9acc5884 feat(location): add district-aware public URL slugs for masterlocations            [Phase 1, DONE]
a499a5cc fix(leads): fail closed when a search location cannot be resolved                  [Phase 0, DONE]
0c6490ba feat(sitemap): emit full location x category matrix + admin cache reset            [pre-existing, unrelated — see note below]
```

`0c6490ba` was **not written by this migration** — it was uncommitted work already sitting in the working tree when this session started (a sitemap cross-join restructure + admin cache endpoint). It got committed early in the session because it was blocking a clean `git status`, and in the process 16 double-encoded em-dashes were found and fixed in `sitemapRoutes.js` (2 of them were inside the `/llms.txt` output actually served to crawlers). Mentioned here only so nobody mistakes it for migration work when reading `git log`.

---

## What's done (Phases 0–2 complete, Phase 3 ~90%)

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
- `server/helper/seo/breadcrumbBuilder.js` + `client/ui-app/src/utils/breadcrumbs.js` (new, parallel files) — `buildCrumbs(...)` → `[{name, path}]` (site-relative paths, origin applied once at the JSON-LD boundary — this is what prevents the pre-existing www/non-www split in `SearchResult.js`'s old breadcrumb code), `crumbsToJsonLd`, `crumbsToUiItems`. **Not wired into any page yet — that's Phase 7.** Server version takes raw Mongoose docs; client version takes flat already-resolved strings (client has no DB access) — this divergence is deliberate and documented in both files' headers; what MUST stay identical between them is the crumb *sequencing logic*, not the function signature.
- Converged the two pre-existing `BreadcrumbList` generators (`server/utils/htmlUtils.js`'s `buildBreadcrumbSchema` now takes `{name,url}` matching the client's `generateBreadcrumbSchema`, was `{name,item}`). Its one caller in `ssrMiddleware.js` updated — **mechanical rename only**, the segment-parsing logic feeding it stays positional, deliberately deferred to Phase 6 (see below).

### Phase 3 — Backend district param support (~90% done)

Every endpoint below: `district` is always an optional URL slug (e.g. `"trichy"`), resolved internally, absent = pre-migration behavior byte-for-byte unchanged. **This convention must be preserved for anything added later — don't accept a raw district name anywhere.**

Done:
- `mainSearchController` (`server/controller/businessList/businessListController.js:~785`) — the actual collision fix. Verified directly: `location=anna-nagar` under `district=trichy` → 2,455 results (all Tiruchirappalli); under `district=dindigul` → 71 results (all Dindigul). Same text, disjoint sets.
- `findBusinessesByCategory` (`server/helper/businessList/businessListHelper.js`) — signature changed from `(category, district)` (where `district` was actually free text, never a real district) to `(category, {locationText} | {districtSlug, locationSlug})`. Both call sites updated (`ssrMiddleware.js:176`, `businessListController.js`'s `viewBusinessByCategory`) — mechanical only, zero behavior change for existing callers.
- `findBusinessBySlug` / `getBusinessBySlugAction` — optional `district`, filtered against `masterLocation.district`.
- `getSeoMeta` (`server/helper/seo/seoHelper.js`) — `district` now part of the cache key (`seo-meta:...`). Without this, two districts sharing a location/category text would share a 24h-cached canonical — verified directly that `anna-nagar`+`trichy` and `anna-nagar`+`dindigul` now cache separately. `buildDynamicSeoMeta` (the fallback used for most long-tail pages) and `seoTemplateHelper.js`'s `renderSeoMetaFromTemplate` both prepend the district slug to the canonical when supplied.
- `getV2ParentOfSubCategoryAction` (`server/controller/categoryDisplaySettings/categoryDisplaySettingsController.js`) — now also returns `parentName` alongside `parentSlug`, needed for Phase 7's subcategory breadcrumb (title-casing a slug client-side breaks on `&`, "and", acronyms).

**NOT done — the one remaining Phase 3 item:**

A new `GET /v2/location/resolve` endpoint that wraps the classifier for the frontend's `DistrictRouteResolver` (Phase 4) to call when it hits the ambiguous `/:district/:p2/:p3` shape. Was mid-design when this session stopped. Sketch:

```js
// server/controller/location/masterLocationController.js — add:
import { resolveDistrictBySlug } from "../../helper/location/locationResolver.js";
import { classifyMiddleSegment } from "../../helper/location/urlSegmentClassifier.js";
import { getDistrictUrlSlug, getDistrictDisplayName } from "../../helper/location/locationSlug.js";
import { ownNameOf } from "../../helper/location/locationResolver.js";

export const resolveRouteLocationAction = async (req, res) => {
  try {
    const { district, p2, p3 } = req.query;
    if (!district) return res.status(400).json({ message: "district is required" });

    const districtDoc = await resolveDistrictBySlug(district);
    if (!districtDoc) return res.status(404).json({ message: "District not found" });

    const districtSummary = {
      slug: getDistrictUrlSlug(districtDoc),
      name: getDistrictDisplayName(districtDoc),
    };

    if (!p2) {
      return res.json({ district: districtSummary, classification: { type: "district" } });
    }

    const classification = await classifyMiddleSegment({ districtDoc, p2, p3 });

    if (classification.type === "location") {
      return res.json({
        district: districtSummary,
        classification: {
          type: "location",
          location: {
            slug: classification.locationDoc.publicLocationSlug,
            name: ownNameOf(classification.locationDoc),
            level: classification.locationDoc.level,
          },
          categorySlug: classification.categorySlug,
        },
      });
    }

    return res.json({ district: districtSummary, classification });
  } catch (error) {
    console.error("resolveRouteLocationAction error:", error);
    return res.status(500).json({ message: error.message });
  }
};
```

Register in `server/routes/masterLocationRoute.js` (public, no auth — matches the existing `/api/masterlocation/search` route right above it):
```js
router.get('/api/v2/location/resolve', resolveRouteLocationAction);
```
(Note the route file's existing routes are all under `/api/masterlocation/...` but the plan's convention for new v2 endpoints elsewhere in this codebase is `/api/v2/...` — matches `categoryDisplaySettingsRoutes.js`'s `/api/v2/category/...` pattern. Double check the client's `API_URL` base to confirm whether it should be `/api/v2/location/resolve` or `/v2/location/resolve` — grep `categoryRouter.js` for how it calls `/v2/category/home` and match that exactly.)

**Test before considering Phase 3 done** (pattern used throughout this session — direct function invocation against dev DB, never via HTTP/npm start, per stored user preference not to run servers without asking):
```bash
cd server
MONGO_URL="mongodb://admin:Massclick123@127.0.0.1:27018/massClick_dev?authSource=admin" node --input-type=module -e "
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolveRouteLocationAction } from './controller/location/masterLocationController.js';
dotenv.config();
await mongoose.connect(process.env.MONGO_URL);
const fakeRes = () => { const r={}; r.status=c=>{r.code=c;return r}; r.json=b=>{r.body=b;return r}; return r; };
let res = fakeRes(); await resolveRouteLocationAction({query:{district:'trichy', p2:'srirangam', p3:'hotels'}}, res);
console.log('location case:', JSON.stringify(res.body));
res = fakeRes(); await resolveRouteLocationAction({query:{district:'trichy', p2:'hotels', p3:'luxury-hotels'}}, res);
console.log('districtCategory case:', JSON.stringify(res.body));
await mongoose.disconnect();
"
```
Expect the first call to classify as `type:"location"` (Srirangam is a real zone in Trichy), the second as `type:"districtCategory"` (assuming "hotels" is a real top-level category slug — check with `db.categories.findOne({categoryType:"Primary Category"})` first if unsure which slug to use).

Lower priority per the original plan, don't block on these: `getEnhancedSuggestionsController`, `viewBusinessByCategory` — neither builds canonical public URLs.

---

## What's NOT started (Phases 4–11)

### Phase 4 — Frontend routing + the corrupting-rewrite fix (biggest single risk in the whole migration)

`client/ui-app/src/App.js` (currently ~line 294-304) needs:
```
/:district                                     → DistrictLandingPage (categories.js, district-wide)
/:district/:category                           → CategoryRouter
/:district/:p2/:p3                             → new DistrictRouteResolver (calls GET /v2/location/resolve,
                                                   then renders CategoryRouter or SearchResults with
                                                   explicit resolved props — never re-derives meaning
                                                   from raw useParams() position downstream)
/:district/:location/:category/:subcategory    → SearchResults (4-seg, unambiguous)
/business/:district/:location/:businessSlug/:id → BusinessDetails
```
Keep after all static/named routes (existing ordering already protects reserved words — Phase 1's backfill script verified no district slug collides with any of them).

**`client/ui-app/src/Internals/clientComponent/categories/categoryRouter.js`** — the ACTUAL route dispatcher, easy to miss since it's not `App.js` itself:
- `useParams()` destructuring needs `district`; effect dependency array too, or switching districts at the same category won't refetch.
- `performSearch(searchValue, location, ...)` calls pass `location` which is `undefined` under `/:district/:category` — must pass the resolved location or the district.
- **Highest silent-wrong-page risk in the migration:** the branch deciding whether to render the subcategory grid currently keys on raw `category && !subcategory` param presence. Under `/:district/:location/:category` the params shift by one position and this misfires. Must key on the classifier's output instead, never on raw param presence.

**`client/ui-app/src/Internals/clientComponent/SearchResult/SearchResult.js`** — has a category/subcategory-parent-mismatch guard that currently builds a **3-segment legacy URL** and navigates to it with `{replace: true}`. Must land in the SAME PR as the new routes, not as follow-up — shipping the routes without fixing this means the app actively rewrites correct district URLs back into legacy ones and replaces browser history so the user can't even go back. Rebuild the redirect target via the classifier/new URL builders instead.

**Verify** (hand-typed URLs only, nothing links to the new shapes yet): `/trichy`, `/trichy/hotels`, `/trichy/srirangam/hotels`, `/trichy/hotels/luxury-hotels`. Load-bearing check: same locality slug (e.g. `anna-nagar`) under two different districts must return **different business sets** in the browser, not just in a script. Confirm no `replace` navigation fires on a well-formed district URL (watch the address bar — the mismatch-guard bug rewrites it instantly if not fixed).

### Phase 5 — Shared URL builders + migrate every link site (GO LIVE — real links start pointing at new URLs)

Extend `client/ui-app/src/utils/searchResultNavigation.js` (existing central hub) with `buildCategoryPath(...)` / `buildBusinessPath(...)`. Root fix needed first: `getEffectiveSearchLocation()` and `locationReducer.js`'s `selectedDistrict` currently carry bare strings, need to carry `{name, slug}`.

Migrate every raw link-builder to the shared functions — this list is long, see the full plan file for the complete inventory (~15+ call sites across `trendingSearch.js`, `topTourist.js`, `cardDetails.js`, `categories.js`, `SearchResult.js` business links, `VisitingCardPage.js`, `FavouritePage.js`, `submitReviewPage.js`, `seoSchemaGenerators.js`, `blogDetails.js`). Two specific pre-existing bugs get fixed as a side effect: `submitReviewPage.js` builds business slugs with a different rule than everywhere else, and `cardDetails.js`'s share buttons currently propagate `window.location.href` (whatever URL the user happens to be on, possibly legacy) instead of the canonical URL.

### Phase 6 — SSR, canonical, cache, analytics continuity

**Must be a separate, sequential commit from Phase 7** — both rewrite `ssrMiddleware.js`. This is the phase that finally replaces the positional `firstSegment/secondSegment/thirdSegment` parsing with the classifier (two spots in that file were already touched this session with mechanical-only renames specifically to avoid touching this logic twice — see the `TODO(Phase 6...)` comments left in `ssrMiddleware.js`, search for them). Cache key becomes district-aware. Also: `seoHelper.js`'s dynamic-fallback canonical cache key needs the district (already done in Phase 3 — verify it's still correct after Phase 6's changes). Analytics path continuity: normalize legacy vs new URL shapes at the ingest point in `webAnalyticsHelper.js`, not at every sender.

### Phase 7 — Breadcrumbs (first-class)

Wire Phase 2's `buildCrumbs`/`crumbsToJsonLd`/`crumbsToUiItems` into `SearchResult.js`, `cardDetails.js`, `categories.js`, `blogDetails.js` (client) and `ssrMiddleware.js` (server, 3 emission points: JSON-LD, visible HTML, AI-crawler markdown). Close two coverage gaps (`categories.js` visible crumb, subcategory parent crumb using Phase 3's new `parentName`), explicitly defer business-detail SSR crumbs (business pages aren't SSR'd at all today — that's a separate initiative). Point the blog breadcrumb at `/blog` instead of its current location-guessing logic. Verify with Google's Rich Results Test — every crumb URL must return 200, never 301.

### Phase 8 — Sitemap district prefixes (mechanical, ships after Phase 5)

`server/routes/sitemapRoutes.js` — thread the district's public slug into the location sitemap and business sitemap URLs. This file already got restructured once this session (the pre-existing `0c6490ba` commit) for the location×category cross-join — that work is unrelated to this migration but touches the same file, so read it fresh before editing.

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
4. **`ssrMiddleware.js` has two deliberate "mechanical rename only, logic unchanged" edits already in it** (search for `TODO(Phase 6` comments) — don't be confused by them, they're intentional placeholders so Phase 6 only has to rewrite the segment-parsing logic once instead of the breadcrumb/business-lookup call sites getting touched twice across two separate commits.
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
it has everything: what's done (Phases 0-2 complete, Phase 3 ~90%), the
exact remaining Phase 3 item with a code sketch, full detail on Phases 4-11,
and conventions you must follow to stay consistent with what's already
committed (git log shows the commits). Verify against the dev MongoDB
directly (connection string is in the handoff doc) using the same
non-HTTP testing pattern used throughout — don't start the dev server
without asking first. Finish Phase 3 (the /v2/location/resolve endpoint),
commit it, then continue through Phase 4 onward in order, committing at
each phase boundary the same way the existing commits do (check `git log
--oneline -10` for the style). Phase 4 is the highest-risk phase in the
whole migration — read its section in the handoff doc carefully before
touching anything.
```
