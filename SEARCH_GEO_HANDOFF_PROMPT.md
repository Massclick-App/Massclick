# Search geo — handoff prompt

Paste everything below the line into a fresh session.

---

We're continuing the MassClick search geo quality work.

Repo: `D:\dev_abishek\massclick`
Dev DB only: `massClick_dev`, through the `massclick-mongodb` SSH tunnel on `127.0.0.1:27019`.
Start/check the tunnel with:

```bash
ssh -f -N -o ServerAliveInterval=30 massclick-mongodb
```

It drops often — that's normal, just re-run. Connection string is `DEV_URI` in
`D:\dev_abishek\db-backups\backup.js`. Port **27019**, never 27018.

## Rules

- Never touch prod `massClick` unless I explicitly say "prod" and confirm.
- Snapshot before any DB write using `D:\dev_abishek\db-backups\backup.js`, scoped with
  `--collections` and `--query` to just what the task touches. Never whole-DB backups.
- Never pipe the backup command; a pipe can swallow the exit code and let the write run anyway.
- Prefer scripts that snapshot themselves.
- Don't run `npm run build` unless I ask.
- Ask before broad repo searches.
- Fresh Google Geocoding API calls need my explicit go-ahead every time. I've declined twice.

## Read first

- `SEARCH_GEO_PROGRESS.md` — the living tracker. Status, 18-problem register, changelog, rollback.
- `SEARCH_GEO_STRATEGY.md` — how search works in code, and why.
- `TRICHY_GEO_AUDIT.md` — the original read-only audit (Trichy-specific, partly superseded).

## Where things stand

**The original plan's execution order is COMPLETE.** Three districts done (Trichy, Thanjavur,
Tirunelveli), the ranker/telemetry/boundary work is code-complete and **pushed**, and the audit
script — the last unchecked line — is built. What remains are findings, not plan items.

**Start by running the audit.** It's read-only, has no `--apply`, and tells you what has rotted
since 2026-08-29 rather than making you re-derive it:

```bash
node server/scripts/auditMasterLocationCoordinates.js --top=15 --json=outputs/geo_audit_$(date +%Y%m%d).json
```

Last status check after the 2026-08-31 C-lite eight-record cleanup: 0 `[0,0]` masterlocations ·
8 outside-district (all remaining items are ≤5.51km border/boundary cases) · 222 far-from-parent ·
209 thin evidence · 349 suspect duplicate points · 0 inactive district docs ·
0 stale business fields · 0 businesses on an inactive location after the five-decision apply ·
0 `[0,0]` businesses.

## Resolved items applied on 2026-08-31

Scoped snapshots were taken first:
`2026-08-31_06-13-41__pre-search-geo-five-decision-masterlocations` and
`2026-08-31_06-13-48__pre-search-geo-five-decision-businesses`. Follow-up snapshot before the
approved `Sipcot-pdk` coordinate: `2026-08-31_06-24-59__pre-sipcot-pdk-coordinate`.
Second C-lite cleanup snapshots: `2026-08-31_06-44-45__pre-search-geo-c-lite-eight-masterlocations`
and `2026-08-31_06-44-47__pre-search-geo-c-lite-eight-businesses`.

**1. Wrong business coordinates / duplicate cleanup**

- `N K International` (Pudukkottai, live) — decision received 2026-08-31: clear/remove the existing
  Hosur/Krishnagiri business coordinate, keep the Pudukkottai SIPCOT address, and use the linked
  Pudukkottai/SIPCOT master-location coordinate as fallback. Add a new business-specific coordinate
  only after independent verification. Applied: business `geoLocation` cleared and
  `geoLocationPrecision` set to `unknown`. Follow-up applied: linked `Sipcot-pdk` now has approved,
  locked fallback coordinate `[78.785628, 10.417312]` (`lng,lat`; user supplied lat `10.417312`,
  lng `78.785628`). Pudukkottai scoped audit reports 0 outside-district points.
- `Maxivision Super Speciality Eye Hospitals trichy` — decision received 2026-08-31: keep the
  correct `Trichy > Thillai Nagar Main` record as canonical. Merge/copy any useful unique data from
  the duplicate into the canonical record, then deactivate the duplicate linked to
  `Salem > Thillainagar`; remove its Salem manual master-location link and clear its bad `76.68...`
  coordinate. Applied: canonical row marked kept and received the duplicate's Google Maps link and
  pincode-bearing address; duplicate row is `businessesLive:false`, `activeBusinesses:false`,
  `isActive:false`, with `masterLocation` and `geoLocation` cleared.
- `Nilan Construction` — decision received 2026-08-31: keep the
  `Nilan Construction -> Arisikara Street` manual link, reactivate the `Arisikara Street`
  masterlocation, and do not relink the business to another Thanjavur locality without evidence.
  Avoid leaving the business linked to an inactive location. Applied: `Arisikara Street` is active
  and approved; audit now reports 0 businesses linked to inactive locations.

**2. Two long-standing Trichy records**

- `Kathalur` — decision received 2026-08-31: remove/deactivate
  `Trichy > K. Abishekapuram > Sastri Road > Kathalur` from that hierarchy. Correct hierarchy is
  `Pudukkottai > Viralimalai Taluk > Kathalur`. Applied: Trichy row is inactive/rejected; new active
  Pudukkottai row created under existing `Viralimalai > Viralimalai Surroundings > Kathalur`, locked
  at `[78.617303, 10.635103]`, public slug `kathalur`.
- `Subramaniapuram` — decision received 2026-08-31: keep `78.701372, 10.787608` on
  `Golden Rock > Ponmalai East > Subramaniapuram`; remove/clear it from
  `K. Abishekapuram > Subramaniapuram > Subramaniapuram`, which needs its own separate coordinate.
  Applied/verified: the K. Abishekapuram row now has a separate locked coordinate
  `[78.6513468, 10.8149413]`; no duplicate point remains.

**3. C-lite audit records decided and applied**

- `Malayandipattinam` — created/used
  `Coimbatore > Anaimalai > Anaimalai > Kottur Malayandipattinam`, locked
  `[76.9828064, 10.5400649]`, relinked `Kannan Electrical and plumbing contractor`, and cleared the
  coordinate/pincode from the original Tiruppur row.
- `Vellalapalayam` — kept under `Coimbatore > Negamam > Negamam`; cleared the weak one-business
  master coordinate for later re-geocode.
- `Old Karur Road` — reparented to
  `Tiruchirappalli > K. Abishekapuram > Palakkarai North > Old Karur Road`, pincode `620002`;
  cleared the shared/generic coordinate; relinked `N.N Electronics`.
- `West Street Koppu` — reparented to
  `Tiruchirappalli > Andanallur > Ettarai > West Street Koppu`, pincode `639103`; kept and locked
  `[78.5872, 10.8415]`; relinked `Banana Merchant Trichy`.
- `Kudamuritti Check Post` — reparented to
  `Tiruchirappalli > K. Abishekapuram > Palakkarai North > Kudamuritti Check Post`, pincode
  `620002`; kept and locked `[78.6864624, 10.8391911]`; relinked `MJP Tours and Travels` and
  `Sri Ram Travels`.
- `Padaiveedu` — kept the true `Namakkal > Tiruchengodu > Padaiveedu Area > Padaiveedu` row but
  cleared its Namakkal-city point. Created
  `Namakkal > Namakkal > Namakkal Town > Kamaraj Nagar`, pincode `637002`, and relinked
  `M Square Dental Care`.
- `Kilakurichi` — reparented to
  `Thanjavur > Pattukottai Block > Pattukottai Block Area > Kilakurichi`, pincode `614015`, and
  cleared its Mannargudi/Melanatham-derived point. Created
  `Tiruvarur > Mannargudi > Mannargudi Area > Melanatham`, pincode `614015`, and relinked
  `D- tech security systems`.
- `Amaravathipudur` — created `Sivaganga > Sakkottai > Sakkottai Area`, reparented
  `Amaravathipudur` there, kept pincode `630301`, cleared the generic Karaikudi city coordinate,
  and relinked `Lakshmi Catering`.

Verification: 9 linked businesses checked, 0 stale cached `masterLocation` slugs. Audit outside
district count is now 8, down from 10.

**4. Lower value, only if I ask**

- 349 suspect duplicate points DB-wide — including one point carried by **14** different Thuraiyur
  localities (one geocode reused).
- 209 thin-evidence points (`low` confidence or `derivedFromCount <= 2`). This class caused both
  severe errors already fixed, so it's the most likely source of the next one.
- Trichy's 31 coordinate-less active wards / 582 localities, and the residual business-linked gaps
  (Thanjavur 11, Tirunelveli 6). I've already said to leave these.
- No more districts. I've said this explicitly — don't start a fourth.

## Things that will bite you

- **Coverage numbers lie if you use the naive check.** Anything built before 2026-08-29 may carry
  literal `[0,0]`. Always test `coordinates.coordinates.0 exists AND != [0,0]`. 2,825 such docs
  across 13 districts were cleared; the schema defaults are fixed on both `masterlocations` and
  `businesslists` now, so new ones shouldn't appear — but verify rather than assume.
- **`mongoose.connect` in `server/app.js` passes no options, so `autoIndex` defaults to true.** Every
  `schema.index()` builds on server start. That's how the `gmaps_leads` text index gets created
  without a manual write. Corollary: **adding a `schema.index()` in this codebase is a deploy-time DB
  write**, and MongoDB allows only one text index per collection — a second would fail the build.
- **A GeoJSON default fix must clear BOTH `type` and `coordinates`.** `{type:"Point"}` with no
  coordinates is invalid GeoJSON and the 2dsphere index rejects the entire insert. Changing only
  `coordinates` would break every new insert. Verified against a scratch collection.
- **`backfillBusinessMasterLocations.js` cannot see stale denormalized fields.** Its `sameLink()`
  guard (~line 207) compares `locationId` + `confidence` + `source` only, never the cached
  `slug`/`zone`/`ward` that search actually matches on. When a location doc's own names change in
  place, linked businesses serve stale strings forever and `--force` won't fix it. Use
  `resyncBusinessMasterLocationFields.js` for that class.
- **Several files have mixed line endings** (`businessListSchema.js`: 357 CRLF + 31 bare LF, mixed
  even within one block). Editing normalizes the whole file and turns a small change into a huge
  diff. If `git diff --check` flags "trailing whitespace" on lines you never touched, or the diff is
  far bigger than your edit, rebuild from `git show HEAD:<path>`, split on `/[^\n]*\n|[^\n]+$/` to
  preserve each line's terminator, and change only the lines you mean to.
- **Validate any new checker against data whose answer you already know.** The audit shipped with
  three bugs found this way — a missing `state` projection, a flat distance limit that should scale
  off `coordinatesMeta.radiusM`, and a wrongly-scoped `[0,0]` query that reported 2 where the truth
  was 14. All three looked like data problems.
- **A snapshot count that disagrees with the report that motivated it is a stop-and-look signal.**
  That's exactly how the 2-vs-14 bug surfaced.

## Uncommitted right now

```
 M SEARCH_GEO_HANDOFF_PROMPT.md
 M SEARCH_GEO_PROGRESS.md
?? SEARCH_GEO_STATUS_PROMPT.md
```

Everything else is pushed or already committed. `server/scripts/` and `outputs/` are gitignored, so
the scripts below and the audit JSON won't show in `git status`.

## Scripts (all dry-run by default, all `--apply` to write, all refuse prod without `--prod`)

| script | what |
|---|---|
| `auditMasterLocationCoordinates.js` | **Read-only, no `--apply`.** 10 health checks. Run this first |
| `resyncBusinessMasterLocationFields.js` | Refresh stale cached `slug`/`zone`/`ward` on businesses whose `locationId` is still right |
| `fixZeroZeroCoordinates.js` | Clear `[0,0]` landmine points, global or `--districts=` |
| `matchGeoNamesCoordinates.js` | GeoNames name match, parent-distance guarded |
| `recoverImportCoordinates.js` | **Trichy only** — recovers the dropped import coordinates. No other district has that source file |
| `backfillMasterLocationCoordinates.js` | Google-geocodes localities (paid, ask me), median-rolls parents |
| `applyManualCoordinates.js` | Reviewed CSV → locked manual points |
| `deriveLocationRadius.js` | p80 child spread → `coordinatesMeta.radiusM` |

`server/helper/location/districtBoundary.js` is the point-in-polygon helper (2km border tolerance,
published LGD boundaries vendored at `server/assets/geo/tamil_nadu_districts.geojson`). Judge "is
this coordinate wrong" against that, never against bounds derived from our own business points —
those are self-poisoning.
