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

Last run: 0 `[0,0]` masterlocations · 11 outside-district (all ≤9.85km border noise) · 226
far-from-parent · 216 thin evidence · 352 suspect duplicate points · 0 stale business fields ·
1 business on an inactive location · 0 `[0,0]` businesses.

## Open items, in the order I'd take them

**1. Two wrong business coordinates (needs a decision, then a small write)**

- `N K International` (Pudukkottai, live) — street says "SIPCOT, Pudukkottai", pincode 622002, but
  its `geoLocation` is **Hosur's** SIPCOT in Krishnagiri, ~240km off. The masterlocation it poisoned
  is already cleared. Precedent: `repairTrichyBadBusinessCoordinates.js` fell bad points back to the
  linked masterlocation.
- `Maxivision Super Speciality Eye Hospitals trichy` — exists **twice**. One copy is correctly linked
  to Trichy `Thillai Nagar Main`. The duplicate is linked to Salem `Central Salem > Thillainagar`
  with **`source: "manual"`**, despite `location: Trichy`, `street: thillai nagar`, pincode 620018.
  Its coordinate is also wrong (`76.68` where Trichy is `78.68`). **Deliberately untouched** — no
  script here overrides a `manual`/`owner-selected` link. I need to decide: misclick between two
  same-named localities, and should the duplicate record exist at all?

**2. Two long-standing Trichy records (need my answer, not code)**

- `Kathalur` — filed under `K. Abishekapuram > Sastri Road` but the real place is ~2.7km into
  Pudukkottai near Iluppur/Panjappur. Needs re-parenting or deactivating.
- `Subramaniapuram` — one point `78.701372, 10.787608` given to two different localities in two
  different zones (`Golden Rock > Ponmalai East` and `K. Abishekapuram > Subramaniapuram`). Both are
  written and locked. Which one owns it?

**3. Lower value, only if I ask**

- 352 suspect duplicate points DB-wide — including one point carried by **14** different Thuraiyur
  localities (one geocode reused).
- 216 thin-evidence points (`low` confidence or `derivedFromCount <= 2`). This class caused both
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
M SEARCH_GEO_PROGRESS.md
M server/schema/businessList/businessListSchema.js   (13 insertions, 2 deletions — clean)
```

Everything else is pushed. `server/scripts/` and `outputs/` are gitignored, so the scripts below and
the audit JSON won't show in `git status`.

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
