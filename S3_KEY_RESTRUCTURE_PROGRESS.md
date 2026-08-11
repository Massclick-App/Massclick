# S3 Key Restructure — Progress

**Last updated:** 2026-08-11 by Claude · **Active runId:** none
**Current step:** 0.1 · **Status:** IN PROGRESS — registry not yet written, no code committed for 0.1
**Plan:** `C:\Users\USER\.claude\plans\give-me-a-full-serene-whisper.md`

---

## ⚠️ READ THIS FIRST — verify before trusting anything below

This file is written by hand and can be stale or wrong. **The system is authoritative:**

```bash
node server/scripts/s3KeyMigration.js status --run=<runId>
node server/scripts/s3KeyMigration.js doctor --run=<runId>
node db-backups/list.js
```

If those disagree with this file, **they are right**. Fix the file, don't fix the system to match it.

The monitoring card in **Admin → System Settings** reads the same job document as `status`.
If it shows **⚠️ Worker not responding**, the run is dead — run `doctor`, then `resume`.

---

## What this project is

The `massclickdev` bucket holds **36,187 objects / 1,774 MB** with no coherent key structure: three
colliding naming conventions, duplicate trees (`event/` vs `massclick-events/`), arbitrary depth, and
**34,000+ objects with no owning entity id** — so orphans are undetectable and entity deletion cannot
cascade. Target scheme:

```
{entity-plural}/{entityId}/{purpose}/{ulid}.{ext}
```

with deterministic (timestamp-free) keys for regenerable singletons — logo, avatar, QR codes — so
regeneration overwrites instead of orphaning.

### The constraint that shapes everything

**Prod and dev share one bucket (`massclickdev`) and one set of images. Dev's database is a copy of
prod's.** Two databases (`massClick`, `massClick_dev`) over the same SSH tunnel at `127.0.0.1:27018`.

Renaming an object breaks the *other* database's references — hence **copy, never move**. At every
instant both key sets resolve, so prod keeps working on old keys while dev runs on new ones.

Because dev is a clone, **the dev rewrite is a full-scale rehearsal of the prod rewrite** — same
objects, same field shapes, same volume.

---

## Decisions (append-only — never edit or delete a past entry)

| Date | Decision | By |
|---|---|---|
| 2026-08-11 | **Full backfill** of all 36,187 existing objects + DB rewrite — not forward-only | user |
| 2026-08-11 | **Prod and dev share bucket `massclickdev`**; dev DB is a copy of prod; images are shared | user |
| 2026-08-11 | **CLI runner**, dry-run by default, `--commit` to write | user |
| 2026-08-11 | Phase 0 **also fixes the 15 hardcoded `massclickdev` URL literals** | user |
| 2026-08-11 | **All prep finished first**; the run is triggered on demand, not on a fixed date | user |
| 2026-08-11 | **Monitoring via a System Settings card** — read-only + pause/cancel, never start | user |

---

## Track A — preparation (running now, no fixed date)

| # | Step | Status | Gate / evidence |
|---|---|---|---|
| 0.0 | Create this progress file | ✅ DONE | commit `b30e02e8` |
| 0.1 | **`scan` both DBs — read-only, first thing** | 🔄 IN PROGRESS | baseline recorded; **replan if DBs diverged or orphans dominate** |
| 0.2 | S3 versioning + access logging | ⬜ **USER ACTION** | `get-bucket-versioning` → `Enabled` |
| 0.3 | `setByPath` array fix + extract shared utils | ⬜ | array round-trip fixture passes |
| 0.4 | `assetUrl` cache-buster | ⬜ | real-browser warm-cache test |
| 0.5 | Base-URL extraction (15 literals) | ⬜ | smoke clean both envs |
| 0.6 | `ratingPhotos` fix + quarantine | ⬜ | quarantine report reviewed |
| 0.7 | `flush-caches` incl. prerender purge | ⬜ | prerendered page reflects a changed image |
| 0.8 | Deploy 0.3–0.7 dev → prod | ⬜ | smoke clean; **all 9 risks retired** |
| 1.1–1.4 | Registry, idGen, enforcement, ~50 call sites | ⬜ | lint gate passes |
| 1.5 | Deploy Phase 1 dev → prod | ⬜ | smoke clean; **new uploads now canonical** |
| 2.1–2.2 | Scope registry + `s3KeyMigration.js` (reverse/resume/doctor) | ⬜ | — |
| 2.3 | Monitoring card + 5 admin endpoints (no `/start`) | ⬜ | stale lease shows the warning, not progress |
| 3 | **Rehearsal: `advertisements/`** + SIGKILL ×2 + tunnel drop | ⬜ | reverse proven · resume proven · card proven |
| 4 | **Rehearsal: `category/`** full cycle | ⬜ | smoke + UI clean |

**End of Track A = "ready to run".** Nothing further happens until the user triggers it.

## The night before the run

| # | Step | Status | Gate |
|---|---|---|---|
| N.1 | Fresh full S3 download (~65+ min, unattended) | ⬜ | `failures === 0` and `downloaded + skipped === totalObjects` |
| N.2 | `plan` — full manifest | ⬜ | `conflicts.jsonl` reviewed — **expect near-empty** |

## Track B — the run window (~4–6 h, on demand)

| # | Step | Status | Gate |
|---|---|---|---|
| R.1 | Snapshot both DBs | ⬜ | checksums verified, counts match live |
| R.2 | `copy --commit` (~45–90 min) | ⬜ | `verify-s3` 100%; **old keys all still present** |
| R.3 | `rewrite --uri=<dev> --commit` | ⬜ | — |
| R.4 | `flush-caches` + prerender purge (dev) | ⬜ | — |
| R.5 | `verify` + smoke diff + manual UI (dev) | ⬜ | **diff empty; miss count equals the 0.1 baseline, not zero** |
| R.6 | Soak dev on real traffic (2–4 h) | ⬜ | no image reports; no 404 spike |
| R.7 | `rewrite --uri=<prod> --commit` | ⬜ | — |
| R.8 | `flush-caches` + prerender purge (prod) | ⬜ | — |
| R.9 | `verify` + smoke + manual UI (prod) | ⬜ | diff empty |

**Run ends here. Nothing has been deleted.** Rollback is `reverse` and takes minutes.

## Later — not part of the run

| # | Step | When | Status |
|---|---|---|---|
| S.1 | **SOAK — nothing deleted** | 30 days | ⬜ |
| S.2 | Fresh S3 download + `pre-s3-key-sweep` snapshot | day 30 | ⬜ |
| S.3 | `sweep --commit` (excludes orphans) | ~15 min | ⬜ |
| S.4 | Orphan review | ≥30 days after S.3 | ⬜ |

---

## Active run

```
runId:     none
phase:     —
scope:     —
manifest:  —
lease:     —
last stop: —
```

---

## Backups taken

| Date | Target | Label | Path | Verified |
|---|---|---|---|---|
| — | — | — | — | — |

Command form (always scope with `--collections`; `--prod` is mandatory for db `massClick`):

```bash
node db-backups/backup.js --db <name> [--prod] --collections <a,b> --label <slug> --reason "<why>"
```

---

## ⛔ Do NOT do — ordering rules a fresh session will otherwise break

These four look like harmless optimisations from cold. They are not.

1. **Do not reorder Phase 1 after the migration.** The path registry must ship *before* `plan` runs, so
   new uploads already land on canonical keys and fall outside the manifest.
2. **Do not delete anything before the 30-day soak** — including anything that looks obviously orphaned.
   "No DB row references it" ≠ "nothing references it": emailed certificates, indexed pages, prerendered
   HTML and **printed QR codes** all point at objects the database has forgotten.
3. **Do not rewrite prod until dev has passed R.5 and soaked through R.6.** Two separate invocations,
   two separate snapshots — never one command against both databases.
4. **Do not re-run `plan` on an existing runId.** ULIDs are generated once and persisted; re-planning
   invalidates every logged copy. A new plan means a new runId.

Also: **never `move`.** Copy, verify, rewrite, soak, then sweep. The bucket is shared.

---

## Open questions / blockers

| # | Item | Status |
|---|---|---|
| 1 | S3 bucket versioning (0.2) needs AWS console access — no AWS CLI on this machine, and the current IAM user (`arn:aws:iam::647066518489:user/Muruganantham`) lacks `s3:ListAllMyBuckets` | **BLOCKED ON USER** |
| 2 | SSH tunnel to `127.0.0.1:27018` — status unverified. `scan` (0.1) cannot run without it. `ECONNREFUSED` means ask the user to reconnect | **UNVERIFIED** |

---

## Where 0.1 stands (for whoever picks this up)

**No code written yet.** Established so far:

- Mongoose **schemas** live in `server/schema/**`; **models** in `server/model/**` are thin wrappers. The
  registry must import from `server/model/**`.
- The existing registry to copy the shape from is `SUPPORTED_SCOPES` at
  [s3WebpMigrationHelper.js:44-202](server/helper/mediaCleanup/s3WebpMigrationHelper.js) — entries carry
  `{scopeKey, scopeLabel, folderPrefix, progressKey, projection, buildQuery, model, fields[{path,kind}], invalidate[]}`.
  It covers only 6 scopes and its `kind` taxonomy is `single | array | object`.
- **It needs a fourth kind, `arrayOfObjects` (with an `itemPath`)**, which nothing in the repo has today.
  Required for `certificates.*`, `businessDetails[].bannerImageKey`, `mediaItems[].mediaKey`,
  `evidenceFiles[].key`, `popularSearchCards[].imageKey`, `topTouristPlaces[].imageKey`,
  `history[].screenshotKey`.
- Collection names must be confirmed against `db.getCollectionNames()` before use — mongoose
  pluralisation of `advertistment` (sic) and the msg91 models is not obvious.

**Next action:** build the registry covering all ~20 collections, then the read-only `scan` subcommand.

---

## Session log

| Date | What happened |
|---|---|
| 2026-08-11 | Plan written and approved. Explored bucket (36,187 objects / 1,774 MB), mapped all S3 fields across ~20 schemas, verified 4 latent defects: `setByPath` array corruption in 3 shipped helpers, unvalidated `ratingPhotos` write, 15 hardcoded dev-bucket URLs, stale S3 backup (June, 63 failures). Progress file created and committed (`b30e02e8`). Started 0.1 — confirmed model/schema layout, no code written. Session ended here. |
