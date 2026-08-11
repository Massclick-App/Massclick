# S3 Key Restructure — Progress

**Last updated:** 2026-08-11 by Claude · **Active runId:** none
**Current step:** 0.1 · **Status:** ⏸ AWAITING USER REVIEW of the baseline below (gate)
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
| 0.1 | **`scan` both DBs — read-only, first thing** | ⏸ AWAITING REVIEW | baseline recorded below · `_migrations/s3-key-restructure/scan-2026-08-11-*.json` |
| 0.2 | S3 versioning + access logging | ✅ **DONE** | versioning `Enabled`, logging on its own bucket, noncurrent-90d lifecycle — all verified 2026-08-11 |
| 0.3 | `setByPath` array fix + extract shared utils | ✅ DONE | `node server/scripts/verifyS3KeyUtils.js` → 31/31 green |
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

## 0.2 — S3 bucket controls

The IAM user `Muruganantham` was granted read-only bucket-config permissions
(`GetBucketVersioning`, `GetBucketLogging`, `GetLifecycleConfiguration`, `ListAllMyBuckets`) on
2026-08-11, so this is now machine-verifiable rather than taken on trust. It deliberately holds **no**
write permission on bucket settings — the irreversible switches stay on the user's side of the gate.

Re-verify at any time (no AWS CLI on this machine; the SDK reads the same API):

```bash
node -e "const A=require('aws-sdk');require('dotenv').config({path:'server/.env'});A.config.update({accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY,region:process.env.AWS_REGION});new A.S3().getBucketVersioning({Bucket:'massclickdev'}).promise().then(r=>console.log(r))"
```

| Control | State | Verified |
|---|---|---|
| **Bucket versioning** | **`Enabled`** | ✅ `getBucketVersioning` → `{Status:"Enabled"}` |
| Server access logging | → `massclick-access-logs`, prefix `""` | ✅ `getBucketLogging` |
| Lifecycle — `massclickdev` | `expire-noncurrent-90d` | ✅ read back after apply, see below |
| Lifecycle — `massclick-access-logs` | `expire-logs-90d` | ✅ read back after apply |

**Risk 5 is retired.** Every delete is now a delete-marker and the sweep is reversible in minutes.

### The lifecycle rule on `massclickdev`, and why it was applied by API

```json
{ "ID": "expire-noncurrent-90d", "Status": "Enabled", "Filter": { "Prefix": "" },
  "NoncurrentVersionExpiration": { "NoncurrentDays": 90 },
  "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 } }
```

Applied via `putBucketLifecycleConfiguration`, not the console, deliberately: in the console UI
*"Expire current versions of objects"* sits directly beside *"Permanently delete noncurrent versions"*
and reads almost identically — and the first one deletes the live images on a timer. Sending explicit
JSON means the destructive option is **absent**, not merely unticked. Read back after applying:

```
rules expiring CURRENT versions: 0
```

**Any future edit to this rule must re-assert that count is 0.**

**Bonus the plan did not assume:** noncurrent versions survive 90 days, so `undelete` works for **90
days after the sweep**, not the 30 the soak plan implies.

### Access logging — resolved, but note the failure mode

Logging was initially pointed at **`massclickdev` itself** (the account had only one bucket). Beyond the
feedback loop, that **corrupts this migration's own accounting**: log objects land inside the bucket
`scan` reconciles, so they would count as unreferenced, inflate the orphan number, bloat the pre-sweep
download, and look to `sweep` like deletable keys. Caught at **0 delivered log objects**; now targets
`massclick-access-logs`.

**If logging is ever repointed at the asset bucket, `scan`/`plan`/`sweep` must exclude the log prefix
explicitly** — do not rely on it being empty.

The two rules are deliberately **inverted**, and a future editor must keep them that way:

```
massclickdev            noncurrent: 90d    current: none    <- live images must NEVER expire
massclick-access-logs   noncurrent: none   current: 90d     <- logs are unversioned
```

### IAM stance — least privilege is load-bearing here, not ceremony

Granted: read-only bucket-config on both buckets, `ListAllMyBuckets`, `PutLifecycleConfiguration` on
both. The user offered broader access; it was **declined on purpose**. Nothing more is needed until S.3.

Everything between here and the end of Track B — rehearsals, `copy`, `verify-s3`, the full download,
both rewrites — runs on the existing application credentials, which already have object read/write.

Request at S.3, **not before**:

- `s3:DeleteObject` — `sweep`
- `s3:ListBucketVersions`, `s3:GetObjectVersion`, `s3:DeleteObjectVersion` — `undelete`

Never request:

- `s3:PutBucketVersioning` — could switch off the control the entire rollback story rests on.

**The reasoning is about bugs, not intentions.** "Do NOT do" rule 2 says delete nothing before the
30-day soak. The sweep code will be new, unrehearsed against 36k real objects, and running at the point
where everyone has stopped paying close attention. A policy that *cannot* delete enforces that rule even
against a bad loop or a misread manifest. Do not pre-grant these to save a round trip.

---

## 0.3 — shared key utils, three bugs fixed

`server/utils/s3KeyUtils.js` is now the only copy of `extractS3Key` / `getByPath` / `setByPath` /
`isWebpKey` / `toWebpKey`. Repointed: `s3WebpMigrationHelper.js`, `businessWebpMigrationHelper.js`,
`categoryHelper.js`, and `s3KeyMigration.js` (which carried a fourth copy from 0.1).

**Gate:** `node server/scripts/verifyS3KeyUtils.js` → **31/31 green**. Reads nothing, writes nothing.
Re-run it after any change to the utils.

The plan expected one bug here. There were three.

### Bug 1 — `setByPath` collapsed arrays into objects (the known one)

Missing path segments were created as `{}`, so `"mediaItems.0.mediaKey"` produced
`{ mediaItems: { "0": {…} } }`. Fixed: a missing segment whose *next* segment is numeric is created as
`[]`, and an existing container is never replaced.

### Bug 2 — `extractS3Key` stripped a repeated base URL only once (found in 0.1)

Real data has the base prepended up to four times; one pass returned a still-doubled string that matched
no object. Now strips until stable (bounded at 8), and normalises a leading `/` — no S3 key has one.

### Bug 3 — `$set` was replacing whole subdocuments. **THIS ONE HAS ALREADY FIRED.**

All three helpers built their update document with `setByPath`, so a change to `qrCode.qrImageKey`
became `$set: { qrCode: { qrImageKey } }` — which **replaces the entire `qrCode` subdocument**,
discarding `qrText` and `createdAt`.

Measured on live data, not inferred:

```
massClick       qrCode.qrImageKey 7,294   missing qrText 4,442   missing createdAt 4,442
massClick_dev   qrCode.qrImageKey 6,881   missing qrText 4,443   missing createdAt 4,443

cross-tab, massClick:
  webp  + no qrText   4,442      <- every single loss is a webp key
  webp  + has qrText  1,558
  other + no qrText       0      <- no non-webp document lost anything
```

Zero losses among non-webp keys is conclusive: the WebP migration did this.

Fixed by `setUpdatePath(updates, path, value)` → `updates[path] = value`, giving
`$set: { "qrCode.qrImageKey": k }`, which touches only the leaf. This also makes
`$set: { "mediaItems.0.mediaKey": k }` correct, so it fixes bug 1 at the call sites too.

**The damage is bounded and self-healing.** `qrText` is derived, not user-entered —
`buildReviewUrl(business)` at [businessListHelper.js:112](server/helper/businessList/businessListHelper.js:112).
`ensureReviewQrCode` compares stored `qrText` against the expected value, so a missing one triggers
regeneration on next view, which rewrites all three fields and re-uploads to the **same deterministic
key** (no orphan). Only `createdAt` is unrecoverable, and it is decorative.

**Open decision for the user:** whether to repair the 4,442 + 4,443 documents in a single pass rather
than waiting for each business to be viewed. It is a DB write, so it needs a scoped backup first and is
listed as open question 4 below. Not urgent, and **not** a blocker for anything else in Phase 0.

### One behaviour change worth knowing

`categoryHelper` previously stored `""` when a URL failed to parse; the shared helper returns the raw
value instead, because a shared utility should not silently discard data. The old behaviour is preserved
exactly where it belongs — at that write call site, via `toStorableKey()`.

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

**Get the collection list from the tool, never by hand** — the plan's hand-written list had six
non-existent names (see 0.1 finding 1):

```bash
node server/scripts/s3KeyMigration.js collections
```

Verified 2026-08-11, all 20 exist in both DBs:

```
advertisments,authormasters,businesslists,businessreviews,categories,categorydisplaysettings,
eventadvertisements,eventcategories,eventcreations,eventlocations,fcmcampaigns,job_applications,
massclick_documents,massclick_feed_posts,massclickevents,msgusers,reward_claims,
seopagecontentblogs,trackedkeywords,users
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
| 1 | S3 bucket versioning (0.2) | ✅ **RESOLVED 2026-08-11** — user enabled versioning; IAM user granted read-only bucket-config perms, so it is now verified rather than assumed |
| 1a | Access logging repointed to `massclick-access-logs`; `expire-noncurrent-90d` applied to `massclickdev` | ✅ **RESOLVED 2026-08-11** |
| 1b | Log-bucket lifecycle `expire-logs-90d` | ✅ **RESOLVED 2026-08-11** — all of 0.2 now verified |
| 2 | SSH tunnel to `127.0.0.1:27018` | ✅ **UP** — verified 2026-08-11, both DBs reachable, full scan completed over it |
| 3 | 0.1 baseline needs user review before 0.2+ proceeds | **AWAITING USER** |
| 4 | Repair the 4,442 (prod) / 4,443 (dev) businesses whose `qrCode.qrText` + `createdAt` were wiped by bug 3? Self-heals on view; a bulk repair is a DB write needing a `--collections businesslists` backup first | **USER DECISION** — not blocking |

---

## 0.1 — THE BASELINE (gate: awaiting user review)

Read-only. Nothing was written to either database or to S3. Reproduce with:

```bash
node server/scripts/s3KeyMigration.js scan --uri=<db> --compare-uri=<other> --out=<report.json>
```

Built in this step: `server/utils/s3ScopeRegistry.js` (20 collections, 47 declared fields) and the
`scan` + `collections` subcommands of `server/scripts/s3KeyMigration.js`.

### The four gate numbers

| Question | Answer | Verdict |
|---|---|---|
| **Are the two DBs clones?** | **95.68% `_id` overlap** across the 20 registry collections (10,879 shared of 11,370). Divergence is **one-directional** — prod is simply ahead. | ✅ **Yes.** Plan holds. |
| **How many references are broken today?** | **prod 45 · dev 46** — of ~31.6k / ~29.6k. **This is the baseline `verify` must match, not zero.** | ✅ Negligible |
| **Do orphans dominate?** | **4,744 objects · 582 MB · 13.0%** of the bucket unreferenced by *either* DB. | ✅ No. 87% is live. |
| **How much is a bare key vs a URL vs junk?** | **99.6% bare key**, 87 `url-ours`, 50 junk. | ✅ As assumed |

### Full baseline — 2026-08-11

```
bucket massclickdev                          36,384 objects
                                    massClick (prod)    massClick_dev
  total references                       31,789            29,738
  distinct keys                          31,635            29,601
  referenced AND present                 31,590            29,555
  referenced but MISSING                     45                46   <- pre-existing breakage
  intra-DB fan-out (1 key, N docs)           75                59
  valueShape  key                        31,652            29,603
              url-ours                       87                87
              junk                           50                48

  keys referenced by BOTH DBs            29,549
  prod-only 2,086 · dev-only 52
  referenced by either DB                31,687
  present but UNREFERENCED (orphans)      4,744   582 MB   13.0%
```

**Missing keys are concentrated, not scattered:** 51 of them are
`seopagecontentblogs.businessDetails[].bannerImage` (a denormalised copy of a business banner that was
later replaced), plus 1–2 certificate SVGs. No other collection has a single broken reference.

### `conflicts.jsonl` will be empty — measured, not assumed

The plan says a large conflict count is a stop signal. It was pre-computed rather than left to `plan`:

```
keys whose owner set differs across the two DBs:  16
  one side a strict superset (same entity)        16   <- NOT conflicts
  genuine disagreement                             0   <- the real conflicts.jsonl
```

All 16 are prod holding one *extra* reference (a newer SEO blog citing a business banner dev hasn't got).
The `(entity, entityId, purpose)` mapping agrees everywhere. **Zero cross-DB splits.** The "shared
identity is the overwhelming majority" assumption is confirmed at 100%.

Intra-DB fan-out (75 in prod) is a different thing and is expected: 68 are one business banner referenced
by both `businesslists` and a `seopagecontentblogs.businessDetails[]` entry, 7 are two blogs sharing one
banner. Each needs one newKey per owning document — 75 extra byte-copies, which is noise against 31.6k.

### Findings that change other steps

1. **The plan's backup `--collections` list is wrong — six names do not exist.** `advertistments`,
   `jobapplications`, `rewardclaims`, `massclickfeedposts`, `massclickdocuments`, `homesections`.
   The real names are `advertisments` (one 't'), `job_applications`, `reward_claims`,
   `massclick_feed_posts`, `massclick_documents`, and **there is no home-sections collection at all** —
   those cards live in `categorydisplaysettings.popularSearchCards[]` / `.topTouristPlaces[]`.
   *Never hand-type this list again:* `node server/scripts/s3KeyMigration.js collections` emits it, and
   `validateRegistry()` refuses to scan if the registry and the live DB disagree.

2. **`extractS3Key` is broken for repeatedly-prefixed URLs — a second live defect in the same helper as
   the `setByPath` bug.** [s3WebpMigrationHelper.js:226](server/helper/mediaCleanup/s3WebpMigrationHelper.js)
   strips the base URL **once**. Real data has it prepended **four times**:
   `https://<bucket>.s3.../https://<bucket>.s3.../https://<bucket>.s3.../businessList/banners/x.jpg`
   One pass leaves a still-doubled string that resolves to nothing. **Fold this fix into 0.3** alongside
   the `setByPath` extraction — same file, same commit. The scan already carries a corrected copy.

3. **`ratingPhotos` is worse than the plan assumed.** Plan 0.6 anticipated injected *keys*. Reality: all
   48–50 entries are **inline base64 data URIs** stored directly in the documents — no S3 object exists.
   0.6 must upload-and-replace, not just validate. None of them are migration input.

4. **`certificates.trustCertificateKey` has 3 rows in both DBs** despite the trust variant being
   unstarted. Worth a look during 0.6.

5. **14 declared fields have zero rows today** — `fcmcampaigns.imageUrl`, `job_applications.resumeKey`,
   `reward_claims.evidenceFiles[].key`, `trackedkeywords.history[].screenshotKey`, all `thumbnailKey`s,
   `massclick_documents.mediaItems/videoLinks/imageLinks`, `categories.liveImageKey`,
   `advertisments.appBannerImageKey`, `authormasters.profileImage`, `businessreviews.userProfileImage`.
   They are declared in the registry anyway so a row appearing before the run is not silently skipped.
   **Consequence: `evidenceFiles[]` and `history[]` will have no live coverage during the rehearsals** —
   the `arrayOfObjects` kind gets exercised by `mediaItems[]`, `businessDetails[]` and the two
   `categorydisplaysettings` arrays instead.

### What this baseline does NOT cover

- Orphan counts are "unreferenced by either **database**". Per the plan's own rule, that is *not* the
  same as unreferenced — printed QR codes, emailed certificates and prerendered HTML are not in Mongo.
  Nothing here licenses a delete.
- `businessList/qr` is the largest orphan prefix (1,812 objects, 38% of all orphans) — consistent with
  [businessListHelper.js:141](server/helper/businessList/businessListHelper.js:141) appending a timestamp
  to the profile QR and orphaning one object per regeneration, which 1.4 fixes. **These are exactly the
  objects most likely to be referenced by something printed.**

---

## Session log

| Date | What happened |
|---|---|
| 2026-08-11 | **0.3 done, gate green (31/31).** Extracted `server/utils/s3KeyUtils.js` as the single copy and repointed all four callers. Found **three** bugs where the plan expected one — and bug 3 had already fired: building the `$set` payload with `setByPath` meant `$set: {qrCode:{qrImageKey}}` replaced the whole subdocument, wiping `qrText` and `createdAt` on **4,442 prod / 4,443 dev** businesses. Proven by cross-tab: every loss is a `.webp` key, zero losses among non-webp. Damage is bounded — `qrText` is derived and self-heals on next view against a deterministic key. Bulk repair left as a user decision (open question 4). |
| 2026-08-11 | **0.2 complete.** Access logging repointed off the asset bucket onto `massclick-access-logs` (caught at 0 delivered logs, before it could contaminate the orphan accounting). Applied `expire-noncurrent-90d` to `massclickdev` by API rather than console — explicit JSON means the "expire current versions" footgun is absent rather than unticked — and read it back: `rules expiring CURRENT versions: 0`. Side effect worth knowing: `undelete` now works for 90 days after the sweep, not 30. Log-bucket lifecycle still needs one IAM ARN. |
| 2026-08-11 | **0.2 gate met.** User enabled bucket versioning and granted the IAM user read-only bucket-config permissions, so `getBucketVersioning` → `{Status:"Enabled"}` is now verified from this machine instead of taken on trust. Risk 5 retired; the sweep is reversible. Two follow-ups left with the user: access logging currently targets `massclickdev` itself (would contaminate the migration's own orphan accounting — caught at 0 delivered logs), and no lifecycle rule exists yet. Neither blocks 0.3. |
| 2026-08-11 | **0.1 done, awaiting review.** Verified the tunnel. Built `server/utils/s3ScopeRegistry.js` (20 collections / 47 fields / new `arrayOfObjects` kind) and the read-only `scan` + `collections` subcommands of `server/scripts/s3KeyMigration.js`. Scanned both DBs against the live bucket. **Gate result: DBs are clones (95.68% `_id` overlap, one-directional), 45/46 pre-existing broken refs, 13% orphans, 0 genuine cross-DB conflicts — the plan holds unchanged.** Found two things the plan had wrong: six non-existent collection names in the backup list, and a second live defect in `extractS3Key` (strips a repeated base URL only once; real data has it 4×) to fold into 0.3. `ratingPhotos` turns out to be inline base64, not injected keys — 0.6 grows. |
| 2026-08-11 | Plan written and approved. Explored bucket (36,187 objects / 1,774 MB), mapped all S3 fields across ~20 schemas, verified 4 latent defects: `setByPath` array corruption in 3 shipped helpers, unvalidated `ratingPhotos` write, 15 hardcoded dev-bucket URLs, stale S3 backup (June, 63 failures). Progress file created and committed (`b30e02e8`). Started 0.1 — confirmed model/schema layout, no code written. Session ended here. |
