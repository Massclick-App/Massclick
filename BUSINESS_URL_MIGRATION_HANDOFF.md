# Business + Location URL Restructure — Handoff

Continuation of the work in `DISTRICT_URL_MIGRATION_HANDOFF.md` (that doc's Phases 0–11 are the *district* restructure and are complete). This doc covers what came after: the **business detail URL** rework (done, deployed) and the **location × category URL** restructure (planned and data-verified, **not started**).

**Repo:** `D:\dev_abishek\massclick` — server (Express/Mongoose) at `server/`, client (React SPA) at `client/ui-app/`. Mobile is a sibling repo at `D:\dev_abishek\massclick-mobile-app`.

**Branch:** `dev`, pushed. Working tree clean as of this doc.

---

## Commits

```
cf97a8f3 fix(admin): drop the dead "URL Slug" field, surface publicId instead   [DONE]
6aa5cc87 feat(seo): collapse business URLs to /business/:district/:name-:publicId [DONE, Phase B]
41611823 fix(seo): put the business name in business URLs, not a category slug   [DONE, Phase A]
```

Later commits by others on the same branch (`a00a2fe9` premium certificate design, `8e8326d6` businessUrl.js touch) are unrelated to this work except that the certificate template version was bumped 13→14 deliberately, because certificates embed the business URL and needed regenerating.

---

## DONE — business detail URLs

```
before:  /business/trichy/k-k-nagar/hotels/6a5df8df3a4d92d60ae6efb6
after:   /business/trichy/hexahub-homestay-and-hospitality-services-ug709i
```

### Phase A — the name in the URL (`41611823`)

**Root cause found:** `businesslists.slug` is not a business slug. It holds category or SEO title text. Verified against `massClick_dev`: of 9,525 populated values, **0** matched their `businessName`, 2,978 were exactly the `category` string, the rest were phrases like `"Best CCTV Camera Installation and Dealers Near Me"`. Seven emitters read it first, so the business name appeared in **no** business URL, and 119 Trichy hotels differed only by ObjectId.

Emitters also disagreed with each other — links and the canonical tag used `slug`, SSR used `businessName`, and JSON-LD read a `businessSlug` field that exists on **0** documents. One page declared three different URLs and its `LocalBusiness` `@id` never matched its own canonical.

Fix: `server/helper/businessList/businessUrl.js` is the single server authority (`getBusinessUrlSlug`, built from `businessName`, 80-char word-boundary cap). All emitters route through it. `businesslists.slug` is left untouched in the DB.

### Phase B — collapse to `/business/:district/:name-:publicId` (`6aa5cc87`)

Dropped the locality segment (it churned on re-geocode and was computed from four different sources depending on emitter) and replaced the ObjectId with `publicId`.

**`publicId` design — do not change these without reading the reasoning:**
- 6 chars from `a-z0-9`, **always ≥1 letter AND ≥1 digit** (`PUBLIC_ID_RE`). The mixed rule is what lets the parser tell an id from an ordinary trailing word — segments split on the LAST hyphen, so `corner-street-market` must not read as carrying one. Verified across all businesses that no name slug ends in a matching token.
- Usable space **1,866,866,560** (36⁶ minus all-letter and all-digit sets). Rejection-sample pass rate **85.8%**, averaging 1.17 draws.
- **Not** sliced from the ObjectId — 6 hex chars over ~10k businesses is ~0.3% collision chance, and the full ObjectId leaks a creation timestamp.
- Uniqueness guarantee is the **unique PARTIAL index**, not `sparse`. `publicId` defaults to `null`, and sparse only skips *missing* fields — with sparse, the second business written without a generated id fails on duplicate `null`.
- Never changes: `pre("validate")` hook has an `if (this.publicId) return next()` guard, and `updateBusinessList` excludes `publicId` from its assignment loop.
- Never recycled: deletes are soft (`isActive: false`), so ids stay claimed.

**Redirects:** `legacyUrlRedirectMiddleware` canonicalises the WHOLE business path (possible now that the location segment is gone; in Phase A only the slug segment could be canonicalised, because the location segment legitimately differed between emitters and validating it would have 301'd the app's own links). Every superseded shape redirects to the same target — bare `/business/:id`, the 3-segment legacy shape, and Phase A's 5-segment shape. Loop-freedom is structural: the target is `buildBusinessPath`'s output, a pure function of the document.

**Deploy-window safety:** a business with no `publicId` makes `getBusinessUrlSegment` return `null`; every emitter falls back to the superseded shape and the old client routes are kept live so redirects never dead-end.

**QR tolerance:** `isAcceptedBusinessDetailsUrl` accepts the current shape plus every superseded one, each built with either the current or the pre-Phase-A slug. **That list only grows.** Dropping an entry makes `ensureBusinessDetailsQrCode` treat every QR carrying that shape as stale and re-render + re-upload to S3 and re-save the doc — ~9.7k of them on next fetch — while invalidating printed codes that were resolving fine.

**Known tolerated inconsistency:** QR, certificate and email URLs are built in synchronous template code with no district document on hand, so they emit `tiruchirappalli` where alias-aware emitters emit `trichy`. Those 301 to canonical on first request. Deliberate — plumbing a DB lookup into email/certificate rendering wasn't worth it.

### Admin cleanup (`cf97a8f3`)

The business form had a required, full-width field labelled **"URL Slug"** writing to `businesslists.slug` — which affects no URL. It was also auto-populated from the selected *category's* slug, which is how 2,978 businesses got a slug that is just their category name. Removed the input and its validation rule; the stored value still round-trips through `handleEdit` untouched (wiping it would break QR tolerance above). Remaining displays relabelled "SEO Slug (legacy)".

Added: `publicId` shown read-only in the detail drawer with the full live URL and a "View live page" button, plus a "Public ID" export column.

### DB state — BOTH environments migrated

| | dev (`massClick_dev`) | prod (`massClick`) |
|---|---|---|
| businesses | 9,601 | 9,753 |
| with `publicId` | 9,601 | 9,753 |
| distinct | 9,601 | 9,753 |
| index `publicId_1` | unique + partial | unique + partial |

Backfill script: `server/scripts/backfillBusinessPublicId.js` (gitignored with the rest of `server/scripts/`). Dry-run by default, `--commit` to write, idempotent, refuses to write if existing ids aren't all valid and unique. Requires `--uri=` or `MONGO_URI` so it can never default at prod.

**Prod snapshot taken before the backfill:**
```
db-backups/snapshots/massClick/2026-08-03_10-07-39__pre-publicid-backfill   (9,753 docs, 51.4 MB)
node db-backups/restore.js --from "db-backups/snapshots/massClick/2026-08-03_10-07-39__pre-publicid-backfill"
```
Note `db-backups/` is a **sibling of the repo** (`D:\dev_abishek\db-backups`), not inside it.

**Deployed and confirmed working** by the user on dev-api. Prod DB is migrated; confirm prod server code is deployed.

---

## NOT STARTED — location × category URL restructure

Requested shape:

```
now:    /trichy/kamarajar-nagar-mgr-nagar-musiri/hotels
want:   /trichy/musiri/mgr-nagar/hotels-in-kamarajar-nagar
          district  zone   ward     category -in- locality
```

**Nothing has been implemented.** Only files were read. The design below is settled and the feasibility data is verified — reproduce it if you don't trust it, but it was all run against `massClick_dev`.

### The scheme

One rule: **path = district + every ancestor above the target node; last segment = `{category}-in-{target}`.**

```
/trichy                                              district
/trichy/hotels                                       district + category
/trichy/musiri                                       zone
/trichy/hotels-in-musiri                             zone + category
/trichy/musiri/mgr-nagar                             ward
/trichy/musiri/hotels-in-mgr-nagar                   ward + category
/trichy/musiri/mgr-nagar/kamarajar-nagar             locality
/trichy/musiri/mgr-nagar/hotels-in-kamarajar-nagar   locality + category
```

Subcategories need **no extra segment** — a subcategory slug is itself a category slug, so `/trichy/musiri/mgr-nagar/luxury-hotels-in-kamarajar-nagar` parses identically and the parent comes from `subCategoryMapping`. This matters because the 4-segment budget is already spent.

Every shape was traced for ambiguity. The `-in-` token is the discriminator: at 2 and 3 segments, "place page or category page?" is decided by whether the last segment contains `-in-`, falling back to the existing category lookup in `classifyMiddleSegment`. No shape collides with another.

### Verified against dev data (the expensive part — don't re-derive blindly, but do re-check if data changed)

| Check | Result |
|---|---|
| Hierarchy completeness | **Complete.** 0 localities without a ward, 0 without a zone, 0 wards without a zone. No partial chains to special-case. |
| `-in-` separator safety | **Safe.** 0 of 544 active categories and 0 of 8,205 active location names contain `-in-` as a standalone token. |
| **Localities unique within their ward** | **0 collisions of 6,785** ← the whole justification |
| Wards unique within their zone | 2 collisions, both Salem |
| Zones unique within their district | 5 collisions, all Salem |
| Level distribution | 6,785 locality / 943 ward / 439 zone / 38 district |

The zero-collision result is why this change is worth making: `publicLocationSlug` only carries an ancestor chain (`kamarajar-nagar-mgr-nagar-musiri`) because the FLAT scheme had 371 colliding nodes and Phase 1 had to qualify until unique. Once ancestors are real path segments, **qualification becomes unnecessary everywhere**.

The 7 Salem collisions are **duplicate documents**, not scheme failures — two identical "Edappadi" zone docs, two identical "Edappadi Rural" ward docs, same null pincode, distinguished only by the `-2` suffix Phase 1 invented. The old handoff flagged these as pre-existing bad data.

**Decision taken (safe side, revisit if you disagree):** keep a numeric suffix on those 7 nodes rather than merging the duplicates. Merging mutates data and is harder to undo. Consequence: `/salem/edappadi-2/...` stays live. Merging is the better long-term fix and is still on the table.

### Build order

1. **Slug authority** — `server/helper/location/locationSlug.js` gains per-level segment builders. `computePublicLocationSlugs`' ancestor-qualification becomes dead for URL purposes; keep the field for back-compat and redirects.
2. **Parser + builder** — new `server/helper/location/locationUrl.js` as the single authority: `-in-` split, longest-match against the known category list, plus the mirrored client copy. Same duplicated-by-convention pattern as `businessUrl.js` ↔ `searchResultNavigation.js` — they MUST produce byte-identical output or the canonical redirect will 301 the app's own links.
3. **Resolver + classifier** — `resolveRouteLocation` walks segments *down* the hierarchy instead of matching one flat `publicLocationSlug`; `classifyMiddleSegment` extends to the new shapes.
4. **Emitters** — `sitemapRoutes.js`, `ssrMiddleware.js`, `breadcrumbBuilder.js` + `client/ui-app/src/utils/breadcrumbs.js`, `searchResultNavigation.js`'s `buildCategoryPath`.
5. **Redirects** — old `/:district/:qualifiedSlug/:category` → new. Must be loop-free by construction, same as Phase B.
6. **Client routing** — `App.js`, `DistrictRouteResolver`, `categoryRouter.js`.
7. **Verify** — every shape at every level against real data; client/server parity across the mirrored pair.

Phases 2 and 7 are the same pattern as Phase A/B, so the risk profile is familiar.

---

## MOBILE — deep links are BROKEN right now

`D:\dev_abishek\massclick-mobile-app`, branch `main`, last commit `3743745 local datas`. **Has uncommitted changes** to `lib/app/router/app_router.dart`, `app_routes.dart`, `app_constants.dart` — someone is mid-edit there; check with them before touching.

`lib/app/router/app_routes.dart` currently declares only:
```dart
'/business/:location/:businessSlug/:id'            // line 20
'/business/:district/:location/:businessSlug/:id'  // line 22
```

Both are **superseded shapes**. There is no route for `/business/:district/:name-:publicId`, so a current business link opened on a device with the app installed will not deep-link into it. Phase 9 of the district migration made mobile district-aware; Phase B moved the goalposts and mobile was not updated.

Needed on mobile:
1. Add the Phase B route and parse the trailing segment for the publicId (split on last hyphen; same `PUBLIC_ID_RE` rule).
2. Resolve by publicId — `viewBusinessList` already accepts either identifier, so the existing endpoint works unchanged.
3. Keep both superseded routes registered so old links and printed QR codes still open in-app.
4. Then the location URL restructure will need the same treatment again — **worth doing both in one pass** rather than shipping mobile twice.
5. Still outstanding from the original migration: `assetlinks.json`, AASA, Android `autoVerify`.

---

## Other open items

- **Sitemap thin-page gate — not done, highest-impact SEO item on the table.** Only **626 of 8,205** location nodes have a single live business, but `sitemapRoutes.js` emits location × category URLs for every active location regardless (its own comment says so). That is **4,463,520 URLs advertised**, of which at most 340,544 could ever have content. This is the scaled-thin-content pattern the 2024 core update targeted. Deliberately left out of the URL restructure as a separate concern, but if the restructure ships first it will carry 4.4M thin URLs into the new scheme intact. Strongly consider gating first.
- **`E11000` retry on publicId generation — offered, not done.** `generateUniquePublicId` checks-then-inserts, which is not atomic. Two concurrent creates could draw the same id; the unique index rejects the second and business creation **fails loudly** (no corruption, no shared URLs). Odds ~1 in 1.87 billion per colliding pair. A code comment says callers "should be prepared for E11000 and retry" and no such retry exists. ~5 lines to close.
- **Salem duplicate merge** — see above.
- **Phase 10 tie-break deviation** from the original district migration is still open; see `DISTRICT_URL_MIGRATION_HANDOFF.md`.

---

## Conventions (carried over, still apply)

1. **Never start the dev server or run `npm start` / `npm run build` without asking** — standing user preference. Verify with a throwaway `.mjs` script **inside `server/`** (Node ESM resolves `node_modules` relative to the script, so a script outside `server/` can't import anything), connect to Mongo directly, invoke the helper, inspect, delete before committing. `git status --short` clean before every commit.
2. **Back up before any data-modifying operation:** `node db-backups/backup.js --prod --db <name> --collections <a,b> --label <slug> --reason "<why>"`. `--prod` is required to target `massClick`.
3. **Dev DB changes must be mirrored to prod** — always remind the user at the end of a session, listing what changed. Never apply to prod without explicit approval.
4. **Connections:** dev `mongodb://admin:Massclick123@127.0.0.1:27018/massClick_dev?authSource=admin`; prod is the **same tunnel**, only the db name changes (`massClick`). The direct `103.14.121.77:27017` URL does not work. The tunnel drops periodically — `ECONNREFUSED 127.0.0.1:27018` means ask the user to reconnect.
5. **Two slugify implementations exist server-side and are NOT interchangeable:** `server/slugify.js` (canonical, all URL-facing slugs) vs the local one inside `locationResolver.js` (free-text search matching only). `"K.K. Nagar"` → `k-k-nagar` under the first, `kk-nagar` under the second.
6. Commit at phase boundaries; commit messages explain **why**, not just what.

---

## Prompt for a fresh session

```
Continue the MassClick URL work. Read BUSINESS_URL_MIGRATION_HANDOFF.md in
full first, then DISTRICT_URL_MIGRATION_HANDOFF.md for the earlier district
restructure it builds on.

Business detail URLs (Phase A + B) are DONE, committed on `dev`, deployed,
and both dev and prod DBs are backfilled with publicId. Do not redo that.

Two things remain, in whichever order the user wants:

1. The location x category URL restructure to
   /trichy/musiri/mgr-nagar/hotels-in-kamarajar-nagar — designed and
   data-verified in the handoff, NOT started. Build order is in the doc.

2. Mobile (D:\dev_abishek\massclick-mobile-app, branch main). Business deep
   links are currently BROKEN — app_routes.dart only knows the two
   superseded shapes and has no route for /business/:district/:name-:publicId.
   That repo has UNCOMMITTED changes to its router files; check with the user
   before touching. Consider doing mobile once, after the location
   restructure, rather than shipping it twice.

Also flagged but not started: the sitemap thin-page gate (4.4M advertised
URLs vs 626 populated locations) — read that section before starting the
location restructure, since ordering matters.

Do not push, merge, deploy, or touch prod without explicit approval. Do not
start the dev server or run npm build/start without asking. Use the
throwaway-.mjs-inside-server/ testing pattern described in the handoff.
```
