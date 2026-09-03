# Business duplicates: fixing the cause, not the symptom

## 1. What is actually happening

`businessListSchema.category` is a **single required String**:

```js
category: { type: String, default: '', required: true },
subcategory: { type: String, default: '' },   // effectively dead - the admin form never writes it
```

A real business that serves N categories therefore needs N documents. That is not a
data-entry mistake, it is the schema forcing a 1:1 business-to-category relationship onto a
1:N reality. The code already admits this - `server/helper/businessList/businessDuplicateHelper.js`
opens with:

> "The directory stores one document PER CATEGORY for a single real business - 'Relax Holidays'
> legitimately exists 9 times at one address ... a name+address sweep flags ~650 groups of which
> almost none are real."

Once the row is split, **everything downstream forks with it**, because all of these are
per-document:

| Forked per duplicate row | Consequence |
|---|---|
| `publicId` -> `/business/:district/:slug-:publicId` | 9 near-identical public pages for one shop |
| sitemap entry (`sitemapRoutes.js`) | 9 thin/duplicate URLs submitted to Google |
| `businessreviews.businessId`, `averageRating` | reviews land on whichever row the customer happened to open |
| `analytics.views / clicks / leads`, `favorites` | traffic for one business reported as 9 small numbers |
| `qrCode`, `businessProfileQrCode`, `certificates` | a printed QR points at one row; the reviews may be on another |
| `paymentConcept`, `payment[]`, `premiumBusiness`, `badges` | one paying customer, nine billing records; "which row is paid?" |
| `masterLocation`, `geoLocation`, `openingHours`, contact | nine copies to keep in sync; they drift, then look like real conflicts |

So the duplicate console is doing cleanup on damage the schema keeps re-creating.

## 2. The key thing that makes the fix cheap

**Search already supports multi-category without duplicate rows.**

`mainSearchController` (`businessListController.js:1388`):

```js
matchQuery.$and.push({ $or: [
  { category: { $regex: `^${escaped}$`, $options: "i" } },
  { keywords: { $regex: `^${escaped}$`, $options: "i" } },
]});
```

`findBusinessesByCategory` (`businessListHelper.js:556`) does the same with a contains-regex.

`keywords` is already an array and already behaves as a secondary category. The extra rows
are **not** buying discoverability that a single row can't already have.

What the extra rows *are* buying, and what a single row would lose today:

1. **Per-category SEO copy** - `seoTitle`, `seoDescription`, `title`, `description` are one set per doc.
2. **Per-category filters** - `filters` (Mixed) is answered against that category's `filterConfig`.
3. **Per-category lead group** - `mniDetails[0].categoryGroup` drives MRP lead distribution.

That is the entire real gap. Close those three and the duplicate rows have no reason to exist.

## 3. Recommendation - promote category to a first-class array on ONE business

```js
// businessListSchema
categories: [{
  categoryId:  { type: ObjectId, ref: "category", required: true }, // REAL FK
  category:    String,   // denormalized display name
  slug:        String,   // denormalized from categories.slug - what search matches on
  isPrimary:   { type: Boolean, default: false },
  filters:     { type: Mixed, default: {} },                 // per-category filter answers
  seo:         { title, description, seoTitle, seoDescription },
  mni:         { categoryGroup, categoryGroupLocation },     // per-category lead routing
  priorityScore: { type: Number, default: 0 },               // per-category ranking
  addedAt, addedBy,
}],
```

Keep top-level `category` as a derived mirror of the primary entry so nothing breaks during
migration; drop it at the end.

Then: **one business = one document = one `publicId` = one detail page = one review pool =
one analytics counter = one QR = one payment record**, and it appears on as many category
pages as it pays for.

Suggested index: `{ "categories.slug": 1, "masterLocation.district": 1, businessesLive: 1 }`.
The category clause becomes an exact indexed match instead of a regex over free text.

### Why a real FK, not a string

> **Measurement caveat.** The figures below come from the database on
> `localhost:27017` at the time of writing, which turned out to be a **local scratch
> dataset** - 66 collections, **950 documents total**, no `masterlocations` collection.
> Prod (`massClick`) is ~447k docs and dev (`massClick_dev`) ~385k. Treat the shape of
> the problem as real and the counts as unmeasured until the same probe is run against
> prod. Running the existing `scanDuplicates` helper on that scratch DB returned
> 0 `certain`, 0 `likely`, 6 `review` - i.e. it tells us nothing about the real backlog.

On that scratch dataset (359 businesses):

- **115** distinct `category` strings on businesses
- **52** documents in the `categories` collection
- **70** business category strings have **no matching category document**

Samples: `" Cosmetics"`, `" Nursary Garden "`, `" Organic Shop"`, `" Textile "`, `"Boutiqu"`.

Even if the proportions differ on prod, the mechanism is guaranteed by the schema: a
free-text `category` with no FK accepts anything the form or an import writes. Two separate
failures come out of that:

- Those businesses are **invisible** on their own category page - the search clause is an
  exact/contains match against a string that doesn't exist in the category list.
- It **inflates the duplicate problem**: the same shop entered as `"Textile"` and `" Textile "`
  looks like two different categories, so the `name_address_any_category` rule marks the group
  `benign: true` ("each row in a different category - intended pattern") when it is in fact a
  straight duplicate.

A `categoryId` FK makes both impossible.

## 4. Two holes in the current guard that let duplicates keep arriving

**a) The create-time duplicate check only sees one page of data.**

`getPotentialDuplicateMatches` (`Business.js:1914`) filters over `businessList` from Redux.
But `getAllBusinessList` is server-paginated (`pageSize` default 10) and the reducer replaces
`businessList` with just that page (`businessListReducer.js:135`). So the warning panel is
comparing a new business against ~10-50 rows currently on screen, not against the directory.

-> Move it to a server endpoint, e.g. `POST /api/businesslist/duplicate-check`, reusing the
scoring already written in `businessDuplicateHelper.js` rather than the parallel implementation
in `Business.js`. Two duplicate-scoring engines that don't agree is its own problem.

**b) When the guard does fire, the only exits create the duplicate.**

Today the dialog offers "Review matches" or "Save anyway" (`handleDuplicateOverride`,
`Business.js:3102`). If the admin genuinely is adding the same shop under a second category,
*both* paths end in a new row - the second one is the path of least resistance.

-> Add a third, primary action: **"Add this category to the existing listing"**, which PATCHes
`categories[]` on the matched document and closes the form. That single UX change is what
stops the pattern at source.

## 5. What is missing in the duplicate console today

`resolveDuplicateGroup` (`businessDuplicateHelper.js:487`) only annotates the keeper and flips
`businessesLive/activeBusinesses/isActive` to false on the losers. **It discards the loser's
category.** So an admin literally cannot merge the 9 Relax Holidays rows without deleting 8
categories from the directory - which is exactly why that rule had to be labelled `audit` with
"shown so the pattern stays visible, not so it can be bulk-merged".

Add a **"Merge as categories"** action that:

1. folds each loser's `{ categoryId, filters, seo, mni }` into the keeper's `categories[]`;
2. reassigns `businessreviews`, `favorites`, feed posts and follows to the keeper
   (currently `purgeDuplicateGroup` *deletes* them);
3. sums `analytics.views/clicks/leads` into the keeper;
4. records the loser's `publicId` on the keeper as `retiredPublicIds: [String]`, and 301s it -
   printed QR codes and indexed URLs must keep resolving;
5. then retires the loser as it does now (reversible, nothing hard-deleted).

That turns the console from "hide the extra rows" into "actually merge", and lets the `audit`
tier become actionable instead of advisory.

## 6. Migration path (incremental, no big bang)

**Phase 0 - stop the bleeding, no schema change**

- Lock the admin category field to real category documents (no free text) and store `categoryId`.
- Trim/normalize category on write in `normalizeBusinessFields.js`.
- One-off script to map the 70 orphan strings onto real category docs, creating the genuinely
  missing ones. `server/scripts/cleanBusinessSpaces.js` and `cleanCategorySpaces.js` are the
  same shape - reuse them.

**Phase 1 - add `categories[]`, dual-write**

- Backfill every doc with a single entry built from its current `category` + `filters` + SEO fields.
- Keep writing top-level `category` (= primary). Nothing reads the array yet.

**Phase 2 - move reads onto it**

- Search category clause -> `categories.slug`.
- `findBusinessesByCategory` -> `categories.slug`.
- Filter-config load in the form -> the matching `categories[]` entry.
- Detail page -> primary category in the H1/breadcrumb, the rest as "Also listed in", one canonical URL.

**Phase 3 - merge tooling** (section 5) and **create-time UX** (section 4b).

**Phase 4 - drop top-level `category`**, keep it as a virtual if any consumer still needs it.

## 7. If a full migration is too much right now

The 80/20, in order of value per hour:

1. **Phase 0** - category FK + normalize the 70 orphan strings. Pure win, no migration risk,
   immediately fixes silent search misses and de-noises the duplicate scan.
2. **Section 4b** - the "Add this category to the existing listing" button. Stops new duplicates.
3. **Section 4a** - server-side duplicate check. Makes the existing guard actually work.
4. **Section 5** - merge-as-categories. Lets you clear the backlog without losing data.

Even without `categories[]`, steps 2-4 can be implemented against `keywords` as an interim
multi-category carrier, since search already matches it. That is strictly a stopgap - `keywords`
has no per-category SEO, filters or lead routing - but it would let one row cover several
category pages today.

## 8. Settled and outstanding

**Settled: pricing is per business, one fee.** A business pays once and gets all its categories.
So `categories[]` needs **no** per-entry billing state, and section 5's merge gifts nothing -
folding nine rows into one is revenue-neutral.

That also makes the current state a **billing data defect**, not just an SEO one. Each duplicate
row carries its own `paymentConcept` (`baseAmount` 24000, `totalAmount` 28320) and its own
`payment[]` array. A customer who paid once appears as nine payable records, so any revenue or
receivables report aggregating `paymentConcept` across `businesslists` is inflated by exactly the
duplicate count. Worth checking whatever report currently drives collections.

**Outstanding: index drift.** On the DB probed, `masterLocation.locationId_1` is declared in the
schema but absent from the collection, and there is no text index even though `mainSearchController`
issues `$text` queries. That DB was a scratch copy, so this may not reflect prod - but it should be
verified on prod before Phase 2 adds a `categories.slug` index and assumes it gets built.

## 9. Recommended order of work

Measure first: run `scanDuplicates` (read-only, already written) against **prod** to get the real
backlog by confidence tier. `certain` + `likely` is the merge queue; `audit` group count is the
size of the multi-category pattern. That number decides how urgent step D is.

| | Work | Why here | Rough size |
|---|---|---|---|
| A | Category hygiene: FK + normalize on write + map orphan strings | No migration risk, independent. Junk category strings are silent search misses today | ~0.5 day |
| B | Server-side duplicate-check endpoint | Current guard sees ~10 rows; also collapses the two disagreeing scoring engines | ~1 day |
| C | Add `categories[]`, backfill, dual-write | Nothing reads it - no behaviour change. Enabler for D and E | ~1 day |
| D | "Merge as categories" console action + "Add to existing listing" form action | Needs C. Clears the backlog without losing categories, and stops new ones arriving | ~2-3 days |
| E | Move reads to `categories.slug`, drop the string | Needs C and a settled D | ~2 days |

A and B depend on neither the prod numbers nor any open question, and can start immediately.
