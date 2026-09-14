# HANDOFF — One business, many categories (remove cross-category duplicate listings)

> **Status:** planned, not started. Written 2026-09-11; every code anchor, file path and the
> baseline script re-verified 2026-09-12 against `dev` @ `de7bc4364`.
> **Supersedes** `BUSINESS_MULTI_CATEGORY_PROPOSAL.md` and `BUSINESS_MULTI_CATEGORY_PLAN.md`
> (both contain stale paths and numbers from a scratch database — do not follow them).

---

## Copy-paste prompt

```
You are taking over a planned feature in the MassClick repo (D:\dev_abishek\massclick,
branch `dev`). Read BUSINESS_MULTI_CATEGORY_HANDOFF.md at the repo root in full before
doing anything. It is the spec: the problem, the decisions already made, every affected
code site, the phased plan with gates, and the rules you must follow.

Start with Phase 0 only. Do not start Phase 1 until you have reported Phase 0 results
and the user has said to continue. Never touch the production database (read OR write)
or deploy anything without the user's explicit approval in chat for that specific action.
Anchor every code change on the function/symbol names given in the spec — line numbers
in it are hints and have already drifted once while this spec was being written.
```

---

## 0. How to use this document

- Sections 1–4 explain the problem and the **decisions already made**. Do not relitigate them;
  if you believe one is wrong, say so and stop, don't silently deviate.
- Section 5 is the target design. Section 6 is every code site that changes (and the ones that look
  related but must NOT change). Section 7 is the phased plan with gates. Sections 8–9 are
  verification and rollback. Section 10 lists questions only the user can answer.
- **Line numbers are hints.** The repo is being committed to concurrently. Locate code by the
  function name / grep pattern given, then confirm by reading. Appendix B has the grep commands.
- Keep `BUSINESS_MULTI_CATEGORY_TRACKER.md` (you create it in Phase 0) updated after every phase.

---

## 1. Mission

A real business that operates in N categories is currently stored as N separate `businesslists`
documents, because `category` is a single string. Make one business = one document, carrying a
`categories[]` array, while every existing reader keeps working. Then give admins the tools to
**merge** the existing per-category copies into one listing without losing any category, review,
favourite, lead routing, URL or printed QR code — and stop new copies being created.

---

## 2. Ground rules (non-negotiable)

**Database**
- Dev DB: `massClick_dev`. Prod DB: `massClick`. Both are reached through the user's SSH tunnel on
  `127.0.0.1:27019`. The connection string template is `DEV_URI` in
  `D:\dev_abishek\db-backups\backup.js` (swap `{db}`). **Never paste credentials into any file.**
- `server/.env`'s `MONGO_URL` points at a *local* mongod on 27017 holding a ~950-document scratch
  DB. It is **not** dev. Every script must take its DB explicitly; never rely on `.env` for
  migrations or measurements.
- **Prod is off-limits** — no reads, no writes — until the user approves that specific action in
  chat. Dev changes that matter (schema, indexes, data migrations) are replayed to prod only
  after approval, as a separate step.
- **Snapshot before every write**, scoped to the collections being written:
  `cd D:\dev_abishek\db-backups && node backup.js --label <slug> --reason "<why>" --collections <a,b>`.
  Run the snapshot as its own command and read its result before writing. **Never** put a snapshot
  behind a pipe whose exit code gates the write (`backup.js ... | tail && apply` has already
  caused an unsnapshotted write in this repo). Better: make migration scripts snapshot themselves on
  `--apply` (see `ensureSnapshot()` in the coordinate scripts under `server/scripts/`).
- Every data script is **dry-run by default** and writes only with `--apply`. Dry runs print exactly
  what would change and write a report file.

**Code & process**
- Work on `dev`. Small commits, one area per commit, imperative subject lines in the repo's style
  ("Give business detail pages their own title and description"). End commit messages with the
  attribution line your harness requires. **Do not push** unless the user asks.
- **Never deploy.** No `ssh ... deploy.sh`, `backend.sh`, `frontend.sh`, no pushes to `prod`. The
  user deploys.
- Do not run `npm run build` / `npm start` unless the user asks for it in the current turn. Do not
  use browser automation to test; describe manual checks for the user to run.
- Do not pop `stash@{0}` ("wip-schema-before-clean-redo") — unrelated old work on the schema file.
- CSS: CSS Modules only; a component styles only its own classes; no parent→child selectors; no
  `!important` (rules in the root `CLAUDE.md` / `AGENTS.md`, enforced by
  `client/ui-app/.stylelintrc.json`; the `CSS_MODULES_GUIDELINES.md` they cite was deleted in the
  frontend restructure `aea129500`).
- **Every new endpoint in this project is admin-only**, via the policy registry — see §5.8. Do not
  guard new routes with bare `oauthAuthentication`: it also admits the public site's anonymous
  `publicClient` token.
- Keep existing security fixes intact: category values arriving from URLs are passed through
  `escapeRegex` (added by the crawl-trap fix, commit `a2189d79b`). When you widen a query, keep the
  escaping.
- Coordination: append a dated entry to the `Handoff Log` in `AGENT_COORDINATION.md` when you start
  and at the end of each phase (format: `### YYYY-MM-DD - <agent>`; append, never rewrite).

---

## 3. The problem, with evidence

### 3.1 Root cause

`server/schema/businessList/businessListSchema.js`:
```js
category: { type: String, default: '', required: true },
subcategory: { type: String, default: '' },   // dead: 1 of 12,136 dev docs has a value
```
and, on dev, a **unique** index `businessName_1_category_1_location_1` that is **not declared anywhere
in code** (created by hand). Together they encode "one row per category": the same shop in the same
category is rejected, the same shop in a different category is accepted as a new document. The
index is case-sensitive on raw strings, which is how "Relax Holidays" and "Relax holidays" both got in.

The duplicate helper already says so — `server/helper/businessList/businessDuplicateHelper.js`,
header comment: *"The directory stores one document PER CATEGORY for a single real business."*

### 3.2 Everything forks per copy

Each copy has its own: `publicId` → public URL → sitemap entry; reviews (`businessreviews.businessId`)
and `averageRating`; `favorites`; `analytics.*`; `qrCode` / `businessProfileQrCode`; `certificates`;
`paymentConcept` / `payment[]`. The same shop shows up several times in one result list, has
several thin near-duplicate pages, and its reviews and traffic are split.

### 3.3 Measured on `massClick_dev`, 2026-09-11 (read-only)

| Metric | Value |
|---|---|
| Businesses total / active / live | 12,136 / 12,113 / 12,100 |
| Identity groups (same normalized name + same 10-digit phone) | **969 groups, 1,388 redundant rows (~11.5%)** |
| …where every row is in a different category (the multi-category pattern) | **898 of 969 (93%)** |
| …where some category repeats (true duplicates) | 71 |
| Group sizes | 2×724, 3×165, 4×36, 5×20, 6×10, 7×8, 8×3, 10×3 |
| Largest | Sisco Jobs ×10, Relax Holidays ×10, Gia Holidays ×10, G M H & Associates ×8, Shanmuga Hospital ×8 |
| Groups containing a paid row / >1 paid row | 0 / 0 (**unknown on prod**) |
| Groups whose rows disagree on a `filters` value for the same key | **258** |
| Groups whose rows have different `mniDetails[0].categoryGroup` | 0 |
| Groups spanning several client records (`MC…` token compared) | **610** — normal for this backlog, see §5.5 |
| Rows whose `clientId` has a `" — <name>"` label baked in | 8,951 of 12,113 (74%) — compare tokens only |
| Groups containing an admin-verified row | 1 |
| Reviews / favourites sitting on duplicate rows | 7 reviews on 6 rows / 3 favourites on 3 rows |
| Rows whose `keywords` already name another category | 1,978 |
| Businesses with non-empty `filters` / an MNI group | 8,299 / 4,412 |
| Category docs / distinct category strings on businesses | 551 / 554 |
| Business rows whose category exactly matches a category doc | 12,082 |
| …fixable by trim/case only | 25 |
| …matching no category doc | **6** (`Website Development` ×3, `Event Management`, `second hand furnitur`, `Home Cleaning Services`) |
| `duplicateReview.status` | 736 `pending`, 11,400 unset, **0 merged** |
| Paid businesses (same definition as `PAID_BUSINESS_FILTER`) | 28 |

The existing duplicate console's own scan on dev (`scanDuplicates({ includeResolved: true })`):

| Rule | Tier | Groups | Redundant |
|---|---|---|---|
| name_category_place | certain | 46 | 47 |
| name_category_phone | likely | 72 | 86 |
| name_category_location | likely | 13 | 13 |
| name_pincode | likely | 48 | 85 |
| same_email / same_website / same_googlemap | review | 99 / 428 / 18 | 111 / 736 / 23 |
| name_address_any_category | audit | 676 | 9 (rest flagged benign) |
| shared_phone_bulk | quality | 7 | 281 |

**Prod has not been measured.** Phase 0 does that, with approval.

### 3.4 Why the duplicates keep arriving

1. **The create-time duplicate check sees one page of data.** `getPotentialDuplicateMatches` in
   `client/ui-app/src/features/admin/business/Business.js` filters `businessList` from Redux. That
   list is server-paginated (`getAllBusinessList`, `pageSize = 10` in
   `client/ui-app/src/state/actions/businessListAction.js`) and the reducer replaces it with the
   current page (`client/ui-app/src/state/reducers/businessListReducer.js`, `FETCH_BUSINESS_SUCCESS`).
2. **When the check does fire, both exits create the copy.** `handleDuplicateOverride` ends in
   `saveBusiness({ skipDuplicateCheck: true })`. There is no "add this category to the existing
   listing" option.
3. **Self-serve publicize paths bypass it entirely.** `server/helper/publicize/publicizeHelper.js`:
   `createPublicize` guards only on exact `{ businessName, category, location }` (same shop,
   different category passes); the paid branch of `initiatePublicizePayment` creates the business
   document with **no guard at all**, before taking payment.

### 3.5 A live defect in the existing console (fix first — Phase 1)

The console's merge (`resolveDuplicateGroup`) retires losing rows but leaves every route that
resolves a business by id unaware of it:
- The **review QR** encodes the raw Mongo id: `buildReviewUrl` → `/write-review/<_id>/0`
  (`server/helper/businessList/businessListHelper.js`). `SubmitReviewPage.js` loads that id and
  `server/helper/reviewHelper/reviewHelper.js` writes the review with `findById(businessId)` —
  **no retired/merged check**. A customer scanning a retired row's printed QR files a review on an
  invisible listing.
- Legacy `/business/.../:id` URLs resolve by `_id` (`findBusinessForLegacyPath` in
  `server/middleware/legacyUrlRedirectMiddleware.js`); current URLs by `publicId`
  (`findBusinessByPublicId`, same file; `findBusinessForSeo` in `businessSeoMeta.js`).
- `purgeDuplicateGroup` hard-deletes rows *and their favourites/feed posts*. It is meant to delete
  their reviews too, but `relatedCollections()` points at a collection named `"businessreview"`,
  which does not exist (reviews live in `businessreviews`). So purge-impact always reports 0
  reviews, and a purge leaves the purged business's reviews orphaned. Fix the name (use the
  Mongoose models) in Phase 1, and have Phase 0 count orphaned reviews on prod.

Dev has 0 merged rows, so no damage there. Prod is unknown — Phase 0 counts it.

---

## 4. Decisions already made (do not relitigate)

| # | Decision | Consequence |
|---|---|---|
| D1 | **Pricing is per business, one fee** (user, 2026-09-11) | `categories[]` carries no billing state. Merging is revenue-neutral. Never sum payments. |
| D2 | **Top-level `category` survives as an automatically maintained mirror of the primary entry** | ~80 display-only readers need no change in any phase. Only writers and category-scoped queries change. |
| D3 | **Primary is always `categories[0]`**; exactly one entry has `isPrimary: true` | Drift check is one query; readers never need to search for the primary. |
| D4 | **`filters` stays at business level** (union across categories) | Search reads `filters.<key>` at business level (`mainSearchController`); no search change for filters. |
| D5 | **SEO fields stay at business level** | One detail page, one title (`buildBusinessSeoMeta`). Yesterday's paid-business SEO (2026-09-10) must not be overwritten. |
| D6 | **`mniDetails` stays at business level** | MNI group is per business (`mniDetails[0].categoryGroup`); only index 0 is ever read. |
| D7 | **Losing rows are never deleted.** They become tombstones: `isActive=false`, `businessesLive=false`, `activeBusinesses=false`, `duplicateReview.status="merged"`, `duplicateReview.mergedInto=<keeper _id>` | Every resolver follows `mergedInto`, covering publicId URLs, legacy `_id` URLs and review QRs with one rule. `restoreDuplicateGroup` clears `mergedInto`, which stops the redirect; a *full* unmerge also reverses the journal (§5.5). **Replaces the earlier `retiredPublicIds` idea — do not add that field.** |
| D8 | **Widen, don't change, query semantics.** Each category-scoped query keeps its exact operator (exact vs contains, case-insensitive or not) and only starts looking at `categories[].category` in addition to `category` | Before backfill-dependent reads switch, result sets must be byte-identical. |
| D9 | **Text index untouched in this project** | Secondary category names reach `$text` search through the `keywords` union on merge. Rebuilding the one allowed text index is a separate follow-up. |
| D10 | **New endpoints are admin-only** via `requireAuthPolicy` | See §5.8. |
| D11 | **Dev merges are never replayed on prod by `_id`** | Dev and prod data differ. Prod's backlog is worked separately through the console on prod. |

---

## 5. Target design

### 5.1 Schema (`server/schema/businessList/businessListSchema.js`)

```js
const businessCategoryEntrySchema = new mongoose.Schema({
  categoryId:   { type: Schema.Types.ObjectId, ref: "category", default: null }, // CATEGORY in collectionName.js
  category:     { type: String, required: true, trim: true },  // canonical name from categories.category
  slug:         { type: String, required: true, lowercase: true, trim: true }, // categories.slug
  isPrimary:    { type: Boolean, default: false },
  source:       { type: String, enum: ["migration", "admin", "owner", "publicize", "merge", "legacy"], default: "admin" },
  addedAt:      { type: Date, default: Date.now },
  addedBy:      { type: Schema.Types.ObjectId, ref: "User", default: null },
  mergedFromId: { type: Schema.Types.ObjectId, ref: "businesslist", default: null }, // set when source = "merge"
}, { _id: false });

// on businessListSchema:
categories: { type: [businessCategoryEntrySchema], default: [] },
```
- Field names `categories` and `mergedFromId` are free (0 dev docs have them).
- Cap: see Q2 in §10 (recommended max 10; the largest real group on dev is 10).

### 5.2 Invariants and the sync hook

A synchronous `pre("validate")` hook (same idiom as the existing `syncBusinessName`) enforces, on
every `.save()`:

1. dedupe entries by `slug` (first occurrence wins);
2. exactly one `isPrimary: true`; if none, the first entry becomes primary;
3. the primary is moved to index 0;
4. `this.category = this.categories[0].category` (the mirror).

Behaviour table — **write a `node --test` test for every row**:

| Situation | Required result |
|---|---|
| New doc, only `category` set | `categories = [{ category, slug, isPrimary: true, source: "legacy" }]` |
| New doc, `categories` set | invariants applied; `category` = primary name |
| Existing doc, only `category` changed (legacy writer: owner edit, old client, script using `.save()`) | **Means "set the primary".** If an entry with that slug exists, promote it; otherwise replace entry 0 with the new category. **Secondaries are kept.** `category` must end up equal to what the writer set — a hook that "restores" the old primary silently reverts real edits. |
| Existing doc, `categories` changed | invariants applied; `category` re-mirrored |
| Both changed and they disagree | `categories` wins; `category` re-mirrored |
| `categories` emptied | fall back to seeding from `category`; if both empty, validation error (`category` is `required`) |

Rules for the hook:
- **No DB access in the hook.** Canonical name / `categoryId` / `slug` resolution happens in the
  async normalizer (§5.3). The hook only computes a fallback slug for legacy writers.
- The fallback slug must use **the same algorithm as `categorySchema`'s pre-save**
  (`toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")`). Extract it into one shared,
  dependency-free util (e.g. `server/utils/categorySlug.js`) used by both schemas. Note the client's
  `createSlug` maps `&` → `and`; the server's does not. Always prefer the stored `categories.slug`.
- Hooks fire only on `.save()` / `create()`. Every app writer uses `.save()` (verified:
  `createBusinessList`, `updateBusinessList` → `business.save()`, both publicize paths). **Scripts
  and direct DB edits bypass it** — any script that writes `category` must write `categories`
  consistently, and the drift check (§8.2) must run after every migration.

### 5.3 The write normalizer

`normalizeBusinessWritePayload` in `server/helper/businessList/normalizeBusinessFields.js` is the
chokepoint. Today `createBusinessList` and `updateBusinessList` call it; the two publicize paths do
not. Add an **async** companion (e.g. `resolveBusinessCategories(payload)`) and call it from all four
writers, before `.save()`:
- Accepts either `categories: [<slug | name | {slug|category, isPrimary}>]` or legacy `category`.
- Resolves each against the `categories` collection (case-insensitive exact on name, or exact on
  slug) → canonical `category`, `slug`, `categoryId`.
- **Rejects unknown categories** (server-side "no free text" — the admin picker is already
  `freeSolo={false}`, but owner edit, publicize and direct API calls are not).
- Trims/case-normalizes a legacy `category` to the canonical name.

Also:
- `SECTION_FIELD_MAPPING['category-seo']` in `businessListController.js` is `['category', 'keywords']`
  — add `'categories'`, or section saves will silently drop the field.
- `copyKeywordsFromCategory` (create path) should union keywords from all categories.

### 5.4 Shared query helper (reads)

One dependency-free module, e.g. `server/helper/businessList/businessCategoryQuery.js`:
```js
// Wrap an existing category condition so it also matches secondary categories.
// `condition` is exactly what the call site already uses (exact string, anchored regex,
// contains regex...). Semantics are preserved; only the field set widens.
export const widenCategoryMatch = (condition) => ({
  $or: [{ category: condition }, { "categories.category": condition }],
});
// For aggregations that group/count by category:
export const unwindCategoriesStages = () => [
  { $unwind: { path: "$categories", preserveNullAndEmptyArrays: true } },
  { $set: { _categoryName: { $ifNull: ["$categories.category", "$category"] } } },
];
```
- Where a site ORs `category` with `keywords`, keep `keywords` in the OR.
- Grouping sites replace `"$category"` with `"$_categoryName"` after the unwind, keeping their
  existing `$toLower`/`$trim`.
- **Counts are unchanged by construction:** today a 10-category business contributes 10 rows (one per
  category); after merge it contributes 10 unwound entries (one per category).
- Before any read site is switched, `categories[0].category === category` on every document, so a
  widened query must return **exactly** the same result set. That is the Phase 4 gate.

### 5.5 Merge-as-categories semantics

`mergeDuplicateGroupAsCategories({ keepId, mergeIds, groupKey, ruleId, reason, note, reviewedBy })`
in `businessDuplicateHelper.js`. Keeper K, losers L1…Ln.

**Refuse to run (return a structured reason the UI shows) when:**
- more than one member is paid (`PAID_BUSINESS_FILTER` definition) — billing needs a human;
- any member is paid and K is not — K must be the paid row;
- any member is admin-verified and K is not — K must be the verified row;
- members have different non-empty `mniDetails[0].categoryGroup`s;
- any member is already a tombstone, or `keepId` is in `mergeIds`.

**Warn, but do not refuse,** when members have different `clientId`s. Compare only the `MC\d+`
token: 74% of rows store `"MC260616095836 — Relax Holidays"` (a display label baked into the
field) while others store the bare `"MC260616095836"`. Even after normalizing, 610 of the 969 dev
groups span several client records, because the admin workflow created a new client record per
category listing (e.g. Relax Holidays: `MC260616095836` and `MC260730071629`). So a differing
client is the *normal* state of this backlog, not evidence of different owners. Show every client
record involved in the preview, keep K's `clientId`, and journal the losers'. Deduplicating
`userclients` is a separate, upstream problem (outside this project).

Also update `keepScore` so paid and verified rows always outrank unpaid/unverified ones.

**Field by field:**

| Field(s) | Rule |
|---|---|
| `categories` | K's entries, then each loser's entries not already present by `slug`, appended with `source: "merge"`, `mergedFromId: Li`. K's primary stays primary. |
| `keywords` | Union, de-duplicated case-insensitively; also add each loser's category name (so `$text` finds it — D9). |
| `filters` | Union by key. On conflict **K wins**; every conflict is listed in the merge preview and journal (258 dev groups have them). |
| `seoTitle`, `seoDescription`, `title`, `description`, `slug` | K's. Fill only blanks from losers. Never overwrite a paid business's SEO. |
| contact, address, `masterLocation`, `geoLocation`, `openingHours`, website, socials, email, `gstin`, `logoImageKey`, `bannerImageKey` | K's. Fill blanks from losers in `keepScore` order. |
| `businessImagesKey` | Union (S3 objects are never deleted, so loser keys stay valid). |
| `analytics.views/clicks/leads/favoritesCount` | Sum. `lastViewedAt`: max. |
| `averageRating` | Recompute after reviews move — reuse the stats aggregation in `reviewHelper.js`. |
| `payment[]`, `paymentConcept`, `amountPaid`, `premiumBusiness`, `paidDate`, `subscription` | K's only. Never summed, never copied. |
| `verification`, `badges`, `certificates`, `qrCode`, `businessProfileQrCode`, `publicId`, `clientId`, `createdBy`, `createdAt` | K's. |
| `mniDetails` | K's; if K has none, take the loser's. |

**Child collections (reassign from Li to K — never delete).** Access them through their Mongoose
models, **not** raw collection-name strings: `relatedCollections()` in `businessDuplicateHelper.js`
names the reviews collection `"businessreview"`, which does not exist — the real collection is
`businessreviews` (verified on dev: 69 docs). Because a query on a missing collection returns 0
without throwing, that bug is silent (see §3.5). Collection names below are verified on dev.

| Collection | Action |
|---|---|
| `businessreviews` | `businessId: Li → K` |
| `favorites` | `businessId: Li → K`. **Unique index `{ userId, businessId }`**: where the user already favourited K, delete the Li favourite (journal it) instead of moving it. |
| `massclick_feed_follows` | `businessId: Li → K`. **Unique index `{ followerUserId, businessId }`**: same collision rule as favourites. |
| `massclick_feed_posts` | `businessId: Li → K` (no unique index) |
| `advertisments` (sic — that is the real name) | `businessId: Li → K` (purge currently nulls it; merge must move it) |
| `delayed_lead_dispatches` | replace Li with K in `businessIds` / `customerListBusinessIds` (pending leads must reach K) |
| `payments`, `reward_claims`, analytics events, WhatsApp audit | **Untouched** (financial/audit history). Report counts only. |

**Ordering and atomicity.** Check `rs.status()` on the dev mongod: if it is a replica set, use a
transaction. If standalone (likely), use ordered **idempotent** steps so a crash at any point loses
nothing and a re-run completes the merge:
1. write a journal document (below) with status `started`;
2. enrich K (categories, keywords, filters, blanks) — idempotent;
3. reassign child collections — idempotent (`businessId ∈ [Li…]`);
4. recompute K's rating and analytics;
5. **last**, tombstone the losers;
6. mark the journal `completed`.

A crash before step 5 leaves losers still live and K enriched — visible duplicates, no data loss.

**Journal (for exact undo):** new collection `business_merge_journal`, one document per merge:
`{ keepId, mergedIds, categoriesAdded, keywordsAdded, filtersAdded, filterConflicts,
blanksFilled: {field: {from, value}}, moved: { reviews: [ids], favorites: [ids], favoritesDeleted:
[docs], feedPosts: [ids], feedFollows: [ids], ads: [ids], dispatches: [ids] }, analyticsAdded,
status, startedAt, completedAt, by, groupKey, ruleId, note }`.

**Unmerge** (`unmergeBusinessGroup(journalId)`): reverse exactly what the journal recorded — remove
the added category entries, remove added keywords and filters (only where still equal to what was
added), move the recorded child ids back, re-insert deleted favourites, subtract analytics, restore
losers via the existing `restoreDuplicateGroup`, and mark the journal `reverted`. Do not attempt
"best effort" reversal without a journal.

### 5.6 Redirects — follow `mergedInto`

One helper (e.g. `resolveMergedBusiness(doc, { maxHops: 5 })` in
`server/helper/businessList/`): while `doc.duplicateReview?.status === "merged"` and `mergedInto`
is set, load `mergedInto`; guard cycles with a visited set; return `{ business, mergedFrom }`.

Apply it at every resolver:

| Resolver | Behaviour on a tombstone |
|---|---|
| `findBusinessByPublicId`, `findBusinessForLegacyPath` (`legacyUrlRedirectMiddleware.js`) | 301 to the keeper's canonical path (`buildBusinessDetailsPath`) |
| `findBusinessForSeo` (`server/helper/businessList/businessSeoMeta.js`, SSR branch in `ssrMiddleware.js`) | 301 |
| `viewBusinessList(identifier)` (`GET /api/businesslist/view/:id`), `findBusinessBySlug` (`GET /api/business/by-slug`) | return the keeper plus `mergedFrom`; the client (`features/public/cards/cardDetails.js`) does `navigate(<keeper canonical>, { replace: true })` |
| `reviewHelper.js` review creation and the review-stats path | resolve `businessId` first; the review lands on the keeper |
| `SubmitReviewPage.js` (`/write-review/:businessId/:ratingValue`) | when the detail load returns `mergedFrom`, replace the URL with the keeper's id |

- `purgeDuplicateGroup` must **refuse** any row with `duplicateReview.status === "merged"` —
  tombstones are what printed QR codes resolve through.
- Also confirm what URL the certificate artwork's QR encodes, and that it resolves through the same
  path.

### 5.7 Indexes

| Index | Action |
|---|---|
| `{ "categories.slug": 1 }` (multikey) | Add. Declare in the schema. |
| `businessName_1_category_1_location_1` (unique, undeclared, created by hand) | Convert to a **partial** unique index (`partialFilterExpression: { isActive: true }`) so tombstones never collide with live rows, and declare it in the schema. Check whether prod has it (Phase 0) before assuming anything. Drop-and-create leaves a gap of seconds with no uniqueness; do it with writes quiet. |
| Text index `businessName_text_category_text_keywords_text_location_text` (weights 10/8/5/3) | Untouched (D9). |

### 5.8 Endpoints (all admin-only)

Register each in `server/auth/authPolicyRegistry.js` with `allowedActorTypes: ["admin"]` (pattern:
the `otp.profile.list` entry) and guard the route with `requireAuthPolicy("<key>")` from
`server/auth/authMiddleware.js` (usage: `server/routes/favoriteRoute.js`).

| Method + path | Purpose |
|---|---|
| `POST /api/businesslist/duplicate-check` | Server-side duplicate check for the create/edit form (whole collection, not one page) |
| `PUT /api/businesslist/:id/categories` | `{ add: [slug], remove: [slug], primary: slug }` |
| `POST /api/businesslist/duplicates/merge-as-categories` | Preview (`dryRun: true`) and execute the §5.5 merge |
| `POST /api/businesslist/duplicates/unmerge` | Reverse a merge by journal id |

> **Separate, pre-existing issue (not part of this project, flagged to the user as its own task):**
> the existing `/api/businesslist/duplicates/*` routes, section-update routes and others are guarded
> only by `oauthAuthentication`, which admits `["admin", "publicClient"]`. The public SPA obtains a
> `client_credentials` token (`client/ui-app/src/state/actions/clientAuthAction.js`) with a secret
> inlined at build time (`REACT_APP_OAUTH_CLIENT_SECRET`), and the purge / resolve / section-update
> controllers have no actor check of their own. Don't fix it inside this project, but don't copy
> the pattern either.

---

## 6. Blast radius — every affected site

Locate each by its function name (Appendix B). "Fn" is the enclosing function.

### 6A. Writers — change (Phase 2–3)

| File | Fn | Change |
|---|---|---|
| `server/helper/businessList/businessListHelper.js` | `createBusinessList` | call the category resolver before `new businessListModel(...).save()`; keywords from all categories |
| `server/helper/businessList/businessListHelper.js` | `updateBusinessList` | call the category resolver; persists via `business.save()` so the hook fires |
| `server/helper/publicize/publicizeHelper.js` | `createPublicize`, `buildBusinessFromPublicize` | route through `normalizeBusinessWritePayload` and the resolver; replace the exact-match guard with the shared duplicate check (Phase 5) |
| `server/helper/publicize/publicizeHelper.js` | `initiatePublicizePayment` (paid branch) | same, and run the duplicate check **before** creating the business and before `createPhonePePayment` |
| `server/controller/businessList/businessListController.js` | `SECTION_FIELD_MAPPING` | add `'categories'` to `'category-seo'` |
| `server/helper/businessList/normalizeBusinessFields.js` | `normalizeBusinessWritePayload` | category trim/canonicalization; async resolver companion |

The owner self-edit (`client/ui-app/src/features/user/edit-business/EditBusinessPage.js` →
`editBusinessList`) and every section save (`updateBusinessSectionAction`) go through
`updateBusinessList` and are covered by it.

### 6B. Category-scoped business queries — widen (Phase 4)

Verified to query `businesslists` (each was attributed to its model, not guessed):

| Area | File | Fn | Current form |
|---|---|---|---|
| Search | `server/controller/businessList/businessListController.js` | `mainSearchController` | `{ category: ^X$ } OR { keywords: ^X$ }`; also `$regexMatch` on `$category` in two ranking stages |
| Search | same | `getSuggestionsController` | contains-regex on `category`; aggregation groups by `$category` |
| Search | same | `nearbyBusinessesController` | `category: ^X$` |
| Category page (API + SSR) | `server/helper/businessList/businessListHelper.js` | `findBusinessesByCategory` (callers: `viewBusinessByCategory`, `ssrMiddleware.js`) | **contains**-regex on `category` OR `keywords`, escaped — keep contains |
| Category tiles | `server/controller/categoryDisplaySettings/categoryDisplaySettingsController.js` | `getV2DistrictCategoriesAction` | `$group` by `$toLower: "$category"` |
| Category usage | `server/controller/category/categoryController.js` | `categoryBusinessUsageAction` | `$match category $in`, `$group` by `$category` |
| Location coverage | `server/helper/location/masterLocationHelper.js` | `getLocationCategoryCoverage` | `$group` by `$toLower: "$category"` |
| **Lead routing** | `server/controller/businessList/logSearchController.js` | `logSearchAction` | `{ category: regex } OR { keywords: regex }` |
| **Lead routing** | same | `sendEnquiryLead` | `{ category: regex } OR { keywords: regex }` |
| **MRP leads** | `server/helper/MRP/mrpHelper.js` | distribution and lead-update queries | `category: mrp.categoryId` — **exact, case-sensitive**; `mrp.categoryId` holds a category *name* despite its name |
| Sitemap | `server/routes/sitemapRoutes.js` | location × category emitters | `category: "$category"` in `$group`/`$project` (three places) |
| Static pages | `server/generateStaticPages.js` | top level | `category: "$category"` |
| Admin list + export | `server/helper/businessList/businessListHelper.js` | `viewAllBusinessList` (used by `exportBusinessListAction`) | `query.category = ^X$` |
| Rewards | `server/helper/rewards/rewardHelper.js` | `listRewardBusinesses` + the query above it | `category: ^X$` |
| Ads showcase | `server/controller/ads/adsController.js` | `getCategoryCounts`, `fetchCategorySlice` | group by trimmed lower `$category`; exact match |
| Person report | `server/helper/businessPersonReport/businessPersonReportHelper.js` | `getBusinessReportFilters` and the business query below it | `category`/`subcategory` exact; `$category` projection |
| WhatsApp analytics | `server/controller/msg91/msg91AnalyticsController.js` | `searchMsg91AnalyticsBusinessesAction` and the business filter above it | contains-regex on `category` |
| Dashboards | `server/helper/businessList/businessListHelper.js` | `getDashboardSummaryHelper`, `getDashboardChartsHelper`, `getAdminAnalyticsReportHelper` | `$group` by `$category` (lowest priority) |
| Paid SEO console | `server/helper/seo/paidSeoConsoleHelper.js` | page-slot builder | derives category slugs from a paid business's `category` → secondary categories get no slot (behavioural note, Phase 7) |
| Duplicate rules | `server/helper/businessList/businessDuplicateHelper.js` | `DUPLICATE_RULES` | see 6E |

### 6C. Look related but are NOT business queries — do not change

| File | Why |
|---|---|
| `server/helper/advertistment/advertismentHelper.js` (category filter) | queries **advertisements**, which have their own `category` |
| `server/helper/businessList/logSearchHelper.js` | queries **search logs** |
| `server/controller/businessList/logSearchController.js`, the `CategoryModel` lookup near the top of `logSearchAction` | queries **categories** |
| `msg91AnalyticsController.js` `$group` by `$category` (two aggregations) and `businessPersonReportHelper.js` audit query | query **WhatsApp message audit** |
| `paidSeoConsoleHelper.js` `seoPageContentModel` / `seoModel` / `seoTemplateModel` queries | SEO collections |
| `categoryDisplaySettingsController.js` popular-category tabs | settings document |

### 6D. Display-only — no change in any phase (mirror covers them)

Public UI (`SearchResult.js`, `serviceCard.js`, `cardDetails.js`, popular/featured/trending cards,
favourites, owner dashboard); `buildBusinessSeoMeta` (server) and
`client/ui-app/src/shared/utils/businessSeoMeta.js`; `businessExportXlsx.js`; certificates;
`businessDetailsTemplate.js`; WhatsApp/SMS templates (`smsGatewayController.js`); the admin grid
projection in `Business.js`; MRP display fields.

### 6E. Duplicate tooling — change (Phases 1, 5, 6)

| File | Fn | Change |
|---|---|---|
| `businessDuplicateHelper.js` | `DUPLICATE_RULES` | rules keyed on `normalizeText(d.category)` must iterate `categories[]` (a doc contributes one bucket key per category), then dedupe groups — otherwise a merged keeper stops matching a new same-category copy. Add `categories` to `PROJECTION` and `slimDoc`. |
| same | `name_address_any_category` | stop treating "every row a different category" as benign — it is the merge queue. Add an explicit identity rule: same normalized name AND (same phone OR same place) AND rows in different categories. |
| same | `keepScore`, `keepEvidence` | paid and verified always win |
| same | `resolveDuplicateGroup` | unchanged (plain retire), but the UI must offer merge-as-categories next to it |
| same | `purgeDuplicateGroup` | refuse tombstones (Phase 1) |
| same | new `mergeDuplicateGroupAsCategories`, `unmergeBusinessGroup`, `resolveMergedBusiness` | §5.5, §5.6 |
| `businessListController.js` | new actions; the existing `*DuplicatesAction`s | wire new routes (admin policy) |
| `client/ui-app/src/state/actions/businessDuplicateAction.js` | — | actions for preview / merge / unmerge |
| `client/ui-app/src/features/admin/business-duplicates/BusinessDuplicates.js` | — | "Merge as categories" button; preview dialog (§7 Phase 6); merge history with Unmerge |

### 6F. Admin and owner UI

| File | Fn / area | Change |
|---|---|---|
| `client/ui-app/src/features/admin/business/Business.js` | `getPotentialDuplicateMatches`, `getDuplicateCheckSignature` | replace the Redux-page scan with a debounced call to `POST /duplicate-check`; keep the warning panel UI |
| same | `handleDuplicateOverride` and the duplicate dialog | add the primary action **"Add ‹category› to ‹existing business›"** → `PUT /:id/categories` → open that business's edit form |
| same | `handleChange` branch `if (name === "category")`, filter-config loading | multi-category: load `filterConfig` for every selected category and merge by key (same key with a different `type` → primary category's definition wins) |
| `client/ui-app/src/features/admin/business/components/BusinessFormStep2.js` | category `Autocomplete` | primary picker + secondary multi-select (keep `freeSolo={false}`) |
| admin grid in `Business.js` | rows | "+N categories" chip |
| `client/ui-app/src/features/user/edit-business/EditBusinessPage.js` | `applyCategory` | per Q1 in §10 (recommended: owners change the primary only; secondaries read-only) |
| `features/public/cards/cardDetails.js`, `features/public/rating/SubmitReviewPage.js` | load paths | follow `mergedFrom` (Phase 1) |

---

## 7. Phased plan

Each phase ends at a **gate**. Report results at every gate and wait for the user before the next
phase. Phases 1, 2 and 5 do not depend on the schema change and can ship on their own.

### Phase 0 — Baseline and setup (read-only)

1. `git pull` on `dev`; confirm a clean tree; re-run the Appendix B greps and fix any anchor that
   moved.
2. Create `BUSINESS_MULTI_CATEGORY_TRACKER.md` (checklist per phase) and a Handoff Log entry.
3. Run the baseline script (Appendix A — already in the repo) on **dev**; it saves
   `_migrations/multi-category/baseline-massClick_dev-<date>.json`. Compare with the 2026-09-11 run.
4. **Ask the user** for approval to run the same script read-only on prod. With approval, also
   record: whether `businessName_1_category_1_location_1` exists on prod; the count of
   `duplicateReview.status: "merged"` rows (these are live review-QR hazards — §3.5); paid rows
   inside identity groups; whether the mongod is a replica set.
5. Check `rs.status()` on dev (transactions available or not).

**Gate:** both baselines recorded in the tracker; user has seen the prod numbers.

### Phase 1 — Hotfix: follow `mergedInto` everywhere (small, ships alone)

§5.6 in full: `resolveMergedBusiness`; apply at every resolver; client `replace` navigation;
`purgeDuplicateGroup` refuses tombstones. Also fix `relatedCollections()` to use the Mongoose
models (reviews are in `businessreviews`), so purge-impact counts and cascades are real.

**Gate:** on dev, create two throwaway fixture businesses (clearly named, e.g. `ZZ MERGE TEST A/B`),
retire B into A with the existing console flow, then verify: B's `/write-review/<B _id>/0` flow
writes the review onto A; B's publicId URL and legacy `_id` URL 301 to A's canonical URL; purge of
B is refused; `restoreDuplicateGroup` makes B resolve to itself again. Delete the fixtures
afterwards (they are yours, not user data). Report what the user should spot-check after deploy.

### Phase 2 — Category hygiene (tiny)

1. Normalizer: trim + canonicalize `category` on write; reject unknown categories server-side;
   route both publicize writers through the normalizer.
2. Script (dry-run default, self-snapshotting `businesslists`): fix the 25 trim/case rows; list the
   6 unmatched rows with a proposed target category each. **The user decides** the 6 (create a
   category, or re-point).

**Gate:** baseline script shows `categories.fixableByTrimCase = 0` and `categories.noCategoryDoc = 0`
on dev; category tile counts unchanged or higher, never lower.

### Phase 3 — Schema, hook, backfill, indexes (behaviour-invisible)

1. Schema + shared slug util + sync hook + `node --test` suite for the §5.2 table.
2. `SECTION_FIELD_MAPPING` + resolver wired into all four writers.
3. Backfill script (dry-run default, self-snapshotting `businesslists`, idempotent — skips docs that
   already have `categories`): `categories = [{ categoryId, category, slug, isPrimary: true,
   source: "migration" }]` from the current `category`. Include tombstones.
4. Indexes per §5.7 (`categories.slug`; partial unique conversion — ask the user before dropping
   and recreating the unique index).

**Gate:** `countDocuments({ categories: { $size: 0 } }) === 0`; drift check (§8.2) = 0; every
`categories.slug` exists in `categories.slug` of the categories collection; hook test suite green;
the user's manual smoke test shows no behaviour change.

### Phase 4 — Widen reads (one commit per area)

Order: search → category pages/tiles/SSR → lead routing (log search, enquiry, MRP) → sitemap and
static pages → admin list/export → rewards, ads showcase, person report, WhatsApp analytics →
dashboards.

For each area: wrap the existing condition with `widenCategoryMatch` (or the unwind stages) —
**same operator, same escaping, keep `keywords`** — then run the equivalence script (§8.3).

**Gate per area:** equivalence script reports identical result sets (ids and order) for every query
in its fixture set. Any difference blocks the area. After deploy, flush the Redis caches for
category and business routes (`server/controller/cache/cacheController.js`).

### Phase 5 — Stop new copies at the door

1. `POST /api/businesslist/duplicate-check` (admin policy). Reuse `normalizeText`/`normalizePhone`
   and the place logic in `businessDuplicateHelper.js`; pre-filter with indexed fields (phone,
   pincode) so it never scans the collection per keystroke. Return candidates with reasons and
   their `categories`.
2. Admin form: replace `getPotentialDuplicateMatches` with the endpoint (debounced); add the
   **"Add ‹category› to ‹existing business›"** action; multi-category picker (§6F).
3. Publicize: shared check replaces the exact-match guard; the paid branch checks **before**
   creating the business and before payment. Behaviour on a match: per Q4.
4. Owner edit: per Q1.

**Gate (dev):** creating a known cross-category copy (e.g. "Relax Holidays" under a category it
lacks) is intercepted even when that business is not on the current admin page; "Add category"
adds the entry, and the business then appears on that category page; publicize free and paid both
refuse an existing business, and paid refuses before any payment call.

### Phase 6 — Merge as categories + work the backlog

1. Server: §5.5 (refusals, field rules, child reassignment, journal, unmerge) + §5.8 routes.
   `node --test` for the pure merge-planning function (given docs → planned changes), which must
   be dependency-free and separated from the DB executor.
2. Console UI: "Merge as categories" beside the existing actions. The preview dialog shows the
   keeper (with why), categories being added, filter conflicts (keeper wins), what moves (counts of
   reviews, favourites, ads, pending leads), any refusal reason, and the URLs/QRs that will
   redirect. A merge-history view with Unmerge.
3. Rules per §6E.
4. Backlog on **dev**, per Q3: export a dry-run CSV of proposed merges (group, keeper, losers,
   categories added, conflicts, refusals) for the user to review before anything is applied.

**Gate:** the user has reviewed the CSV; approved merges applied on dev; re-scan shows identity
groups only where intentionally kept; spot-check 20 merges (keeper on every former category page;
losers' publicId URL, legacy URL and review QR all land on the keeper; review counts and rating
correct; category counts per page unchanged; business total down by exactly the merged count);
unmerge verified on at least 3 merges.

### Phase 7 — Surface it

- Detail page: "Also listed in" chips linking only to existing category pages (Q5). One canonical URL.
- Admin grid chip; owner page per Q1.
- Paid SEO console: decide with the user whether a paid business's secondary categories get slots.

### Phase 8 — Prod rollout (user-driven)

The user deploys each phase's code. Data steps are replayed on prod **only with approval**, in
order, each preceded by a scoped snapshot: Phase 2 fixes (prod will have its own list) → Phase 3
backfill → Phase 3 indexes. Prod merges are done by admins through the console on prod (D11).
Flush Redis caches after each read-affecting deploy. Tell the user in advance that the admin
"total businesses" figure will drop by the number of merged rows — that is the goal, not a
regression.

### Phase 9 — Later (not in scope)

Stop reading top-level `category`; rebuild the text index with `categories.category`; revisit
`subcategory` (dead field).

---

## 8. Verification recipes

### 8.1 Pure-logic tests
The server has no test runner or test dependencies (`npm test` is a stub) — use Node's built-in
`node:test` + `node:assert/strict`, with `<module>.test.mjs` next to a dependency-free module.
Precedent in this repo: `server/utils/businessRouteShell.test.mjs` (tests
`businessRouteShell.mjs`); also `server/utils/urlSegment.js`, which was made dependency-free so it
could be tested. Run with `node --test <file>` from `server/`. Do not add Jest/Mocha.

Required: sync-hook truth table (§5.2 — test the hook logic as a pure function over a plain
object, not through Mongoose), category slug util, `widenCategoryMatch`, merge planner (§5.5 rules
and refusals), `resolveMergedBusiness` (chains, cycles, max hops).

### 8.2 Drift check (run after every data step, dev and prod)
```js
db.businesslists.countDocuments({ $or: [
  { categories: { $size: 0 } },
  { $expr: { $ne: ["$category", { $arrayElemAt: ["$categories.category", 0] }] } },
  { $expr: { $ne: [{ $size: { $filter: { input: "$categories", cond: "$$this.isPrimary" } } }, 1] } },
]})   // must be 0
```

### 8.3 Read-equivalence script (Phase 4 gate)
For each area, a fixture list of real inputs (top categories by business count, a few multi-word
ones, a few with `&`, the 3 largest districts) → run the **old** query and the **widened** query
against dev → compare id lists and order. Save the report to `_migrations/multi-category/`. After
Phase 6 merges, re-run with the expectation reversed: the widened query's results ⊇ the old results
minus tombstones.

### 8.4 Manual checks for the user (write them into the tracker per phase)
Category page for a merged business in each of its categories; its detail page URL and one former
URL; scanning a former review QR; admin form duplicate interception; owner edit of the primary
category.

---

## 9. Rollback

| Phase | Rollback |
|---|---|
| 1 | Revert commits. No data changed. |
| 2 | Revert code; the script's before/after report lists every changed row; restore from its snapshot. |
| 3 | Additive: `$unset: { categories: "" }` (the hook reseeds from `category` on next save) or restore the snapshot; revert code. Index: recreate the original full unique index from the recorded definition. |
| 4 | Per-area revert; each area is independent. |
| 5 | Revert; the old client check returns (it was near-blind anyway). |
| 6 | Unmerge by journal, per merge. Nothing is ever hard-deleted. |

The order is deliberately additive-then-switch: nothing is removed before Phase 9, so every earlier
phase is revertible by reverting code plus, at most, a scoped snapshot restore.

---

## 10. Questions only the user can answer — ask, don't assume

| # | Question | Recommended default |
|---|---|---|
| Q1 | Can business owners add or remove **secondary** categories from their self-edit page? | No, in v1: owners change the primary only; secondaries are admin-managed (owners adding every category would be search spam, and pricing is per business) |
| Q2 | Maximum categories per business? | 10 (largest real group on dev), admin can override |
| Q3 | Backlog: bulk-merge strict groups after CSV review, or console-only one by one? | Bulk only for strict groups (same normalized name + same phone + same pincode, no refusal conditions), after the user reviews the CSV; everything else through the console |
| Q4 | Publicize self-serve finds an existing business: block, or file a "request to add category" for admins? | Block with a clear message and a support contact; never take payment for a duplicate |
| Q5 | Show "Also listed in" category links on detail pages? | Yes, linking only to existing live category pages (no new URL shapes — crawl-trap history) |
| Q6 | Prod already-merged rows (if Phase 0 finds any): move reviews that were stranded on tombstones to their keepers? | Yes, via a dry-run report first |
| Q7 | The 6 dev businesses whose category has no category doc | User picks per row |

---

## 11. Reporting back

At each gate, report: what changed (files, commits), what data changed (counts, snapshot labels),
gate results with numbers, anything you could not verify, and the exact manual checks the user
should run. Update the tracker and the Handoff Log. Keep dev→prod replay notes in the tracker so
every dev data change can be re-applied on prod later.

---

## Appendix A — Baseline script (read-only)

**Already on disk** at `server/scripts/multiCategoryBaseline.mjs`. `server/scripts/` is gitignored
(`.gitignore`: `/server/scripts`) — the scripts tracked there were force-added, so commit this one
with `git add -f server/scripts/multiCategoryBaseline.mjs`, and do the same for every script this
project adds under `server/scripts/`. Tested on `massClick_dev` on 2026-09-11 — its output is saved at
`_migrations/multi-category/baseline-massClick_dev-2026-09-11.json` (gitignored), and it refuses prod
without the flag. Keep this appendix and the file identical.

Run from `server/`: `node scripts/multiCategoryBaseline.mjs massClick_dev`. For prod:
`node scripts/multiCategoryBaseline.mjs massClick --prod-read-approved` — only after the user
approves in chat.

```js
// READ-ONLY baseline for the multi-category project. Performs no writes.
import fs from "fs";
import mongoose from "mongoose";

const DB = process.argv[2] || "massClick_dev";
if (!["massClick_dev", "massClick"].includes(DB)) throw new Error(`unknown db ${DB}`);
if (DB === "massClick" && !process.argv.includes("--prod-read-approved")) {
  console.error("prod requires --prod-read-approved (user approval in chat first)"); process.exit(1);
}
const template = fs.readFileSync("D:/dev_abishek/db-backups/backup.js", "utf8").match(/const DEV_URI = '([^']+)'/)[1];
await mongoose.connect(template.replace("{db}", DB), { serverSelectionTimeoutMS: 10000 });
const db = mongoose.connection.db;
const B = db.collection("businesslists");
const out = { db: db.databaseName, at: new Date().toISOString() };

out.total = await B.countDocuments({});
out.active = await B.countDocuments({ isActive: { $ne: false } });
out.live = await B.countDocuments({ isActive: { $ne: false }, businessesLive: true });
out.merged = await B.countDocuments({ "duplicateReview.status": "merged" });
// reviews pointing at a business that no longer exists (left behind by purge — §3.5)
out.orphanedReviews = (await db.collection("businessreviews").aggregate([
  { $lookup: { from: "businesslists", localField: "businessId", foreignField: "_id", as: "b" } },
  { $match: { b: { $size: 0 } } }, { $count: "n" },
]).toArray())[0]?.n || 0;
// reviews sitting on merged tombstones (stranded by the review-QR defect — §3.5)
out.reviewsOnTombstones = (await db.collection("businessreviews").aggregate([
  { $lookup: { from: "businesslists", localField: "businessId", foreignField: "_id", as: "b" } },
  { $match: { "b.duplicateReview.status": "merged" } }, { $count: "n" },
]).toArray())[0]?.n || 0;

const docs = await B.find({ isActive: { $ne: false } }, { projection: {
  businessName: 1, name: 1, category: 1, keywords: 1, contact: 1, filters: 1, mniDetails: 1, clientId: 1,
  amountPaid: 1, premiumBusiness: 1, subscription: 1, "paymentConcept.paymentStatus": 1, "payment.paymentStatus": 1,
  "verification.isVerified": 1 } }).toArray();
const norm = (v) => (v ?? "").toString().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const phone = (v) => { let d = (v ?? "").toString().replace(/\D/g, ""); if (d.length > 10) d = d.slice(-10); return d.length === 10 ? d : ""; };
const isPaid = (d) => d.amountPaid || d.premiumBusiness || d.subscription?.isActive ||
  ["PREMIUM", "DIAMOND", "PLATINUM"].includes(d.subscription?.plan) ||
  ["paid", "part_paid"].includes(d.paymentConcept?.paymentStatus) ||
  (d.payment || []).some((p) => p.paymentStatus === "SUCCESS");

const cats = await db.collection("categories").find({}, { projection: { category: 1 } }).toArray();
const exact = new Set(cats.map((c) => c.category));
const byNorm = new Set(cats.map((c) => norm(c.category)));
const hygiene = { exact: 0, fixableByTrimCase: 0, noCategoryDoc: 0, empty: 0, unmatched: {} };
for (const d of docs) {
  const c = d.category ?? "";
  if (!c.trim()) hygiene.empty++;
  else if (exact.has(c)) hygiene.exact++;
  else if (byNorm.has(norm(c))) hygiene.fixableByTrimCase++;
  else { hygiene.noCategoryDoc++; hygiene.unmatched[c] = (hygiene.unmatched[c] || 0) + 1; }
}
out.categories = { categoryDocs: cats.length, ...hygiene };

const groups = new Map();
for (const d of docs) {
  const n = norm(d.businessName || d.name), p = phone(d.contact);
  if (!n || !p) continue;
  const k = `${n}|${p}`; (groups.get(k) || groups.set(k, []).get(k)).push(d);
}
const multi = [...groups.values()].filter((g) => g.length > 1);
const clientToken = (c) => ((c ?? "").toString().match(/MC\d{8,}/) || [""])[0];
const g = { groups: multi.length, redundantRows: 0, sizes: {}, allDistinctCategories: 0, repeatedCategory: 0,
  withPaid: 0, withMultiplePaid: 0, withVerified: 0, filterConflicts: 0, differentMni: 0, differentClientToken: 0 };
for (const grp of multi) {
  g.redundantRows += grp.length - 1; g.sizes[grp.length] = (g.sizes[grp.length] || 0) + 1;
  (new Set(grp.map((d) => norm(d.category))).size === grp.length) ? g.allDistinctCategories++ : g.repeatedCategory++;
  const paid = grp.filter(isPaid).length; if (paid) g.withPaid++; if (paid > 1) g.withMultiplePaid++;
  if (grp.some((d) => d.verification?.isVerified)) g.withVerified++;
  const seen = new Map(); let conflict = false;
  for (const d of grp) for (const [k, v] of Object.entries(d.filters || {})) {
    const s = JSON.stringify(v); if (seen.has(k) && seen.get(k) !== s) conflict = true; seen.set(k, s);
  }
  if (conflict) g.filterConflicts++;
  if (new Set(grp.map((d) => d.mniDetails?.[0]?.categoryGroup).filter(Boolean)).size > 1) g.differentMni++;
  if (new Set(grp.map((d) => clientToken(d.clientId)).filter(Boolean)).size > 1) g.differentClientToken++;
}
out.identityGroups = g;
out.paidRows = docs.filter(isPaid).length;
out.indexes = (await B.indexes()).map((i) => ({ name: i.name, unique: !!i.unique, partial: i.partialFilterExpression || null }));

const { scanDuplicates } = await import("../helper/businessList/businessDuplicateHelper.js");
const scan = await scanDuplicates({ includeResolved: true });
out.console = scan.summary.map((s) => ({ id: s.id, confidence: s.confidence, groups: s.groups, redundant: s.redundant }));

fs.mkdirSync("../_migrations/multi-category", { recursive: true });
const file = `../_migrations/multi-category/baseline-${DB}-${out.at.slice(0, 10)}.json`;
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2), `\nsaved ${file}`);
await mongoose.disconnect();
```

## Appendix B — Re-locating every site

Run from the repo root. If any returns nothing, the code moved: find it again before editing.

```bash
# writers
grep -n "export const createBusinessList\|export const updateBusinessList\|business.save()" server/helper/businessList/businessListHelper.js
grep -n "export const createPublicize\|export const initiatePublicizePayment\|new businessListModel" server/helper/publicize/publicizeHelper.js
grep -n "SECTION_FIELD_MAPPING\|'category-seo'" server/controller/businessList/businessListController.js
grep -n "export const normalizeBusinessWritePayload" server/helper/businessList/normalizeBusinessFields.js
# category-scoped reads (6B)
grep -n "export const mainSearchController\|export const getSuggestionsController\|export const nearbyBusinessesController" server/controller/businessList/businessListController.js
grep -n "export const findBusinessesByCategory\|export const viewAllBusinessList\|export const getDashboard\|export const getAdminAnalyticsReportHelper" server/helper/businessList/businessListHelper.js
grep -n "export const logSearchAction\|export const sendEnquiryLead" server/controller/businessList/logSearchController.js
grep -n "category: mrp.categoryId" server/helper/MRP/mrpHelper.js
grep -n "export const getV2DistrictCategoriesAction" server/controller/categoryDisplaySettings/categoryDisplaySettingsController.js
grep -n "export const categoryBusinessUsageAction" server/controller/category/categoryController.js
grep -n "export const getLocationCategoryCoverage" server/helper/location/masterLocationHelper.js
grep -n '"\$category"' server/routes/sitemapRoutes.js server/generateStaticPages.js
grep -n "export const listRewardBusinesses" server/helper/rewards/rewardHelper.js
grep -n "const getCategoryCounts\|const fetchCategorySlice" server/controller/ads/adsController.js
grep -n "export const getBusinessReportFilters" server/helper/businessPersonReport/businessPersonReportHelper.js
grep -n "export const searchMsg91AnalyticsBusinessesAction" server/controller/msg91/msg91AnalyticsController.js
# resolvers (Phase 1)
grep -n "const findBusinessByPublicId\|const findBusinessForLegacyPath" server/middleware/legacyUrlRedirectMiddleware.js
grep -n "findBusinessForSeo" server/helper/businessList/businessSeoMeta.js server/middleware/ssrMiddleware.js
grep -n "export const viewBusinessList\|export const findBusinessBySlug\|const buildReviewUrl" server/helper/businessList/businessListHelper.js
grep -n "findById(businessId)" server/helper/reviewHelper/reviewHelper.js
# duplicate tooling
grep -n "^export const \|^const keepScore\|id: \"name_address_any_category\"" server/helper/businessList/businessDuplicateHelper.js
grep -n "const getPotentialDuplicateMatches\|const handleDuplicateOverride" client/ui-app/src/features/admin/business/Business.js
# auth pattern for new routes
grep -n "allowedActorTypes" server/auth/authPolicyRegistry.js | head -3
grep -n "requireAuthPolicy(" server/routes/favoriteRoute.js
```
