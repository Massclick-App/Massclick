# Search geo quality — progress tracker

**Purpose:** survive a power cut, a closed laptop, or a new Claude session. Anyone (or any session)
picking this up should read only this file to know where things stand.

**Last updated:** 2026-08-29
**Scope right now:** Tiruchirappalli district. Steps 1–6 are district-agnostic and repeat for the next district.
**DB:** `massClick_dev` only. Prod (`massClick`) has not been touched and must not be without explicit approval.

---

## Status at a glance

| | |
|---|---|
| Phase | **Trichy coordinate fill complete; search ranking + telemetry fixes complete in code.** Localities 7.8% -> 89.3%, wards 12.8% -> 71.6%, zones 33% -> 100%. |
| Next action | Repeat coordinate recovery/enrichment for the next district. Also hand-place the 31 remaining active Trichy ward coordinates through the admin UI when useful. |
| DB writes so far | dev only: 67 manual (locked) + 8,034 recovered + 66 GeoNames + 45 derived parents + 83 disabled (36 localities + 47 wards) + 1 zone created + 3,680 business precision tags + 413 business coordinate repairs |
| Snapshots | Latest business coordinate repair snapshot is listed in `db-backups/MANIFEST.md` (see Rollback below) |
| Prod | **untouched** |

### Coverage, before -> after (active Trichy documents)

| level | before | after |
|---|---|---|
| district | 1/1 (100%) | 1/1 (100%) |
| zone | 6/18 (33.3%) | **19/19 (100%)** |
| ward | 20/156 (12.8%) | **78/109 (71.6%)** |
| locality | 428/5,494 (7.8%) | **4,876/5,458 (89.3%)** |

(19 zones, not 18 — `Tiruverumbur` was created. 109 active wards, not 156 — 47 synthetic
zero-business template wards were disabled. 5,458 localities, not 5,494 — 36 address fragments
were disabled.)

By source now: `gmaps-import` 3,150 · `osm-import` 1,152 · `gmaps-leads-derived` 356 ·
`census-import` 70 · **`manual` 67 (locked)** · `geonames-import` 66 · `derived-from-children` 65 ·
`business-derived` 31 · `mixed-derived` 17.

Business geo precision now: `address` 2,864 · `locality` 616 · `district` 200 ·
`outside-district` 0 · `invalid` 0.

**Still empty:** 582 active localities, 31 active wards. The 47 zero-business synthetic template
wards are now inactive; the remaining coordinate-less wards mostly look real and need coordinates,
not deletion.

**Validation:** 4,974 active points. 25 sit strictly outside the district polygon, 24 of them within
the 2km border tolerance. The one real remainder is `Kathalur` (2.72km, hierarchy bug, see below).

### Rollback

```bash
node db-backups/restore.js --from "db-backups/snapshots/massClick_dev/2026-08-29_08-11-57__pre-manual-coordinate-apply"
```
That is the earliest snapshot, taken before any of today's writes. The latest snapshot, taken
immediately before the business precision write, is:

```bash
node db-backups/restore.js --from "db-backups/snapshots/massClick_dev/2026-08-29_10-02-41__pre-trichy-business-coordinate-repair"
```

### Documents

| file | what it is |
|---|---|
| [TRICHY_GEO_AUDIT.md](TRICHY_GEO_AUDIT.md) | The read-only data audit: counts, coverage, every suspicious coordinate |
| [SEARCH_GEO_STRATEGY.md](SEARCH_GEO_STRATEGY.md) | How search works in code, and the proposed fixes/add-ons |
| **SEARCH_GEO_PROGRESS.md** | ← this file. Status, problem register, handoff |
| [outputs/trichy_geo/coordinate_requests.csv](outputs/trichy_geo/coordinate_requests.csv) | 63 coordinates requested from the user |

---

## Open questions for the user

Not blocking — everything reviewed has been applied. These two need a decision:

- **`Subramaniapuram`** — the same point `78.701372, 10.787608` was given to two different localities in two different zones (`Golden Rock > Ponmalai East > Subramaniapuram` and `K. Abishekapuram > Subramaniapuram > Subramaniapuram`). Both are now written and locked. Which one is that point actually for?
- **`Kathalur`** — a hierarchy bug, not a coordinate bug. It is filed under `K. Abishekapuram > Sastri Road` (a Trichy city ward) but the real place is ~2.7km into Pudukkottai near Iluppur/Panjappur. Its corrected coordinate was **rejected** and its old bad point is still in place. It needs its parent reassigned or the record deactivated.

### Coordinate requests — all returned and applied

| batch | rows | outcome |
|---|---|---|
| **A-broken** | 7 | 6 applied. `Kathalur` rejected (see above) |
| **B-zone** | 20 | 19 applied. `Tiruverumbur` skipped — the zone document does not exist yet (problem #8) |
| **C-landmark** | 36 | all applied |
| **A2-outside-polygon** (batch 2) | 6 | 5 applied, 1 rejected (`Kathalur`) |

Source files: `outputs/coordinate_fix_20260829/` and `outputs/coordinate_fix_batch2_20260829/`.
All 66 applied rows carry `coordinatesMeta.source: "manual"`, `lockedAt`, `verifiedBy: "abishek-2026-08-29"`,
and the reviewer's provider + source URL in `formattedAddress`.

---

## 7b — the synthetic wards: done

Decision taken 2026-08-29: disable the repeated template-name wards only when the full ward scope
has zero linked businesses. Applied on dev after snapshot
`db-backups/snapshots/massClick_dev/2026-08-29_09-38-54__pre-trichy-synthetic-wards-disable`.

Result:

- 47 wards disabled with `isActive: false`, `reviewStatus: "rejected"`.
- 3 similar template wards were kept live because they do have businesses under them:
  `Manapparai > Kamarajar Nagar` (2), `Thottiyam > Bus Stand Area` (1),
  `Thuraiyur > Kamarajar Nagar` (1).
- Verification after write: active ward coverage is **78/109 (71.6%)**. This is the correct live
  result, not the earlier rough "~90%" estimate.
- Reports:
  `outputs/trichy_geo/synthetic_wards_disabled_20260829.json` and
  `outputs/trichy_geo/synthetic_wards_disable_dry_run_20260829.json`.

Original evidence:

- **10 ward names repeat across 3-7 different taluks.** `Adi Dravidar Colony` x7,
  `Sundar Nagar` x6, `Bus Stand Area` x6, `Anna Nagar` x6, `New Colony` x6,
  `Periyar Nagar` x5, `Kamarajar Nagar` x4, `VOC Nagar` x4, `MGR Nagar` x3,
  `Sivaji Nagar` x3.
- **47 of those template-name wards carry ZERO businesses.** Not one between them.
- Each has 1-2 children, and the children are generic too (`Anna Nagar` contains
  "Anna Nagar" and "Gandhi Nagar"; `VOC Nagar` contains "VOC Nagar" and "Rajaji Nagar").
- Every ward in a taluk shares that taluk's single pincode, so they carry no
  geographic information below taluk level.
- All created 2026-07-10 with an empty `importSource` — the original seeded
  hierarchy, before the enrichment import. Consistent with the DeepSeek-generated
  district hierarchies (see the Salem workflow notes).

31 further coordinate-less active wards are **not zero-business template wards** (`Srirangam > Koothur`,
`Golden Rock > Khajapettai`, `Ariyamangalam > Oyyamari`...). Those look real and
need coordinates, not deletion.

---

## Problem register

Status key: `open` · `in progress` · `blocked` · `done`

| # | Collection | Problem | Solution | Status |
|---|---|---|---|---|
| 1 | `masterlocations` | 92% of active Trichy localities, 87% of wards, 67% of zones have no coordinate — search has no origin to rank from | Fill them (see #2, #3) | **mostly done** — zones 100%, localities 89.3%, wards 71.6% |
| 2 | `masterlocations` | The 2026-08-25 import dropped 8,291 coordinates it already had (`_lat`/`_lon` in `IMPORT_masterlocations.json`) | `scripts/recoverImportCoordinates.js` — re-attach by `slug` | **done** — 8,034 written (4,403 active + 3,631 inactive), 94 rejected as out-of-district |
| 3 | `masterlocations` | 653 active localities + 85 wards still empty after #2 | `scripts/matchGeoNamesCoordinates.js`, parent-distance guarded | **done** — 66 written; 582 localities / 31 active wards remain after #7b |
| 4 | `masterlocations` | 6 coordinates flat wrong — four at 77.70°E, one `[0,0]`, one in Thanjavur | `scripts/applyManualCoordinates.js`, user-reviewed batches | **done** — 66 applied and locked |
| 5 | `masterlocations` | `backfillMasterLocationCoordinates.js` skips bad points without `--force`, wipes manual ones with it | `coordinatesMeta.lockedAt` + boundary-based suspect check | **done** 2026-08-29 |
| 5b | `masterlocations` | `applyMasterLocationCoordinateSourceReport.js` `$set`s the whole `coordinatesMeta` object — would wipe a lock along with the coordinate | Skip locked docs before writing; `localitySkippedLocked` / `parentSkippedLocked` counters | **done** 2026-08-29 |
| 5c | `masterlocations` | `evaluateResult()` still validates *incoming Google geocodes* with the same self-poisoning business-derived `districtGuards` (see changelog) — it can accept a wrong result whose district box was widened by earlier wrong results | Switch that check to `isPointInDistrict()` too | **done** 2026-08-29 — code-only; incoming Google geocodes now use the published district boundary |
| 6 | `masterlocations` | Schema defaults `coordinates` to `[0,0]` — a valid point in the Atlantic | `default: undefined` on both subfields | **done** 2026-08-29 |
| 7 | `masterlocations` | active "localities" that are address junk (`nearby Muthoot FinCorp`, plus-codes, bare `Area`) | `scripts/disableTrichyNoiseRound5.js` | **done** — 36 disabled, 3 blocked by the business/lock guards |
| 7b | `masterlocations` | 50 active wards had repeated generic template names; 47 had zero businesses anywhere under their ward scope | `scripts/disableTrichySyntheticWards.js --apply`, after snapshot; disable only zero-business candidates and keep guarded wards live | **done** 2026-08-29 — 47 disabled; ward coverage 50.0% -> 71.6% |
| 8 | `masterlocations` | Zone `Tiruverumbur` had 94 localities but no zone doc | `scripts/createTiruverumburZone.js` | **done** — created and locked. The `Tiruverumbur` / `Thiruverumbur` spelling merge is deliberately NOT done: it rewrites slugs, and therefore URLs |
| 9 | `masterlocations` | `coordinatesMeta.confidence` was never read — `low/n=1` ranked same as `high/n=1682` | Bands double for a `low`-confidence origin; gmaps-lead and pincode-average origins are now graded rather than passed through unlabelled | **done** 2026-08-29 |
| 10 | `masterlocations` | Distance bands hardcoded 2/5/10/20 km for a cross street and a 25 km taluk alike | `coordinatesMeta.radiusM` (p80 child spread) + `buildDistanceBands()` in the controller | **done** 2026-08-29 — 68 nodes measured |
| 11 | `businesslists` | 345+ Trichy businesses share an exact coordinate (58 on one point) — locality centroids faking address precision | Add `geoLocationPrecision`; rank using the more precise of business vs masterlocation point | **done** 2026-08-29 — 428 shared-centroid rows tagged (`275 locality`, `153 district`); ranking prefers masterlocation coordinates for broad/bad business points |
| 12 | `businesslists` | 410 Trichy businesses have a coordinate outside the district | Flag and re-geocode | **done** 2026-08-29 — 413 bad rows repaired (`390 outside-district` + `23 invalid`); 25 from trusted map URL coordinates, 388 from linked masterlocation fallback |
| 13 | `gmaps_leads` | Origin fallback regex-scans 321,919 docs, no index on `name`/`formatted_address`, every search on the miss path | Index those fields, cache origin by slug | **done in code** 2026-08-29 — text index declared; indexed lookup with regex fallback; process cache by resolved slug |
| 14 | `logsearches` | `masterLocationSlug` empty on all 105 rows — no record of what resolved or which origin fired | Log `resolvedSlug`, `originSource`, `distanceSortUsed`, `resultCount` | **done** 2026-08-29 — code-only; future searches persist resolved/origin telemetry |
| 15 | `masterlocations` | Admin UI [MasterLocation.js](client/ui-app/src/Internals/location/MasterLocation.js) had no coordinate field or map — only a DB script could set one | Map picker in the edit form → writes `manual`/`high`/`lockedAt` when the pin changes; status chip per row | **done** 2026-08-29 |

---

## Execution order

```
6  schema: drop [0,0] default            DONE
5  lockedAt + fix needsCoordinate()      DONE
15 admin UI map picker                    (depends on 5)
2  recoverImportCoordinates.js           DONE  8,034 written
4  apply reviewed manual coordinates      DONE  67 written and locked
-  ward/zone/district rollup              DONE  45 derived
7  disable address-fragment localities    DONE  36 disabled
8  create the Tiruverumbur zone           DONE
3  matchGeoNamesCoordinates.js           DONE  66 written
7b disable zero-business synthetic wards  DONE  47 disabled

--- Trichy coordinate fill is complete. What is left is not geocoding: ---
9  ranker uses coordinatesMeta.confidence     DONE
10 radiusM + level-scaled distance bands       DONE  68 nodes measured
15 admin UI map picker                         DONE
11 businesslists geoLocationPrecision        DONE  3,680 tagged; ranker uses it
12 businesslists outside/invalid points      DONE  413 repaired; 0 bad remain
–  auditMasterLocationCoordinates.js      (validator, report-only)
–  hand-place whatever the audit still flags
14 search-origin telemetry                  DONE  code-only
5c future geocode boundary validation       DONE  code-only
13 gmaps origin lookup index/cache          DONE  code-only; index not manually built on dev
```

Everything before `14` is Trichy-scoped. Next district work repeats `2`–`3`.

---

## Resuming in a new session

**1. Bring up the DB tunnel** (it drops often — that's normal, just re-run):

```bash
ssh -f -N -o ServerAliveInterval=30 massclick-mongodb
```

Liveness check — should print a number:

```bash
node -e "const{MongoClient}=require('D:/dev_abishek/massclick/server/node_modules/mongodb');new MongoClient('mongodb://admin:PASSWORD@127.0.0.1:27019/massClick_dev?authSource=admin').connect().then(c=>c.db('massClick_dev').collection('categories').countDocuments()).then(n=>console.log('OK',n))"
```

Connection string lives in `D:\dev_abishek\db-backups\backup.js` (`DEV_URI`). Port **27019**, never 27018.

**2. Snapshot before the next write**:

```bash
node db-backups/backup.js --collections masterlocations --query "{\"district\":\"Tiruchirappalli\"}" --label pre-trichy-geo --reason "manual coordinate updates"
```

**3. Key files**

| path | what |
|---|---|
| `outputs/trichy_enrichment/IMPORT_masterlocations.json` | **The 8,291 dropped coordinates.** `_lat`/`_lon` per row, matched by `slug`. Do not delete |
| `outputs/trichy_geo/coordinate_requests.csv` | The 63-row user request |
| `C:\Users\USER\Downloads\Tamil_Nadu_Location_Data_Downloader\TamilNadu_Location_Data\` | GeoNames `IN.txt` (admin1=25 is TN) + district/taluk geojson boundaries |
| `server/scripts/backfillMasterLocationCoordinates.js` | Existing tool. Google-geocodes localities, median-rolls parents. Needs the #5 fix first |
| `server/controller/businessList/businessListController.js` | Search. Origin chain at `resolveSearchOrigin` (~line 1626), ranking at `searchedLocationRankStages` (~line 1758) |
| `server/helper/location/locationResolver.js` | `resolveLocationForSearch` (line 40), `resolveLocationSearchScope` (line 85) |
| `server/schema/location/masterLocationSchema.js` | The `[0,0]` default and the `coordinatesMeta` shape |

**4. Facts already verified** — don't re-derive these:

- Trichy active: 1 district, 18 zones, 156 wards, 5,494 localities
- Coordinate coverage: district 100%, zone 33.3%, ward 12.8%, locality **7.8%**
- Current active after #7/#7b/#8: 1 district, 19 zones, 109 wards, 5,458 localities
- Current coordinate coverage after #7b: district 100%, zone 100%, ward **71.6%**, locality **89.3%**
- Import file recovers **4,403** active localities → coverage **87.9%**; every slug matches, zero out-of-box points
- **812** active docs still missing after that; GeoNames fills **132** of them
- 3,680 Trichy businesses across only **113** distinct location slugs; 99.7% have their own `geoLocation`
- `masterlocations` has a `2dsphere` index on `coordinates`; `coordinatesMeta.source` enum already allows `"manual"` and `"google-geocode"`
- The ranker branches on coordinate *presence* + India bbox only — **never** on `source` or `confidence`
- GeoNames name-matching produces wrong hits without a parent-distance guard (`Elur` matched a place 55 km away)

---

## Decision log

| date | decision |
|---|---|
| 2026-08-29 | Manual entry for all 5,494 localities rejected — 4,403 are recoverable free from the import file, and only ~250 nodes are ever used as a search origin. Manual effort goes to those instead |
| 2026-08-29 | Zone coordinates to be hand-placed as **town centres**, not derived medians — "Musiri" means Musiri town, not the centroid of 203 villages |
| 2026-08-29 | Of the downloaded TN dataset, only GeoNames and the district/taluk geojson are useful; the village CSV/JSON and pincode centroids are superseded by existing data |
| 2026-08-29 | Banded distance ranking (0–2/2–5/5–10/10–20 km) is sound and stays — the problem is empty origin data, not the ranking algorithm |
| 2026-08-29 | "Is this coordinate in the wrong place" is decided by the **published district polygon**, not by bounds derived from our own business coordinates. Measured: the business-derived guard cleared all four bad Trichy points (they had widened it themselves to `minLng 77.684`) and instead flagged Thuraiyur and Thathaiyangarpettai, which are real. Vendored `tamil_nadu_districts.geojson` into `server/assets/geo/` for this |
| 2026-08-29 | For #7b, disable only repeated template-name wards whose full ward scope has zero businesses. Keep similar-looking template wards live when they have businesses (`Manapparai > Kamarajar Nagar`, `Thottiyam > Bus Stand Area`, `Thuraiyur > Kamarajar Nagar`). |

## Changelog

| date | what happened |
|---|---|
| 2026-08-29 | Audit run (read-only). Strategy written. 63-row coordinate request generated. **No DB writes.** |
| 2026-08-29 | Added `scripts/applyManualCoordinates.js` (reviewed CSV -> locked manual coordinates) and `scripts/recoverImportCoordinates.js` (restores the dropped import coordinates). Both dry-run by default, both auto-snapshot on `--apply`, both refuse prod without `--prod` |
| 2026-08-29 | Added `gmaps-import` / `osm-import` / `census-import` to the `coordinatesMeta.source` enum so recovered points carry honest provenance |
| 2026-08-29 | **WRITES TO DEV.** 66 manual coordinates applied and locked; 8,034 import coordinates recovered (94 rejected as out-of-district); 38 ward/zone/district centres derived at `--min-parent-coverage=0.5`. Three snapshots taken first |
| 2026-08-29 | Parent rollup left 85 wards unfilled, and **82 of those have zero children with a coordinate** — lowering the coverage threshold cannot reach them. They need locality data first (#3), and many are the synthetic per-taluk ward names (`Adi Dravidar Colony`, `Anna Nagar`, `Bus Stand Area`...) that may not be real wards at all |
| 2026-08-29 | **#7 done** — `scripts/disableTrichyNoiseRound5.js` disabled 36 address-fragment localities (`nearby Muthoot FinCorp`, `main gate`, `Area`, plus-codes). Rules deliberately narrow: an earlier loose pass matched on words like "bazaar"/"complex"/"towers" and swept up `Big Bazaar Street`, `Chinthamani Bazaar` and `Anjuman Bazaar`, all real Trichy streets. The business-link and lock guards fired on 3 rows and correctly kept them live |
| 2026-08-29 | **PROCESS FAILURE, no data lost.** Round 5 ran its write with no snapshot: the `node db-backups/backup.js` call was made from the repo root instead of `D:\dev_abishek\db-backups`, failed with MODULE_NOT_FOUND, and the `\| tail` pipe swallowed its exit code so `&&` still ran the write. Recovered by diffing the current collection against the `08-13-19` snapshot to derive the exact 36 flipped slugs -> `outputs/trichy_geo/noise_round5_disabled.json`. **Never pipe a command whose exit code gates a write.** |
| 2026-08-29 | **#8 done** — `scripts/createTiruverumburZone.js` created the missing zone (94 orphaned localities, 13 wards) at the reviewer's point, locked. Merging the `Tiruverumbur`/`Thiruverumbur` spellings was deliberately left alone: it rewrites `slug`, and therefore public URLs |
| 2026-08-29 | **#10 done** — added `coordinatesMeta.radiusM` + `scripts/deriveLocationRadius.js` (p80 spread of a node's located children). 68 Trichy nodes measured. Ward radii run 0.30km (Golden Rock > Senthaneerpuram West) to 9.9km, median 1.4km; zones median 9.4km, up to 19.8km (Musiri). The old fixed 2km band was ~7x too wide for Thillai Nagar Main and ~5x too narrow for Musiri |
| 2026-08-29 | **#9 done** — `buildDistanceBands()` in `businessListController.js` scales the bands off `radiusM`, and **doubles them for a `low`-confidence origin**. gmaps-lead origins are now graded (`medium` only on a near-exact name hit, else `low`) and pincode averages are always `low`, so the widening actually fires on the guessy paths. The search log line now prints confidence, radius and the computed bands |
| 2026-08-29 | Band multipliers took two attempts. `[1, 2.5, 5, 10]` on an unclamped radius gave Musiri `[19.8, 49.5, 99, 198]km` — meaningless when the district is 55km across, and it would have collapsed every result into band 0. Fixed by clamping the base to **0.5-6km** and using `[1, 2, 4, 8]`: a big taluk gets `[6, 12, 24, 48]`, Thillai Nagar Main gets `[0.61, 1.22, 2.44, 4.88]` |
| 2026-08-29 | **#7b evidence gathered** (see the section above). 47 template-name wards, **zero businesses between them**, 1-2 generic children each, all sharing their taluk's pincode, all seeded 2026-07-10. Deliberately NOT acted on — deleting ~47 plausible-looking wards is the user's call |
| 2026-08-29 | **#7b done — WRITES TO DEV.** `scripts/disableTrichySyntheticWards.js --apply` disabled 47 repeated template-name wards only after confirming zero businesses under each ward scope and taking snapshot `2026-08-29_09-38-54__pre-trichy-synthetic-wards-disable`. Three guarded template wards with businesses were left active. `publicLocationSlug` was recomputed; 1 row changed. Ward coverage is now **78/109 (71.6%)**, not the earlier rough ~90% estimate. |
| 2026-08-29 | **#15 done — NO DB WRITES.** Admin Master Locations now shows a `Map Pin` status column and the edit/create form has latitude, longitude, source note, place ID, and a compact OpenStreetMap tile picker. Saving a changed pin writes GeoJSON `[longitude, latitude]` plus `coordinatesMeta.source: "manual"`, `confidence: "high"`, `lockedAt`, `verifiedBy: "admin-ui"`; ordinary hierarchy edits leave existing coordinate provenance untouched. Verified with focused ESLint, CSS scope check, and local dev compile at `http://localhost:3001`. |
| 2026-08-29 | **#11 done / #12 flagged — WRITES TO DEV.** Added `businesslists.geoLocationPrecision` + meta and `scripts/classifyTrichyBusinessGeoPrecision.js`. Applied to 3,680 Trichy businesses after snapshot `2026-08-29_09-52-45__pre-trichy-business-geo-precision`: `address` 2,839, `locality` 275, `district` 153, `outside-district` 390, `invalid` 23. Search ranking now trusts business `geoLocation` first only for unflagged/address-like points; for locality/district/outside/invalid business points it prefers the linked masterlocation coordinate when available. Business-pincode origin fallback now excludes `outside-district` and `invalid` points from its average. |
| 2026-08-29 | **#12 done — WRITES TO DEV.** `scripts/repairTrichyBadBusinessCoordinates.js --apply` repaired all 413 bad Trichy business coordinates after snapshot `2026-08-29_10-02-41__pre-trichy-business-coordinate-repair`: 24 direct `maps.google.com/?q=` coordinates, 1 matching Google place URL, and 388 linked masterlocation fallbacks. Current Trichy business precision counts: `address` 2,864, `locality` 616, `district` 200, `outside-district` 0, `invalid` 0. |
| 2026-08-29 | **#14 done — NO DB WRITES.** Search responses now include `searchTelemetry` (`resolvedSlug`, `resolvedLevel`, origin source/confidence/point/radius, distance bands, distance-sort flag, result count). The search results page forwards it to `logSearchActivity`; `logsearches` schema and controller now persist it, and fill `masterLocationSlug` from `resolvedSlug` when older callers send no selected slug. Verified with focused backend syntax checks and focused client/server ESLint. |
| 2026-08-29 | **#5c done — NO DB WRITES.** `backfillMasterLocationCoordinates.js` no longer builds or uses business-derived `districtGuards` for incoming Google geocodes. `evaluateResult()` now rejects geocode outliers with `isPointInDistrict()`, the same published-boundary helper already used by `needsCoordinate()` / suspect-point handling. Verified with `node --check` and focused ESLint for the script. |
| 2026-08-29 | **#13 done in code — NO DB WRITES.** `gmapsLeadsSchema` declares a weighted text index on `name`, `formatted_address`, `massclick_location`, and `search_query`. The search-origin fallback now caches by resolved location slug for six hours, tries the indexed text lookup first, and falls back to the old regex query if the text index is missing or returns nothing. Did not manually build the dev index because index creation is a DB write. |
| 2026-08-29 | **#3 done** — `scripts/matchGeoNamesCoordinates.js` wrote 66. The guards rejected 63 matches a naive pass would have taken: 42 outside the district, 20 too far from their parent, 1 ambiguous. Added `geonames-import` to the source enum rather than mislabelling them `osm-import` |
| 2026-08-29 | Post-apply check: 4,931 active points, 25 strictly outside the district polygon, **24 of them within the 2km border tolerance**. The one real remainder is `Kathalur` at 2.72km — the hierarchy bug above. The Trichy polygon legitimately contains a 2.4x2.7km **Pudukkottai enclave** at [78.569, 10.697], which the helper correctly treats as a hole |
| 2026-08-29 | **#6 done** — `masterLocationSchema.js`: `coordinates.type` and `coordinates.coordinates` now `default: undefined`. Verified a new doc carries no `coordinates` key and an explicit point still round-trips |
| 2026-08-29 | **#5 done** — added `coordinatesMeta.lockedAt` + `verifiedBy`. `needsCoordinate()` now: locked → never; `--force` → yes; no point → yes; point outside its district polygon → yes. Bad coordinates are reachable **without** `--force` for the first time, and `--force` can no longer destroy manual work. Suspect points are also excluded from the parent-derivation pool so a misplaced child can't drag its parent's centre |
| 2026-08-29 | **#5b done** — `applyMasterLocationCoordinateSourceReport.js` now skips locked docs before `updateOne` (it `$set`s the whole `coordinatesMeta`, so a locked doc reaching the write would lose its lock) |
| 2026-08-29 | Added `server/helper/location/districtBoundary.js` (point-in-polygon) + vendored `server/assets/geo/tamil_nadu_districts.geojson`. 10/10 test cases pass: all 5 known-bad points rejected, all 4 legitimate outlying points accepted, unknown district passes through |
| 2026-08-29 | **User returned all 63 filled** (`outputs/coordinate_fix_20260829/coordinate_requests_corrected.xlsx`) — 63/63 filled, 0 outside the district polygon, 52 high / 9 medium-high / 2 medium, source URL recorded per row. 16 duplicate points, 15 of them correct (a ward and its eponymous locality sharing a centre). One open question: `Golden Rock > Ponmalai East > Subramaniapuram` and `K. Abishekapuram > Subramaniapuram > Subramaniapuram` were given the same point — two different localities in two different zones |
| 2026-08-29 | **User returned batch 2** (`outputs/coordinate_fix_batch2_20260829/`) — 6/6 filled. 4 now resolve inside Tiruchirappalli. `Nazareth Rd` lands 0.37km outside and is accepted as border noise (see tolerance below). `Kathalur` lands 3.76km outside, inside Pudukkottai — **this is a hierarchy bug, not a coordinate bug**: it is filed under `K. Abishekapuram > Sastri Road` but the place is near Iluppur/Panjappur. Needs a parent reassignment, not a new point. Not yet fixed |
| 2026-08-29 | Added a **2km tolerance** to `isPointInDistrict` + a `kmOutsideDistrict()` for reports. District polygons are simplified and border villages fall on the wrong side: Nazareth Rd was 0.37km outside while Kunnathur, 0.67km away in the same neighbourhood, was 0.28km inside. 2km separates that noise from Kathalur's real 3.76km error. 11/11 test cases pass |
| 2026-08-29 | Polygon test found **11** active Trichy points outside the real district boundary, not the 6 the bounding-box audit reported. New: `Manapparai > Karuppur`, `Manikandam > Kunnathur`, `Tiruverumbur > Thogur`, `Manikandam > Nazareth Rd`, plus `Kathalur`/`Fathimanagar` (already flagged as far-from-parent). TRICHY_GEO_AUDIT.md §5c is superseded by this number |
