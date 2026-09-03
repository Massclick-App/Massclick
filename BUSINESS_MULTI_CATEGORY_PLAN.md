# Multi-category business listings — implementation plan

Companion to `BUSINESS_MULTI_CATEGORY_PROPOSAL.md` (the *why*). This is the *what, where and how*.

---

## 1. The change, in one paragraph

`businesslists.category` stops being the single source of truth. A new `categories[]` array on
the same document holds one entry per category the business is listed under, each carrying its
own filters, SEO copy and lead-routing group. Top-level `category` survives as an
**automatically maintained mirror of the primary entry**, so every read that only displays a
category keeps working untouched. One real business becomes one document — one `publicId`, one
public URL, one review pool, one analytics counter, one QR code, one payment record.

Pricing is per business (confirmed), so `categories[]` carries **no per-entry billing state** and
merging duplicate rows is revenue-neutral.

---

## 2. The decision that keeps the blast radius small

```js
// businessListSchema — mirrors the existing syncBusinessName hook idiom
businessListSchema.pre("validate", function syncPrimaryCategory(next) {
  const primary = this.categories?.find((c) => c.isPrimary) || this.categories?.[0];
  if (primary) {
    this.category = primary.category;      // mirror, never authored directly
  } else if (this.category && !this.categories?.length) {
    // pre-migration document, or a writer that hasn't been converted yet
    this.categories = [{ category: this.category, isPrimary: true }];
  }
  next();
});
```

Because `category` is never allowed to drift from `categories[0]`, the ~60 client files and
~20 server files that merely *display* a business's category need **no change at all**, in any
phase. Only two kinds of code have to move:

- code that **writes** a category (4 sites)
- code that **filters or counts businesses by** category (18 sites) — because those must now also
  match secondary categories, or adding a category to `categories[]` would have no visible effect

Everything else is a no-op.

---

## 3. Blast radius

### 3A. WRITE paths — must change (4 sites)

| # | Site | What it is | Handling |
|---|---|---|---|
| 1 | `businessListHelper.js:336` (`createBusinessList`) | Admin form create. Already calls `normalizeBusinessWritePayload` at `:251` | Resolve `categoryId` and build the first `categories[]` entry inside the normalizer |
| 2 | `businessListHelper.js:1071` (`updateBusinessList`) | Admin edit + owner self-edit. Already calls the same normalizer | Same normalizer change covers it |
| 3 | `publicizeHelper.js:61` (`createPublicize`) | Free self-serve listing | **Does not call the normalizer.** Route it through `normalizeBusinessWritePayload` first |
| 4 | `publicizeHelper.js:191` (`initiatePublicizePayment`, paid path) | Paid self-serve listing | Same. Note this path has **no duplicate guard at all** today — it creates unconditionally |

> `normalizeBusinessWritePayload` (`normalizeBusinessFields.js:94`) is the natural chokepoint —
> two of the four writers already go through it. Getting all four onto it is a prerequisite, and
> is worth doing on its own merits.

**Also in scope for writes:** `publicizeHelper.js:49` guards duplicates on
`{ businessName, category, location }` exact-match — so the same shop under a different category
passes straight through. Replace with a call to the shared duplicate check (§3D).

### 3B. Category-scoped BUSINESS queries — must change (18 sites)

These filter, group or count `businesslists` **by** category. Each needs to match `categories.slug`
instead of the `category` string, otherwise a secondary category is invisible.

| Area | Sites |
|---|---|
| **Search** | `businessListController.js:1393` (main search category clause), `businessListHelper.js:558` (`findBusinessesByCategory`), `businessListController.js:334`, `:987`, `:1083`, `:2066` |
| **Category listing & counts** | `businessListController.js:398–478` (category aggregation), `categoryController.js:111`, `categoryDisplaySettingsController.js:643` (district category tiles), `masterLocationHelper.js:338` (per-location category presence) |
| **Lead matching** | `logSearchController.js:678`, `:910`, `:1440`, `logSearchHelper.js:37`, `:103` |
| **SEO surfaces** | `sitemapRoutes.js:455`, `:538`, `:1057` (location × category page emission), `generateStaticPages.js:45`, `:68` |
| **Other consumers** | `rewardHelper.js:165` (reward claim list), `advertismentHelper.js:184` (ad targeting), `businessPersonReportHelper.js:78`, `:98`, `msg91AnalyticsController.js:920` |

Mechanical change in each case:

```js
// before
{ category: { $regex: `^${escaped}$`, $options: "i" } }
// after
{ "categories.slug": categorySlug }

// before (aggregation)
{ $group: { _id: { $toLower: "$category" }, count: { $sum: 1 } } }
// after
{ $unwind: "$categories" }, { $group: { _id: "$categories.slug", count: { $sum: 1 } } }
```

**Counts stay correct across the migration.** Today Relax Holidays contributes 1 document to each
of 9 categories. After the merge it contributes 1 `categories[]` entry to each of 9 categories.
Every count in this table is unchanged — which is exactly what we want, because these numbers are
already on customer-facing pages.

### 3C. Display-only reads — NO CHANGE

Guaranteed by the mirror hook in §2. Explicitly includes:

- The entire public UI — `SearchResult.js`, `serviceCard.js`, business detail, `cardDetails.js`,
  `popularCategories.js`, `featureService.js`, `trendingSearch.js`, favourites, dashboard
- `businessExportXlsx.js`, `businessCertificateHelper.js`, `businessDetailsTemplate.js`
- WhatsApp / SMS templates (`smsGatewayController.js:285`, `:485`)
- `Business.js` admin grid projection (`:3159`) and all its filters
- The MRP lead engine (`mrpHelper.js`) — it keys on `mniDetails[].categoryGroup`, not `category`

These get revisited only in Phase 5, and only to *offer* the extra categories, never because
they break.

### 3D. Duplicate tooling — rewrite (the point of the exercise)

| Site | Change |
|---|---|
| `businessDuplicateHelper.js` `DUPLICATE_RULES` | Rules keyed on `normalizeText(d.category)` re-key onto the `categories[]` set. `name_address_any_category` stops being an `audit` curiosity and becomes the **merge queue** |
| `businessDuplicateHelper.js:487` `resolveDuplicateGroup` | Add "merge as categories": fold loser `categories[]` into keeper, reassign reviews/favourites/feed, sum analytics, record `retiredPublicIds`, then retire |
| `businessDuplicateHelper.js` `purgeDuplicateGroup` | Stop **deleting** reviews/favourites on merge — reassign them. Hard purge stays available but separate |
| `Business.js:1914` `getPotentialDuplicateMatches` | Delete. Replaced by a server call — it only ever saw one page (`businessListReducer.js:135`, `pageSize` 10) |
| `Business.js:3102` `handleDuplicateOverride` | Add the third exit: **"Add this category to the existing listing"** |
| `BusinessDuplicates.js` | New action button + confidence copy update |

### 3E. Schema, indexes, infrastructure

| Item | Change |
|---|---|
| `businessListSchema.js` | Add `categories[]`; add `syncPrimaryCategory` hook; add `retiredPublicIds: [String]` |
| Indexes | Add `{ "categories.slug": 1, "masterLocation.district": 1, businessesLive: 1 }`. **Verify on prod first** — `masterLocation.locationId_1` is declared in the schema but missing from the collection probed, so index state and schema have drifted somewhere |
| URL resolution | `businessUrl.js` / `legacyUrlRedirectMiddleware.js` — resolve `retiredPublicIds` → 301 to keeper. Non-negotiable: printed QR codes and indexed URLs must keep working |
| `BusinessFormStep2.js:147` | Category autocomplete → multi-select, primary marked |
| `EditBusinessPage.js:129` | Owner-side `applyCategory` → same multi-select |

---

## 4. Execution plan

Each phase ends at a gate. Nothing proceeds until the gate passes.

### Phase 0 — Measure (do first, blocks nothing)

Run the existing `scanDuplicates` helper read-only against **prod**. Record groups and redundant
rows per confidence tier. This is the baseline every later phase is verified against.

> Everything measured so far came from a 950-document local scratch DB, not prod. The real
> backlog size is currently unknown.

**Gate:** a recorded prod baseline.

### Phase 1 — Category hygiene (no schema change, no migration)

1. `normalizeBusinessWritePayload` trims and case-normalizes `category`; resolves and stores
   `categoryId`.
2. Route the two `publicize` writers through the normalizer.
3. Admin + owner category pickers reject free text — selection from `categories` only.
4. One-off script maps orphan category strings onto real category docs, creating genuinely missing
   ones. Reuse the shape of `cleanBusinessSpaces.js` / `cleanCategorySpaces.js`.

**Gate:** every live business's `category` resolves to a `categories` document. Category tile
counts (`categoryDisplaySettingsController.js:643`) unchanged or higher, never lower.

### Phase 2 — Add `categories[]`, dual-write (invisible)

1. Schema: `categories[]`, `syncPrimaryCategory` hook, `retiredPublicIds`.
2. Backfill: every doc gets one entry from its current `category` + `filters` + SEO + `mniDetails[0]`.
3. Writers populate `categories[]`; the hook keeps `category` mirrored.
4. **Nothing reads `categories[]` yet.**

**Gate:** `countDocuments({ categories: { $size: 0 } }) === 0`. Full-site smoke test shows zero
behaviour change. Snapshot before the backfill, scoped to `businesslists` only.

### Phase 3 — Server-side duplicate check

`POST /api/businesslist/duplicate-check`, backed by `businessDuplicateHelper`. Delete the
client-side scorer. Add the "Add this category to the existing listing" action.

**Gate:** creating a known duplicate is caught against the whole directory, not one page.

### Phase 4 — Merge tooling + clear the backlog

Ship "merge as categories", then work the Phase 0 queue: `certain` → `likely` → `review`.

**Gate:** re-run `scanDuplicates`; `certain` + `likely` at zero. Spot-check ~20 merged businesses
for reviews, analytics, QR and 301 behaviour. Every merge is reversible via `restoreDuplicateGroup`.

### Phase 5 — Move reads onto `categories.slug`

Convert the 18 sites in §3B, area by area, verifying counts against the Phase 0/2 baselines after
each. Then surface secondary categories in the UI ("Also listed in") with one canonical URL.

**Gate:** category counts match baseline; search returns the same or more results, never fewer.

### Phase 6 — Retire the string

Drop top-level `category` from writes; keep it as a virtual if any consumer still wants it.

---

## 5. Rollback

| Phase | Rollback |
|---|---|
| 1 | Category strings are only normalized, not destroyed. Revert code; keep a before/after CSV from the mapping script |
| 2 | Purely additive. `$unset` the array; the mirror hook makes it a no-op |
| 3 | Feature-flag the endpoint; fall back to no check (current state is near-no-check anyway) |
| 4 | `restoreDuplicateGroup` already exists and un-retires the losers. Nothing is hard-deleted |
| 5 | Per-site revert; each site is independent |

Order is deliberately **additive-then-switch**: nothing is removed until Phase 6, so every earlier
phase is revertible by reverting code alone.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| A merge loses reviews/favourites | Reassign, never delete. Current `purgeDuplicateGroup` deletes them — fixing that is a prerequisite to Phase 4, not an extra |
| Printed QR codes break | `retiredPublicIds` + 301 shipped **in the same release** as the merge action |
| Category counts drop on live pages | Every gate compares against the Phase 0/2 baseline; a drop blocks the phase |
| Merge picks the wrong keeper | `keepScore` already ranks by richness/engagement; admin can override; every merge is reversible |
| A missed writer bypasses the array | The `syncPrimaryCategory` hook back-fills `categories[]` from `category` for exactly this case |
| Index build on a large collection | Build `categories.slug` in the background; verify prod index state before Phase 5 relies on it |

---

## 7. Sequencing note

Phases 0, 1 and 3 are independent of the `categories[]` migration and can ship on their own.
If the Phase 0 numbers come back small, stop after Phase 3 — the duplicates get prevented at the
door and the schema change may not be worth it yet. If they come back large, Phases 2, 4 and 5
are the only way to clear the backlog without deleting categories from the directory.
