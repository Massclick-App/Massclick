# Handoff prompt — paste this into a new session

```
We're continuing the MassClick search geo quality work.

Repo: D:\dev_abishek\massclick
Dev DB: massClick_dev, ONLY through the massclick-mongodb SSH tunnel on 127.0.0.1:27019.
Start it with:  ssh -f -N -o ServerAliveInterval=30 massclick-mongodb
It drops often — just re-run it, that's normal.

READ FIRST, and don't re-derive what it already records:
  SEARCH_GEO_PROGRESS.md     status, 15-problem register, rollback commands, verified facts
  SEARCH_GEO_STRATEGY.md     how search works in code + the fixes
  TRICHY_GEO_AUDIT.md        the original data audit (its §5c count is superseded)

Rules:
- Never touch prod massClick unless I say "prod" and confirm.
- Snapshot before any DB write. Run backup.js from D:\dev_abishek\db-backups,
  and never put it behind a pipe — a pipe swallows its exit code and the write
  runs anyway. That happened once. Prefer scripts that snapshot themselves.
- Don't run npm run build unless I ask.
- Ask before searching the repo broadly.

Where things stand: the Trichy coordinate fill is DONE on dev.
Localities 7.8% → 89.3%, wards 12.8% → 50%, zones 33% → 100%.
The ranker now scales its distance bands by node size and widens them for
low-confidence origins.

The next task is #7b, and it needs my decision first — see the "7b — the
synthetic wards" section in SEARCH_GEO_PROGRESS.md. Ask me about it.
```

---

## Quick orientation for whoever picks this up

**What this initiative was.** Search ranking started using distance from the searched
location (`2cba80cf`, `d74acd8f`), which exposed that `masterlocations` had almost no
coordinates — 92% of active Trichy localities were empty, so the ranker kept falling
back to guesses. Trichy Junction was the symptom that started it.

**The finding that changed the plan.** The 2026-08-25 enrichment import carried
`_lat`/`_lon` on 8,291 of its 10,128 rows and dropped them — the importer treated
`_`-prefixed keys as scratch metadata. Recovering them by `slug` was an exact join
at zero API cost. The user's instinct was to hand-enter all 5,494 localities; the
right split turned out to be automate the bulk, hand-place the ~250 nodes that are
ever used as a search *origin*.

**Scripts, all dry-run by default, all self-snapshotting on `--apply`, all refusing
prod without `--prod`** (note: `server/scripts/` is gitignored in this repo):

| script | what it does |
|---|---|
| `recoverImportCoordinates.js` | restores the dropped import coordinates |
| `applyManualCoordinates.js` | reviewed CSV → locked manual points |
| `matchGeoNamesCoordinates.js` | GeoNames, parent-distance guarded |
| `deriveLocationRadius.js` | p80 child spread → `coordinatesMeta.radiusM` |
| `disableTrichyNoiseRound5.js` | address-fragment localities |
| `createTiruverumburZone.js` | one-off, the missing zone doc |
| `helper/location/districtBoundary.js` | point-in-polygon (not a script — the shared guard) |

**Three things not to relearn the hard way:**

1. **Never judge a coordinate against bounds derived from your own data.** The
   business-derived `districtGuards` in `backfillMasterLocationCoordinates.js` had
   been widened to `minLng 77.684` *by the four bad points at 77.70*, so it cleared
   them while flagging real northern-Trichy places. Use `isPointInDistrict()`.
2. **Keep the 2km border tolerance.** Simplified polygons put border villages on the
   wrong side — Nazareth Rd 0.37km out, Kunnathur 0.28km in, 0.67km apart. And the
   Trichy polygon legitimately contains a 2.4×2.7km Pudukkottai enclave at
   `[78.569, 10.697]`; the second ring is a hole, not a bug.
3. **Distance bands need a clamped base.** Scaling straight off `radiusM` gave Musiri
   `[19.8, 49.5, 99, 198]km`, which collapses every result into band 0. Base is
   clamped to 0.5–6km with multipliers `[1, 2, 4, 8]`.

**Open, needing the user:**
- **#7b** — 47 template-name wards (`Adi Dravidar Colony` ×7, `Anna Nagar` ×6…) with
  **zero businesses between them**, 1–2 generic children each, all sharing their
  taluk's pincode, all seeded 2026-07-10. Almost certainly generated scaffold. Ward
  coverage goes 50% → ~90% if they're disabled. Not an automated call.
- **`Kathalur`** — a hierarchy bug, not a coordinate bug. Filed under
  `K. Abishekapuram > Sastri Road`, actually ~2.7km into Pudukkottai. Re-parent or
  deactivate.
- **`Subramaniapuram`** — one point (`78.701372, 10.787608`) given to two different
  localities in two different zones.

**Then, in order:** #15 admin map picker (so coordinates can be fixed without a
script), #11/#12 business geo quality (345+ Trichy businesses share an exact
coordinate; 410 sit outside the district), #14 search-origin telemetry
(`logsearches.masterLocationSlug` is empty on every row, so nothing shows which
searches fall back to the gmaps scan).
