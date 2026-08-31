# Search geo quality — progress tracker

**Purpose:** survive a power cut, a closed laptop, or a new Claude session. Anyone (or any session)
picking this up should read only this file to know where things stand.

**Last updated:** 2026-08-29
**Scope right now:** Tiruchirappalli district is done. Thanjavur is the second district, effectively
done for real search traffic (see below). Steps 1–6 are district-agnostic; step 2
(`recoverImportCoordinates.js`) only applies to Trichy — it recovers coordinates from Trichy's
one-off 8-source enrichment import, which no other district has. Every other district repeats only
step 3 (`matchGeoNamesCoordinates.js`) plus the parent median rollup.
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

Two more surfaced by the audit on 2026-08-29. The masterlocation points they poisoned are already
cleared (#17); these are about the *businesses* underneath, which are still wrong:

- **`N K International`** (Pudukkottai, live) — street "Sipcot Phase II Industrial Complex, SIPCOT, Pudukkottai", pincode 622002, but its `geoLocation` is **Hosur's** SIPCOT in Krishnagiri, ~240km away. Its own coordinate needs clearing or correcting; the Trichy precedent (`repairTrichyBadBusinessCoordinates.js`) would fall it back to the linked masterlocation point.
- **`Maxivision Super Speciality Eye Hospitals trichy`** — exists **twice**. One copy is correctly linked to Trichy `Thillai Nagar Main` via `pincode+text`. The duplicate is linked to Salem `Central Salem > Thillainagar` with **`source: "manual"`**, despite carrying `location: Trichy`, `street: thillai nagar` and pincode 620018. Its coordinate is also wrong (`76.68` for a place at `78.68`). **Not touched on purpose:** the self-heal script never overrides a `manual`/`owner-selected` link, and neither should a script here — someone chose Salem's Thillainagar in the admin UI. Needs a human to decide whether that was a misclick between two same-named localities, and whether the duplicate record should exist at all.

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

## Other districts — coordinate fill

### Fleet-wide: `[0,0]` schema-default landmine cleared — 2026-08-29

Auditing candidate districts for this work surfaced a live instance of problem #6: every doc written
under the old `[0,0]` schema default (fixed 2026-08-29 for future writes only) still carried the
literal Null Island point. **2,825 active+inactive docs across 13 districts** — Tiruvannamalai 445,
Tiruppur 412, Dindigul 377, Ramanathapuram 327, Erode 322, Coimbatore 299, Virudhunagar 295,
Ariyalur 193, Karur 150, Tirunelveli 2, Sivaganga 1, Thanjavur 1, Chengalpattu 1 — all with no
`coordinatesMeta` at all (the default fired with nothing else set, so there was no provenance to
lose). Not a live-ranking bug: `resolveSearchOrigin` already rejects `[0,0]` as a real point. But it
was inflating every "coordinate coverage" number for these districts and sitting as dead weight for
any future `$near` query. `server/scripts/fixZeroZeroCoordinates.js` (dry-run default, `--apply`,
self-snapshots, district-scoped or global) `$unset` both fields on all 2,825, returning them to the
same "no coordinate" state a post-fix doc would be in. Snapshot
`db-backups/snapshots/massClick_dev/2026-08-29_10-31-12__pre-zero-zero-coordinate-fix`. Verified 0
remain.

### Thanjavur — 2026-08-29

Chosen next (over Tirunelveli) for highest business-linkage payoff: 931 linked businesses, the most
of any completed district, with 0 `[0,0]` landmines among its active docs.

Audit first (mirroring the Trichy P0 checks, cheap at this scale — 607 active docs): only 1 point
0.91km outside the district polygon (inside border tolerance, not a poison record), 9 duplicate-point
groups, all legitimate ward/eponymous-locality pairs. No poison records, unlike Trichy.

Ran the two free steps: `matchGeoNamesCoordinates.js --districts=Thanjavur --apply` (27 accepted of
402 missing localities; rejected 265 no GeoNames entry, 74 parent has no coordinate, 26 too far, 10
outside district), then `backfillMasterLocationCoordinates.js --districts=Thanjavur
--levels=ward,zone,district --all --min-parent-coverage=0.5 --apply` (4 parents derived, 45 skipped
on coverage). A second GeoNames pass after the rollup found 0 further unlocks — the free methods are
exhausted for this district at 265 names GeoNames simply doesn't have.

Coverage: locality 126→153/528 (29.0%), ward 17→21/48 (43.8%), zone stayed 13/30, district still 0/1.
A much smaller lift than Trichy's, because Trichy's step 2 (import recovery) doesn't exist here —
this is step 3 alone.

**But the number that matters:** of the 62 distinct location slugs actually carrying Thanjavur's 931
linked businesses, only **11 (14 businesses) still have no coordinate** — Papanasam Rural,
Pattukottai Rural, Tamil University, Swamimalai Rural, Irudayapuram, Pattukottai Suburban > Anaikadu,
Kandiyur Area, Arisikara Street, Pattukottai Suburban > Alivalam, Natcharkoil Area,
Sethubavachatram. 98.5% of real search traffic is already covered. Same lesson as Trichy's
"only ~250 nodes are ever used as a search origin" — bulk locality coverage matters far less than
covering the handful of nodes businesses actually link to.

Two snapshots taken: `2026-08-29_10-33-01__pre-geonames-coordinate-match` and
`2026-08-29_10-33-20__pre-masterlocation-coordinate-backfill` (both whole-collection, per the
existing script's snapshot scope — pre-existing behavior, not scoped down for this run).

**Open:** the 11 remaining business-linked gaps need either a small manual hand-place (admin UI, 11
records) or a scoped Google-geocode call (paid API — needs the same explicit go-ahead the user
withheld for fresh Google calls during the Trichy enrichment). Not done pending that decision.

### Tirunelveli — 2026-08-29

Chosen as district #3 (637 linked businesses, second-highest payoff, but the thinnest real coverage
of any completed district at the time, 6.1%).

**Two bugs found and fixed, unrelated to coordinates, before the coordinate work was worth doing:**

1. **District-level doc was inactive.** Tirunelveli's `level:"district"` masterlocation doc was the
   only one of 37 TN districts with `isActive: false` (`reviewStatus: "approved"` — a "Hidden" state,
   not rejected). Effect: `resolveLocationForSearch` requires `isActive:true` at every match step, so
   a search for "tirunelveli" fell through to the shallowest *active* doc carrying that keyword — the
   **Tirunelveli zone** — silently narrowing every district-level search to one zone out of 12.
   Reactivated (single-doc `isActive:true`, snapshot
   `2026-08-29_10-49-03__pre-tirunelveli-district-reactivate`).

2. **184 of 637 linked businesses (29%) carried a stale `masterLocation.slug`/`zone`/`ward`.**
   Root cause: `backfillBusinessMasterLocations.js`'s `sameLink()` guard (~line 207) only compares
   `locationId` + `confidence` + `source` — never the denormalized `slug`/`state`/`district`/`zone`/
   `ward`/`locality` strings that search actually matches on. When a masterlocation doc's own name
   fields change in place (here: **Palayamkottai was promoted from a ward under the "Tirunelveli"
   zone into its own zone**, sometime after the 2026-07-11 business backfill), every business still
   correctly linked by `locationId` keeps serving the pre-restructure strings forever — re-running the
   self-heal script, even with `--force`, never touches these, because the `locationId` it resolves to
   hasn't changed. New `server/scripts/resyncBusinessMasterLocationFields.js` (dry-run default,
   `--apply`, self-snapshots, `--districts=` scoped) re-reads each business's *already-linked* live
   doc and copies its current `slug`/`state`/`district`/`zone`/`ward`/`locality`/`resolvedLevel` across
   — never touches `locationId`, `confidence`, `source`, or `linkedAt`. Applied: 184/184 fixed, 0
   remain. Snapshot `2026-08-29_10-51-52__pre-masterlocation-field-resync`.
   - Also surfaced (not this script's job): **33 businesses were still linked by `locationId` to the
     old, now-*inactive* pre-restructure "Palayamkottai" ward doc** — a real relink, not just stale
     text. `backfillBusinessMasterLocations.js --districts=Tirunelveli --force --apply` correctly
     re-resolved 33 of them to the new active Palayamkottai zone via pincode+text, and cleared 10
     unrelated stale links found in the same pass (pre-existing drift, not part of this bug). Snapshot
     `2026-08-29_10-52-37__pre-tirunelveli-business-selfheal`.

**Coordinate work** (same GeoNames + rollup pattern as Thanjavur, run *before* the bugs above were
found — the district reactivation and business relink don't touch `masterlocations` coordinates):
`matchGeoNamesCoordinates.js` +13 localities (of 303 missing; rejected 177 no GeoNames entry, 106
parent has no coordinate, 7 outside district), `backfillMasterLocationCoordinates.js
--levels=ward,zone,district --min-parent-coverage=0.5` +6 parents. Coverage: zone 2/12, ward 8/61,
locality 33/323 (10.2%) — thin, GeoNames simply has sparse entries for this district's small
localities.

**The number that matters, after both bug fixes:** of the 33 distinct location slugs now correctly
carrying Tirunelveli's 627 real linked businesses (was 637; 10 net-removed by the self-heal as
genuinely unresolvable/relocated), only **6 locations (78 businesses) still lack a coordinate** — all
under the newly-active Palayamkottai zone (Perumalpuram 35, Murugankurichi (Tvl) 23, Sivanthipatti 9,
V.M.Chatram 9, Santhinagar 1) plus Cheranmahadevi > Kallidaikurichi (1). Left as a known small gap,
same call as Thanjavur's residual 11 — not pursued further this session.

---

## The audit script — built 2026-08-29

`server/scripts/auditMasterLocationCoordinates.js`. **Read-only by construction** — no `--apply`, no
write path anywhere in the file, no prod guard (running it against prod is safe and sometimes the
point). This was the last unchecked line in the execution order, and it is what turns "we fixed the
data once" into "we can tell when it rots again". Every check exists because the problem it looks for
actually happened.

```bash
node server/scripts/auditMasterLocationCoordinates.js
node server/scripts/auditMasterLocationCoordinates.js --districts=Tiruchirappalli
node server/scripts/auditMasterLocationCoordinates.js --json=outputs/geo_audit.json
```

Ten checks: `[0,0]` landmines · outside-district points · locality far from parent · thin evidence
(low confidence or n<=2) · duplicate points · low decimal precision · **inactive district docs**
(the Tirunelveli class) · **stale cached business location fields** (the Palayamkottai class) ·
businesses on a now-inactive location · businesses with `[0,0]` geoLocation.

**Two calibration lessons, both found by validating against Trichy's known state:**

- The first version reported 3,680 stale business rows for Trichy while an independent run of
  `resyncBusinessMasterLocationFields.js` reported 0. The audit was wrong: `state` was missing from
  its mongoose projection, so every live doc read `state: undefined` and every row looked drifted.
  **Validate a new checker against a dataset whose answer you already know**, or it will confidently
  report its own bugs as data problems.
- A flat distance limit is useless for far-from-parent. At 15km it flagged 460 Trichy rows, ~450 of
  them legitimate: Marungapuri is a wide rural taluk whose zone point is hand-placed, locked and
  correct, with its children's median only 2km away. The check now scales the limit off the parent's
  measured `coordinatesMeta.radiusM` (2.5x, floored at the flat limit) — same lesson as problem #10.
  460 -> 92, and the genuine ~76km outliers still flag.

Duplicate-point classification follows the same reasoning: a parent node sharing its centre with a
few of its own children is expected; a pile of same-level siblings on one point with no parent among
them is one geocode reused N times (Trichy has a point carried by **14** different Thuraiyur
localities).

### First DB-wide run — 2026-08-29

`outputs/geo_audit_20260829.json`. 18,339 docs (13,071 active), 10,524 linked businesses.

| check | count | note |
|---|---|---|
| `[0,0]` masterlocations | 0 | the fleet-wide cleanup holds |
| outside district polygon | **13** | see below |
| far from parent | 228 | radiusM-scaled |
| thin evidence | 218 | low confidence or n<=2 |
| duplicate points (suspect) | 352 | 65 more are legitimate parent/child pairs |
| low precision | 14 | |
| inactive district docs | 0 | Tirunelveli was the only one, now fixed |
| stale business fields | 0 | Tirunelveli was the only case, now fixed |
| businesses on inactive location | 1 | `Nilan Construction` -> Thanjavur `Arisikara Street` |
| businesses with `[0,0]` geoLocation | **14** | first reported as 2 — the check was wrongly scoped, see below. Problem #16 |

**The 13 outside-district points are the Trichy 77.70°E bug, never swept anywhere else.** Two were
severe, and both turned out to be the *same* failure mode: `coordinatesMeta` on each read
`business-derived / low / derivedFromCount: 1`, with `formattedAddress` saying literally
"one linked business point only". Each had inherited a single business's own wrong coordinate.

- `Pudukkottai > Pudukkottai Town > Sipcot-pdk` — 239.8km out at `[77.8188684, 12.748986]`. Its one
  business, `N K International`, has street "Sipcot Phase II Industrial Complex, SIPCOT, Pudukkottai"
  and pincode 622002, but a coordinate in **Hosur's** SIPCOT (Krishnagiri). The wrong SIPCOT — there
  are several across TN.
- `Salem > Central Salem > Thillainagar` — 116.5km out at `[76.681953, 10.826385]`. Its one business
  is a **duplicate** record of `Maxivision ... trichy` whose `location` is Trichy, `street` is
  "thillai nagar" and pincode is 620018 (Trichy) — linked into *Salem* because Salem also has a
  locality spelled "Thillainagar". The other copy of that business is correctly linked to Trichy
  `Thillai Nagar Main`. Its coordinate is independently wrong too: `76.68` where Trichy's Thillai
  Nagar is `78.68`, a one-digit longitude error.

  (An earlier draft of this note claimed the point was "near Trichy, at about the Salem-Trichy
  distance". That was wrong — `76.68` is ~116km *west* of Salem toward Coimbatore/Palakkad, nowhere
  near Trichy's `78.68`. The contamination is real but runs the other way: a Trichy business pulled
  into a Salem locality, not a Salem locality given a Trichy point.)

Both bad points were cleared (see #17). The remaining 11 are 2-9.85km border cases — six of them
Tiruppur, on its intricate boundary with Coimbatore — and are consistent with polygon
simplification rather than real errors.

**A second self-inflicted bug, same class as the `state` projection one.** Check 10 first reported
2 businesses with `[0,0]` geoLocation; the true figure was **14**. The check had been scoped to the
location-linked business set, but a `[0,0]` point has nothing to do with whether a business is
linked, and an unlinked one has no district to scope by. Check 10 now queries all businesses
independently and ignores `--districts`. Caught only because the pre-write snapshot captured 14 docs
where the audit had predicted 2 — **the snapshot disagreeing with the report is itself a signal.**

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
| 16 | `businesslists` | `geoLocation.coordinates` defaulted to `[0,0]` — the exact landmine #6 fixed on `masterlocations` but never here. 14 rows carried it, 4 of them live | `default: undefined` on **both** subfields (see note), then `$unset` the 14 existing rows | **done** 2026-08-29 |
| 17 | `masterlocations` | 13 points outside their own district polygon outside Trichy — the 77.70°E class, never swept elsewhere | Cleared the 2 severe ones (both `business-derived/low/n=1`, poisoned by a single wrong business point each). Left the 11 border cases: all ≤9.85km, consistent with polygon simplification | **done for the severe cases**; 11 border cases deliberately left, and the 2 underlying *business* coordinates are still wrong — see below |
| 18 | `gmaps_leads` | The text index declared for #13 was never built on dev | Resolves itself: [app.js:207](server/app.js:207) connects with no options, so mongoose `autoIndex` defaults true and builds it on next server start | **resolves on deploy** — verified dev has no conflicting text index; MongoDB allows only one per collection, so check prod before deploying there |

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
–  auditMasterLocationCoordinates.js      DONE  2026-08-29, report-only, 10 checks
–  hand-place whatever the audit still flags  OPEN  see problems #16/#17
14 search-origin telemetry                  DONE  code-only
5c future geocode boundary validation       DONE  code-only
13 gmaps origin lookup index/cache          DONE  index builds itself on deploy via mongoose autoIndex
```

Everything before `14` is Trichy-scoped. Next district work repeats `2`–`3`.

**The execution order is now complete.** What remains is not plan items but findings the audit
produced: problems #16 (businesslists `[0,0]` schema default) and #17 (13 outside-district points
across other districts), plus the two long-standing Trichy records below.

**Nothing in this tracker is live until it is deployed.** All of the "DONE — code-only" work sits in
commits on local `dev`; the running `dev-api.massclick.in` does not have it until those are pushed
and deployed.

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
| 2026-08-29 | **#16 done — WRITES TO DEV.** `businessListSchema.geoLocation` now defaults **both** `type` and `coordinates` to undefined, and the 14 existing `[0,0]` rows were `$unset` (snapshot `2026-08-29_11-55-41__pre-business-zerozero-clear`). **The `type` half is not optional.** Proved it against a scratch collection carrying the same `2dsphere` index: a doc with no `geoLocation` key is accepted, a doc with a real point is accepted, but `{ type: "Point" }` with no `coordinates` is **rejected outright** — `"Can't extract geo keys ... Point must be an array or object"`. Changing only `coordinates` and leaving `type: "Point"` as the default would have made every new business insert fail. Verified the new shape produces no `geoLocation` key, that an explicit point still round-trips, and that all read paths (`getPointCoordinates`, the export helper, the aggregation pipeline) already null-guard |
| 2026-08-29 | **#17 partly done — WRITES TO DEV.** Cleared the two severe outside-district points (Pudukkottai `Sipcot-pdk` 239.8km, Salem `Thillainagar` 116.5km) after a lock guard, snapshot `2026-08-29_11-58-04__pre-clear-severe-outside-district`. Both were `business-derived/low/n=1` — clearing returns them to "no coordinate", so search falls back to the parent ward, which is enormously better than a 240km error. Deliberately did **not** guess replacement points. The 11 remaining are ≤9.85km border cases and were left alone. Audit re-run confirms 13 -> 11 |
| 2026-08-29 | **Line-ending churn in `businessListSchema.js`, caught and undone.** The file has mixed endings (357 CRLF + 31 bare LF, mixed even inside the `geoLocation` block). Editing it normalized everything to CRLF, inflating an 11-line change into 42 insertions / 31 deletions with unrelated lines showing as modified at byte-identical content. Rebuilt from `git show HEAD:<path>`, splitting on `/[^\n]*\n\|[^\n]+$/` so each line keeps its own terminator, changing only the two `default:` lines plus the inserted comment. Final diff: **13 insertions, 2 deletions**. The tell was `git diff --check` flagging "trailing whitespace" on lines never touched |
| 2026-08-29 | **Audit check 10 was under-reporting.** It claimed 2 businesses with `[0,0]` geoLocation; the real number was 14. The check had been scoped to location-linked businesses, which is meaningless for this condition. Caught because the pre-write snapshot captured 14 docs where the report predicted 2 — a snapshot count disagreeing with the report that motivated it is worth stopping for. Check 10 now queries all businesses and ignores `--districts` |
| 2026-08-29 | **Audit script built — NO DB WRITES.** `scripts/auditMasterLocationCoordinates.js`, 10 read-only checks, closing the last unchecked line in the execution order. Two calibration bugs caught by validating against Trichy's known state (missing `state` projection; flat far-from-parent limit replaced with a `radiusM`-scaled one). First DB-wide run -> `outputs/geo_audit_20260829.json`: 13 outside-district points (problem #17), 2 businesses with `[0,0]` geoLocation (problem #16), 1 business on an inactive location, 0 stale business fields, 0 `[0,0]` masterlocations |
| 2026-08-29 | **#13 index resolved without a manual write.** [app.js:207](server/app.js:207) calls `mongoose.connect(MONGO_URI)` with no options, so `autoIndex` defaults to true and the declared `gmaps_leads` text index builds on next server start. Dev confirmed to have no conflicting text index. Flagged for prod: MongoDB permits only one text index per collection |
| 2026-08-29 | **Fleet-wide `[0,0]` cleanup — WRITES TO DEV.** `scripts/fixZeroZeroCoordinates.js --apply` cleared 2,825 literal Null Island points across 13 districts (see Other districts section above), snapshot `2026-08-29_10-31-12__pre-zero-zero-coordinate-fix`. Verified 0 remain DB-wide |
| 2026-08-29 | **Thanjavur coordinate fill — WRITES TO DEV.** Picked as the second district (931 linked businesses, highest payoff, 0 landmines). `matchGeoNamesCoordinates.js` +27 localities, `backfillMasterLocationCoordinates.js --levels=ward,zone,district --min-parent-coverage=0.5` +4 parents. Locality coverage 23.9%→29.0%. Of the 62 location slugs carrying its 931 businesses, only 11 (14 biz) remain uncovered — effectively done for search purposes. Two whole-collection snapshots taken (script default scope) |
| 2026-08-29 | **Tirunelveli district doc reactivated — WRITES TO DEV.** Single-doc `isActive:true` flip; it was the only inactive district doc of 37, silently narrowing "tirunelveli" searches to just the Tirunelveli zone. Snapshot `2026-08-29_10-49-03__pre-tirunelveli-district-reactivate` |
| 2026-08-29 | **Tirunelveli business masterLocation resync — WRITES TO DEV.** New `scripts/resyncBusinessMasterLocationFields.js` fixed 184 businesses carrying stale cached `slug`/`zone`/`ward` after Palayamkottai was restructured from a ward into its own zone — `backfillBusinessMasterLocations.js`'s `sameLink()` guard never catches this class of drift since it only compares `locationId`. Snapshot `2026-08-29_10-51-52__pre-masterlocation-field-resync`. Then `backfillBusinessMasterLocations.js --force --apply` relinked 33 more businesses off the deactivated old Palayamkottai ward doc and cleared 10 unrelated stale links, snapshot `2026-08-29_10-52-37__pre-tirunelveli-business-selfheal` |
| 2026-08-29 | **Tirunelveli coordinate fill — WRITES TO DEV.** `matchGeoNamesCoordinates.js` +13 localities, `backfillMasterLocationCoordinates.js --levels=ward,zone,district --min-parent-coverage=0.5` +6 parents. Locality coverage to 10.2%. After both bug fixes above, only 6 of 33 real business-linked locations (78 of 627 businesses) still lack a coordinate — left as a known small gap, same call as Thanjavur's residual 11 |
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
