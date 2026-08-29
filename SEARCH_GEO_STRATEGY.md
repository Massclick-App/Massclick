# MassClick search geo — how it works today, and what I'd change

Companion to [TRICHY_GEO_AUDIT.md](TRICHY_GEO_AUDIT.md). Read-only investigation; nothing written to the DB.
Code read: `server/controller/businessList/businessListController.js`, `server/helper/location/locationResolver.js`,
`server/schema/location/masterLocationSchema.js`, `server/scripts/backfillMasterLocationCoordinates.js`.

---

## 1. How search actually works right now

Four stages, all inside `getBusinessList`:

**a. Resolve the location string to one masterlocation node** — `resolveLocationForSearch`
(`locationResolver.js:40`), in strict precision order:
`slug` exact → district name exact → `keywords` exact (shallowest level wins) → 6-digit pincode →
fuzzy `searchMasterLocation`. An autocomplete pick sends the exact slug, so it never reaches fuzzy.

**b. Expand to a search scope** — `resolveLocationSearchScope` (`locationResolver.js:85`).
Normally the node's own slug prefix. If it carries a `searchGroupSlug`, every sibling in that group
contributes its slug, address names and pincodes (Trichy has exactly 2 groups: Thillai Nagar ×8, K.K. Nagar ×4).

**c. Resolve a ranking origin** — `resolveSearchOrigin` (`businessListController.js:1626`):

1. `resolvedLocation.coordinates`, if it's a real point (rejects `[0,0]` and anything outside India);
2. else `resolveGmapsLocationOrigin()` — regex-scan up to 40 `gmaps_leads` on `name`/`formatted_address`, require district context, score name-exact 110 / name-contains 95 / address-contains 80, +10 for transit/train station. This is the d74acd8f fix that made Trichy Junction work;
3. else, **if the node is a locality → give up** (deliberate: a broad pincode average is worse than no sort);
4. else pincode-average over masterlocations (locality+ward), then over businesses.

**d. Rank** — only when `sortBy=relevant` *and* an origin resolved. Each business gets
`_searchRankCoordinates` = its own `geoLocation` if valid, **else** its masterlocation's coordinate via
`$lookup`. Haversine in `$expr`, bucketed into bands 0–2 / 2–5 / 5–10 / 10–20 / >20 km. Sort order:

```
locationPriority (in-scope=0) -> locationDistanceBand -> categoryPriority -> categoryModifierScore
  -> textScore -> exact locationDistance -> paidPriority -> verifiedPriority -> rating -> ...
```

Then a top-up pass: if results are thin, `$near` on the masterlocations 2dsphere index within
`search_nearby_radius_km`, collect those pincodes, widen the location clause.

### What this design gets right

The banding is the smart part — it means a slightly-closer paid listing doesn't leapfrog a much
better match, and paid placement still works *within* a distance band. The origin fallback chain is
honest about its own uncertainty (step 3 refuses to guess). Don't rewrite this.

---

## 2. The real problem is not the ranker — it's that the origin table is empty

The ranker is only as good as step (c), and step (c) reads a collection that is **92% empty at
locality level and 87% empty at ward level** in Trichy. Trichy Junction was never a bug. It was the
designed fallback firing because there was nothing in the data layer to fall back *from*.

Three consequences worth naming:

**The gmaps-lead scan runs on the miss path, which is the common path.** `gmaps_leads` has no index on
`name` or `formatted_address` — the query is an `$or` of case-insensitive regexes over 321,919
documents, per search, capped at 40 returned docs but not at documents examined. Today that is the
*normal* route for a Trichy locality search, not the exception.

**Business coordinates carry the ranking, and 9.4% of them are fake-precise.** `_searchRankCoordinates`
prefers the business's own `geoLocation` (99.7% coverage in Trichy) over the masterlocation's. But 345+
of 3,680 Trichy businesses sit on a point shared with 4+ other businesses — locality- or district-centroid
geocodes wearing 7 decimal places. 58 businesses share `[78.6828096, 10.8042261]`. Another 410 Trichy
businesses have a `geoLocation` outside the district box entirely. A district-centroid point is not more
precise than a good masterlocation point, but the code always prefers it.

**The `[0,0]` schema default is a live landmine.** `masterLocationSchema` defaults
`coordinates.coordinates` to `[0, 0]`. Null Island is a *valid* 2dsphere point — the only reason the
`$near` top-up hasn't returned nonsense is that everything real is 1,200 km away and outside the radius.
Right now exactly **1** Trichy doc has literal `[0,0]` and 10,391 have no `coordinates` field at all, so
this is nearly free to fix — but every future write path that touches a doc without setting coordinates
will mint another one.

**You cannot see any of this in production.** `logsearches.masterLocationSlug` is empty on **all 105 rows**.
Nothing records which node a search resolved to, which origin source fired, or whether distance sort
engaged at all. You are prioritising Trichy work off 105 rows of raw text.

---

## 3. The better idea: stop typing coordinates, recover the ones you already have

**You already paid for 8,291 Trichy coordinates and threw them away at import time.**

`outputs/trichy_enrichment/IMPORT_masterlocations.json` — the file that created these 10,128 records on
2026-08-25 — carries `_lat` and `_lon` on every row it had them for:

| origin | rows with coordinates |
|---|---|
| Google | 6,417 |
| OpenStreetMap | 1,789 |
| Census | 85 |
| **total** | **8,291 of 10,128** |

They were dropped because the import treats `_`-prefixed keys as scratch metadata. The upstream files
(`osm_new_places.json`, `gmaps_localities.json`, `final_master_list.json`) all still have `lat`/`lon` too.

I matched them back against dev by `slug` — every slug matched, and every coordinate falls inside the
Trichy bounding box:

| outcome | count |
|---|---|
| **active, currently no coordinate, coordinate valid** | **4,403** |
| inactive docs that would also get one | 3,726 |
| already has a coordinate (leave alone) | 162 |
| outside the district box (reject) | 0 |
| slug not found in DB | 0 |

**Active locality coverage: 7.8% → 87.9%** (428 → 4,831 of 5,494). 214 zone/ward groups that have zero
coordinates today light up. Cost: one afternoon's script, **zero API spend**, no manual entry.

Then run the existing tool for the parents:

```bash
node server/scripts/backfillMasterLocationCoordinates.js --districts=Tiruchirappalli --levels=ward,zone,district --all
```

It derives ward/zone/district as the **median** of child localities (`derivedCoordinate`, line 389) —
median, not mean, so the outliers in the audit can't drag a parent. With 4,403 children populated, all
12 empty zones and most of the 136 empty wards fill themselves. `--apply` snapshots masterlocations
first, automatically.

That leaves **~200 records** to touch by hand — the search-critical P2 list from the audit, the junctions
and landmarks, and whatever the guard script flags. That is the job worth doing manually. Typing 5,494
by hand was never the job.

### One blocker to fix before running anything

`needsCoordinate()` (line 402) is `FORCE || !isRealPoint(doc.coordinates)`. So:

- without `--force`, the backfill **will not fix** the four wrong `77.70°E` points or the Thottiyam one — they already "have" coordinates;
- with `--force`, it **overwrites everything**, including any point you place by hand.

Neither is what you want. Fix that before you start entering points, not after.

---

## 4. How I'd change the way locations are stored

### 4a. Drop the `[0,0]` default (do this first, it's 1 document)

```js
coordinates: {
  type:        { type: String, enum: ["Point"], default: undefined },
  coordinates: { type: [Number], default: undefined },   // was [0, 0]
}
```
Absent means absent. `[0,0]` means "a place in the Gulf of Guinea" to every geo query you will ever write.

### 4b. A locality is not a point — store its extent

The single highest-leverage schema addition:

```js
coordinatesMeta: {
  ...,
  radiusM:  { type: Number, default: null },   // p90 distance of children/leads from the centre
  bbox:     { type: [Number], default: undefined }, // [minLng, minLat, maxLng, maxLat]
}
```

Right now the distance bands are hardcoded 2/5/10/20 km for every level. A search for a 400 m cross
street and a search for a 25 km taluk zone get the same bands. With `radiusM` the bands scale with the
node — and you can compute it today from the child spread and the gmaps-lead cluster you already have.

### 4c. Lock human-placed points

```js
coordinatesMeta: {
  ...,
  lockedAt:  { type: Date, default: null },     // set when a human places the pin
  verifiedBy:{ type: String, default: "" },
}
```
Then `needsCoordinate()` becomes "no real point **or** flagged bad, **and** not locked", and `--force`
skips locked docs. This is what makes "I want to update coordinates myself" safe alongside automated backfills.

### 4d. Make `confidence` mean something

`coordinatesMeta.confidence` is currently decorative — I checked, the ranker branches only on
*presence* and the India bounding box. A `low / derivedFromCount:1` point and a
`high / derivedFromCount:1682` point rank identically. Either:

- widen the bands for a low-confidence origin (a ±5 km guess shouldn't produce a 0–2 km band), or
- refuse distance sort below a confidence floor and fall through to the next origin source.

The enum already includes `"manual"` and `"google-geocode"`, so no migration is needed for your own edits.

### 4e. Prefer the *more precise* coordinate, not always the business's own

In `searchedLocationRankStages`, swap the unconditional `geoLocation`-first `$cond` for: use the
business's own point unless it is a known shared/centroid point, in which case use its masterlocation's.
Cheapest version — precompute a `geoLocationPrecision: "address" | "locality" | "district"` field on
`businesslists` by counting how many businesses share each exact point, and check that field.

---

## 5. Add-ons worth building, in order of payoff

| # | Add-on | Why | Effort |
|---|---|---|---|
| 1 | **`recoverImportCoordinates.js`** — re-attach `_lat`/`_lon` from `IMPORT_masterlocations.json` by slug, box-guarded, dry-run default, `source: "gmaps-geo-import"` / `"osm-import"` / `"census-import"` | 4,403 active localities, 7.8% → 87.9%, zero API cost | half a day |
| 2 | **`auditMasterLocationCoordinates.js`** — the five checks from the audit as a repeatable report: outside district bounds, >N km from parent, `derivedFromCount<=2`, duplicate points, low decimal precision. Report-only, never writes | This is how you *keep* the data clean instead of re-auditing by hand each time. All five are already prototyped in this session | half a day |
| 3 | **Admin map editor** — district picker → location list with status chips (missing / low-confidence / far-from-parent) → drag a pin → writes `source:"manual"`, `confidence:"high"`, `lockedAt` | The actual answer to "I want to update coordinates myself." Hand-editing 174 wards in a shell is exactly how the `77.70°E` slip happens. Also the only version of this a non-developer can run | 2–3 days |
| 4 | **Search-origin telemetry** — log `resolvedSlug`, `resolvedLevel`, `originSource`, `originLat/Lng`, `distanceSortUsed`, `resultCount` into `logsearches` | `masterLocationSlug` is empty on all 105 rows. Without this you cannot see which searches fall through to the gmaps scan, so you cannot prioritise anything but by guesswork | half a day |
| 5 | **Index + cache the gmaps origin lookup** — a text or prefix index on `gmaps_leads.name` / `formatted_address`, plus a small `locationOriginCache` keyed by resolved slug | It's an unindexed regex `$or` over 321,919 docs on the miss path, per search. After add-on 1 the miss path gets rare — but it stays the fallback | 1 day |
| 6 | **`radiusM` derivation** — p90 distance of children (or of matching gmaps leads) from the node centre, written alongside the coordinate | Makes 4b real; unlocks level-aware distance bands | half a day |
| 7 | **Business geocode-quality pass** — flag the 410 Trichy businesses outside the district box and the 345+ sharing a point with 4+ others; set `geoLocationPrecision` | Business points drive the actual ranking. Fixing origins while leaving fake-precise targets only half-solves it | 1 day |

Add-ons 1 and 2 are the ones I'd do this week — 1 gives you the data, 2 stops it rotting.
3 is what makes the manual work you asked about pleasant instead of dangerous.

---

## 6. Suggested sequence

1. Drop the `[0,0]` schema default and fix `needsCoordinate()` / add `lockedAt` (small, and everything else depends on it).
2. Build + dry-run **add-on 1**. Review the diff on a sample of 50. Snapshot, apply to dev.
3. Run `backfillMasterLocationCoordinates.js --levels=ward,zone,district` to roll parents up from the new children.
4. Run **add-on 2** and fix what it flags — including the 6 poison records in the audit (P0).
5. Only now hand-place the ~200 that matter: the P2 junction/landmark list, plus anything still flagged.
6. Ship **add-on 4** so the next round of priorities comes from real traffic, not from 105 log rows.
7. Re-run the audit. Then repeat the whole thing for the next district — steps 1–4 are district-agnostic.
