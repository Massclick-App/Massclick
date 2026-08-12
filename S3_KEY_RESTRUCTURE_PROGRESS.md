# S3 Key Restructure — Progress

**Last updated:** 2026-08-12 by Claude · **Active runId:** none
**Current step:** 1.5 · **Status:** Phase 0 COMPLETE and deployed to dev+prod · **1.1–1.4 ALL DONE** ·
**1.5 (deploy Phase 1 dev → prod) is the next action — nothing in Phase 1 has been deployed anywhere yet**

### Everything Phase 0 + Phase 1 built — one place

Run every gate from `server/` — dotenv loads `server/.env` from cwd, so running from the
repo root throws `AWS S3 bucket not configured in env` (verified 2026-08-12):

```bash
cd server
node scripts/verifyS3KeyUtils.js                            # 0.3 gate   31/31
node scripts/verifyAssetUrl.js                               # 0.4 gate   22/22
node scripts/verifyS3ObjectKeys.js                           # 1.1+1.2    66/66
node scripts/verifyS3PathEnforcement.js                       # 1.3 a+c    23/23
node scripts/lintS3Paths.js                                   # 1.3 b + 1.4   0/0 — regression gate now, not a burndown
node scripts/s3KeyMigration.js collections                    # 0.1  registry -> backup list
node scripts/s3KeyMigration.js scan --uri=… --compare-uri=…   # 0.1  baseline
node scripts/s3KeyMigration.js flush-caches [--commit]         # 0.7
node scripts/checkPublicImageUrls.js --api=… [--compare=…]     # 0.5  no-broken-images
node scripts/fixRatingPhotos.js --uri=… [--commit]              # 0.6  data repair
```

**S3_PATH_MODE now defaults to `strict`** (server/s3Uploder.js) — a non-canonical upload
path throws instead of warning. `S3_PATH_MODE=warn` is still available as an emergency
override, but the normal path is closed.

New modules: `utils/s3ScopeRegistry.js` · `utils/s3KeyUtils.js` · `utils/assetUrl.js` · `utils/s3ObjectKeys.js` · `utils/idGen.js`
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
| 0.4 | `assetUrl` cache-buster | 🟡 CODE DONE | `verifyAssetUrl.js` 22/22 · **warm-cache browser check outstanding (user)** |
| 0.5 | Base-URL extraction (15 literals) | ✅ DONE | 15 → 0 · `checkPublicImageUrls.js` dev diff clean (exit 0) |
| 0.6 | `ratingPhotos` fix + quarantine | ✅ **DONE** | write path fixed · **prod repaired 2026-08-12**, 50 photos uploaded, 11.30 MB → ~0 MB, live API verified |
| 0.7 | `flush-caches` incl. prerender purge | ✅ DONE | proven on real Redis: 62→6→0 · **found + fixed a live invalidation gap** · risk 6 retired by non-existence |
| 0.8 | Deploy 0.3–0.7 dev → prod | 🟡 DEV DONE | dev `e24522c6` verified: flush ok, image diff **NEWLY broken 0** · **needs redeploy for `fb515f29`** · prod untouched |
| 1.1 | `s3ObjectKeys.js` path registry | ✅ DONE | `verifyS3ObjectKeys.js` → 66/66 |
| 1.2 | `idGen.js` ULID | ✅ DONE | same gate |
| 1.3 | Enforcement: chokepoint + lint + `deleteEntityAssets` | ✅ **DONE, STRICT** | `verifyS3PathEnforcement.js` 23/23 · `lintS3Paths.js` 0/0 |
| 1.4 | Migrate 51 call sites across 22 files | ✅ **DONE** — all 22 files, `S3_PATH_MODE=strict` flipped | lint gate 0/0 ✅ · `S3_PATH_MODE` defaults to strict ✅ |
| 1.5 | Deploy Phase 1 dev → prod | ⬜ **NEXT** | smoke clean; **new uploads now canonical** — nothing deployed yet, code only |
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

## 0.4 — `assetUrl` cache-buster

`server/utils/assetUrl.js`. **Gate part 1:** `node server/scripts/verifyAssetUrl.js` → **22/22 green**.
**Gate part 2 is a manual browser check and is still outstanding** — see below.

### The finding that scoped this step

Of the **32 upload paths in the codebase, 31 end in `Date.now()`** — they can never be overwritten, so
they have no staleness problem. Exactly one key is deterministic today:

```
businessList/qr/review-${businessId}
```

So the one-year `max-age` is **mostly a risk Phase 1 creates**, not one that exists now — which is
precisely why 0.4 is scheduled before it. `assetUrl` was therefore built and proven in full, but wired
only to the five review-QR render paths in `businessListHelper.js`. **The remaining stable purposes get
wired in 1.4, as each becomes deterministic, enforced by the 1.3 lint gate.** Wiring all 151
`getSignedUrlByKey` call sites now would be churn against keys that cannot go stale.

The live exposure it closes: regenerating a review QR overwrites the object, so anyone holding the
cached image kept the **old QR, pointing at the old review URL, for up to a year**. 0.3 made
regeneration more frequent (the `qrText` self-heal), which raised that exposure.

### Why versioning the URL, and not just changing the header

The 36,000+ objects already in the bucket carry their stored `Cache-Control` forever. Changing
[s3Uploder.js:66](server/s3Uploder.js:66) would only affect future uploads. Versioning the URL is the
only fix that covers objects already written.

### Design notes worth not re-deriving

- **The token must be deterministic.** A token that changes per render (`Date.now()`, a random value)
  defeats caching rather than busting it.
- **Version source is `qrCode.createdAt`, falling back to the document's `updatedAt`.** `createdAt`
  changes exactly when the QR is regenerated, so unrelated edits don't needlessly bust the cache. The
  fallback exists because 0.3's bug 3 wiped `createdAt` on ~4,400 businesses. Verified on real dev data:

  ```
  createdAt present  -> …/review-695c9e34….png?v=mrx3vjo5
  createdAt wiped    -> …/review-698c20c2….webp?v=mrg8ep6x   (updatedAt fallback)
  neither available  -> …/review-x.png                        (plain, unchanged)
  ```

- **Signed URLs are never versioned.** aws-sdk v2 emits SigV2 here, which signs only the canonicalised
  resource — so an extra parameter would survive *today*. The rule still holds: SigV4 signs the whole
  query string and is the modern default, so an SDK upgrade would silently start returning
  `SignatureDoesNotMatch`. Signed URLs are unique per signature and already expire, so there is no
  staleness problem worth that risk.
- **Adopting `assetUrl` with no version is a no-op** — byte-identical to `getSignedUrlByKey`, asserted in
  the gate. Safe to adopt incrementally at a call site that has no version to hand.

### ⏳ OUTSTANDING — the warm-cache browser check (user)

This cannot be verified from Node: `curl` and `fetch` have no stale copy to be wrong about, so they
would pass whether or not the fix works. It needs a real browser that has genuinely cached the old bytes.

1. Open any business profile with a review QR. Note the `?v=` on the QR image URL.
2. Load it again — normal reload, **DevTools cache disabled OFF**. Confirm the image is served from cache
   (Network tab: "(disk cache)" / "(memory cache)").
3. Change something that regenerates the QR (edit the business so `buildReviewUrl` changes), reload.
4. **PASS:** the `?v=` token changed AND the new QR renders. **FAIL:** the old QR image persists.

Until this passes, treat 0.4 as unproven — it is the mechanism the whole deterministic-key design in
Phase 1 depends on.

---

## 0.5 — hardcoded base URLs removed, and the image checker

**15 literals → 0.** Server 9, client 6 files.

| Where | Was | Now |
|---|---|---|
| `categoryController.js` ×7 | `const S3_BASE_URL = "https://massclickdev.s3…"` | `getSignedUrlByKey(key)` — env-derived, already imported |
| `categoryDisplaySettingsController.js` ×2 | same | same |
| `imageUrlHelper.js` | hardcoded const | `ASSET_BASE_URL` from `REACT_APP_ASSET_BASE_URL`, literal as default |
| `CategoryDisplaySettings.js`, `topBanner.js` ×2, `mrpInsights.js` | inline literals | import from `imageUrlHelper` |
| `public/index.html` preconnect | hardcoded | `%REACT_APP_ASSET_BASE_URL%` |
| `ci-frontend-deploy.yml` | — | added as a repository **variable** (not a secret) |

**Two of the nine server constants were dead code** — declared at `categoryController.js` 600 and 721
and never referenced.

### The client had the same repeated-prefix bug as the server

`normalizeImageUrl` removed exactly one duplicated base URL, the same defect fixed server-side in 0.3.
Now collapses any depth. Verified against real values:

```
doubled (live prod response)   -> …/businessList/banners/banner-1766578459445.jpg
quadrupled (live DB value)     -> …/businessList/banners/banner-1768806705739.jpg
external host                  -> unchanged
```

**PROD IS SERVING A DOUBLED URL TO USERS RIGHT NOW** — `/seopagecontentblog/viewall` returns
`https://<host>/https://<host>/businessList/banners/…` for two entries. So this was never theoretical.
Note the client fix stops the *doubling*, but those two objects are also genuinely absent from the
bucket (they are in the 45/46 baseline), so they stay broken until the underlying data is fixed.

### `server/scripts/checkPublicImageUrls.js` (new)

Hits the real API, walks every JSON response for S3 references, HEADs each, reports non-200 with the
endpoint and JSON path. Read-only. Also the R.5 / R.9 before-and-after diff tool.

```bash
node server/scripts/checkPublicImageUrls.js --api=https://dev-api.massclick.in/api --out=before.json
node server/scripts/checkPublicImageUrls.js --api=... --compare=before.json     # must exit 0
```

**Results 2026-08-11** (baselines saved to `_migrations/s3-key-restructure/imgcheck-2026-08-11-*.json`):

```
dev   17/17 endpoints 2xx   632/635 assets resolve   3 broken
prod  17/17 endpoints 2xx   657/662 assets resolve   5 broken
```

Every broken asset is `seopagecontentblog.businessDetails[].bannerImage`, and all three on dev were
**verified present in the 0.1 scan's missing list** — pre-existing, not caused by this work.

**The gate is the diff, not zero.** Standalone the script exits 1 while any pre-existing breakage
remains; `--compare` against a baseline is the real check, and it was validated end-to-end:
`NEWLY broken: 0`, exit 0.

**Two endpoints are excluded because they require auth** (`/massclick-feed/posts`,
`/massclick-documents/viewall` → 401), as are the signed-URL-only résumé and reward-evidence paths.
Those are covered by `verify`'s HeadObject pass plus one manual download each — that is how risk 9 is
retired. The exclusion is documented in the script so nobody re-adds them and gets a red run.

### ✅ `REACT_APP_ASSET_BASE_URL` — done, and where each environment reads it from

This is a **build-time** variable (CRA inlines it), so where it must live depends on where the build
runs. Verified on the server 2026-08-11:

| Env | Built where | Reads the var from | State |
|---|---|---|---|
| **dev** | on the server — `/home/admin/scripts/frontend.sh dev` runs `npm run build` in `/var/www/dev-massclick/client/ui-app` | that checkout's `.env` | ✅ present |
| **prod** | in **GitHub Actions** on push to `prod`; only the compiled `build/` is rsynced to the server | `vars.REACT_APP_ASSET_BASE_URL` | ✅ set by user |

Prod is never built on the server by the CI path, so the prod checkout's `.env` is irrelevant to it —
the repository variable is the correct and only place.

**Residual gap, harmless today:** `frontend.sh prod` also exists and *would* build on the server, in
`/var/www/massclickQA`, whose `.env` has no `REACT_APP_ASSET_BASE_URL`. A prod deploy done that way
falls back to the hardcoded default in `imageUrlHelper.js`. That default is `massclickdev` — the bucket
actually in use — so nothing breaks now. **It only bites if the bucket ever changes**, which is exactly
what 0.5 exists to protect against. Closing it is a one-line addition to that checkout's `.env`.

Note the same applies to `public/index.html`'s preconnect: unlike the JS it cannot carry a fallback, so
an unset var degrades it to a no-op — images still load, the LCP head-start is lost.

---

## 0.6 — `ratingPhotos`

Two halves. **The code half is done. The data half is a DB write and is waiting on the user.**

### Write path — fixed

[reviewHelper.js](server/helper/reviewHelper/reviewHelper.js) wrote `ratingPhotos: ratingPhotos || []`
— the raw request body — into a field that is rendered as an image URL
([businessListHelper.js:1352](server/helper/businessList/businessListHelper.js:1352) maps every entry
through `getSignedUrlByKey`). It was the only unvalidated writer; the embedded-review path at
[businessListHelper.js:1062](server/helper/businessList/businessListHelper.js:1062) already did it right.

`sanitizeRatingPhotos()` now uploads base64 and keeps the key, accepts a caller-supplied string **only**
if it is a bare key already under `businessList/reviews/<businessId>/`, and drops everything else.
Caps: 10 photos per review, 5 MB each (matching the reward-claim evidence cap).

*Phase 1 note:* the prefix test is interim. Once `isCanonicalKey()` and `entityPrefix()` land in 1.1 it
becomes `isCanonicalKey(v) && v.startsWith(entityPrefix("businesses", businessId))`.

### The stored data is NOT what the plan assumed — and it is an availability risk

The plan expected injected keys. Every stored entry is an **inline base64 data URI** — real reviewer
photos that were never uploaded:

```
massClick       4 docs   50 entries   20.4 MB    all base64 (48 jpeg, 2 png)
massClick_dev   2 docs   48 entries   19.6 MB    all base64

per-document BSON size, massClick:
  6a585f04c7da42a59f09a846   11.30 MB   45 photos   71% of MongoDB's 16 MB limit
  6a33707dd6b69cb12cc48bf0    8.28 MB    3 photos   52%
  6a6c5359eee7d95aff33aeec    0.42 MB    1 photo     3%
  6a6c764beee7d95aff33f13e    0.40 MB    1 photo     2%
```

**One review document is at 71% of MongoDB's hard 16 MB per-document limit.** A few more photos and
every write to it fails with `BSONObjectTooLarge` — including `updateBusinessRatingSummary`. Every read
of that business's reviews also ships 11 MB. This is a bigger problem than the injection defect.

So the repair **uploads and replaces** rather than quarantining: quarantining would discard customer
photos, and uploading collapses those documents from megabytes to a few hundred bytes. Only entries that
are neither a valid data URI nor a key under the owning business's prefix are dropped, and every dropped
value is recorded.

### ⚠️ THE REPAIR CANNOT RUN BEFORE THE READ PATH IS DEPLOYED

Caught by the user asking whether the data repair is safe while the code is undeployed. It was not.

`getReviewsHelper` returned `ratingPhotos` **raw** — no key→URL conversion anywhere — and
[reviewCard.js:44](client/ui-app/src/Internals/clientComponent/rating/reviewCard.js:44) renders
`<img src={photo} />` directly off the stored value. So:

| stored value | old code renders | result |
|---|---|---|
| `data:image/jpeg;base64,…` | `<img src="data:…">` | works (but ships 11 MB) |
| `businessList/reviews/…webp` | `<img src="businessList/reviews/…">` | **resolved against the site origin → 404** |

Running the repair first would have 404'd every review photo on the live site.

Fixed by making the read path tolerate **both** shapes — `toPhotoUrls()` passes a `data:` URI through
untouched, passes an absolute URL through, and builds a URL from a bare key. So the page is correct
before, during and after the repair, and the repair needs no flag day and stays rollback-safe.

**Ordering rule: deploy 0.8, then run the repair.** Not the other way round.

### ⏳ USER DECISION — `server/scripts/fixRatingPhotos.js`

Dry-run reports: `_migrations/s3-key-restructure/ratingphotos-2026-08-11-*-dryrun.json`

```
massClick       4 docs   50 to upload   0 kept   0 dropped
massClick_dev   2 docs   48 to upload   0 kept   0 dropped
```

Nothing would be lost — every entry uploads cleanly, counts unchanged.

**Run PROD first, then re-clone dev.** Same reasoning as the `qrText` repair (open question 4):
repairing dev before a re-clone throws the work away. These two repairs should be done in one sitting.

```bash
node db-backups/backup.js --db massClick --prod --collections businessreviews \
  --label pre-rating-photos-quarantine --reason "0.6 ratingPhotos: upload inline base64"

node server/scripts/fixRatingPhotos.js --uri=<prod> --commit
```

The update filters on the old array value, so a second run matches zero documents. Bucket versioning is
on, so the ~50 new objects are reversible.

---

## 0.7 — `flush-caches`

```bash
node server/scripts/s3KeyMigration.js flush-caches            # dry run: what is cached
node server/scripts/s3KeyMigration.js flush-caches --commit   # clear it
node server/scripts/s3KeyMigration.js flush-caches --commit --full   # also flushDb
```

Calls every invalidator in `utils/cacheInvalidation.js` **by reflection**, not from a hardcoded list, so
one added later is picked up without editing the CLI. Verified it finds all 7:

```
invalidateAdvertisementCache · invalidateCategoryCache · invalidateCategoryDisplaySettingsCache
invalidateDashboardCache · invalidateReviewCache · invalidateSearchCache · invalidateSeoCache
```

Reports cached-key counts by prefix before and after, so a flush that silently did nothing is visible.
**If Redis is unreachable it exits non-zero and refuses to continue** — a rewrite must not proceed when
the cache cannot be purged, because a correct database behind a stale cache still serves old keys.

### ✅ PROVEN against real Redis — and it found a live gap

Run 2026-08-11 against `redis-dev` on the production box (tunnel `-L 6380:127.0.0.1:6380`, connecting by
IP so the `massclick` alias's own forwards don't collide). **`redis-prod` was deliberately not touched** —
flushing 284 live keys would cause a cache-miss burst on the real site for no reason.

```
first run:   62 keys -> 6    (cleared 56)
```

**Six keys survived, and they were not stale writes — nothing invalidated them at all:**

```
home-categories:desktop    home-categories:mobile    popular-categories:home
service-cards:home         service-cards:mobile      seo:home
```

Cause: `invalidateCategoryDisplaySettingsCache` deleted an explicit list of keys that all carried a
**`:v2` suffix**, matching what `categoryDisplaySettingsController.js` writes. But
`categoryController.js` writes the same logical caches **without** that suffix, and no pattern covered
them:

| Live key | Written by | Was cleared by |
|---|---|---|
| `home-categories:desktop` / `:mobile` | categoryController.js:159,242 | **nothing** |
| `popular-categories:home` | categoryController.js:418 | **nothing** |
| `service-cards:home` / `:mobile` | categoryController.js:542,660 | **nothing** |
| `seo:home` | — | **nothing** (`seo:*` ≠ `seo-meta:*`) |
| the `…:v2` variants | categoryDisplaySettingsController.js | ✅ the explicit list |

**Those five v1 endpoints are exactly the ones rewritten in 0.5 to emit category image URLs.** After the
key rewrite they would have kept serving OLD image URLs until their TTL expired — which is the failure
mode risk 6 exists to prevent, sitting in Redis rather than in prerendered HTML.

Fixed in `utils/cacheInvalidation.js`: added the uncovered prefixes to `invalidateCategoryCache`, added
`seo:*` to `invalidateSeoCache`, and **replaced the brittle explicit key list with patterns** so it
cannot drift again when a new suffix appears. Re-verified:

```
after the fix:  6 keys -> 0    (cleared 6)
```

**Lesson for R.4:** invalidator patterns must be checked against the keys controllers actually write,
not assumed. `flush-caches` printing a non-zero "remaining" count is the signal.

### ✅ Risk 6 retired by non-existence — prerender is not deployed

The plan says prerendered HTML escapes Redis invalidation. **Nothing puts prerender in the request path
— confirmed on the server itself, 2026-08-11:**

```
grep -rniE "prerender" /etc/nginx/     -> no matches
docker ps | grep -i prerender          -> no container
ps aux  | grep -i prerender            -> no process
```

And in the repo: `prerender-node` is a dependency but is **imported nowhere**, `app.js` never references
it, and `prerenderServer.js` is standalone, started by nothing, hardcoding
`C:\Program Files\Google\Chrome\...` on a Linux server.

**Risk 6 is retired by non-existence.** No purge step is needed at R.4/R.8.

`flush-caches` handles both outcomes: it POSTs to `PRERENDER_PURGE_URL` when that is set (with an
optional `PRERENDER_PURGE_TOKEN`), and otherwise prints an explicit SKIPPED with the reasoning above
rather than quietly passing.

**USER: confirm whether prerendering is enabled on the server.** If it is not, risk 6 is retired by
non-existence. If it is, set `PRERENDER_PURGE_URL` and the existing code covers it.

### Reaching Redis from this machine

Redis is not in the `massclick` SSH alias's forwards. Connect **by IP**, not by alias — the alias also
forwards 9090/3001/27018 and will abort if a session already holds them:

```bash
ssh -N -L 6380:127.0.0.1:6380 -p 2244 -i C:\Users\USER\.ssh\massclick root@103.14.121.77
REDIS_URL=redis://127.0.0.1:6380 node server/scripts/s3KeyMigration.js flush-caches --commit
```

`6380` is `redis-dev`; **`6379` is `redis-prod`** — see `D:\dev_abishek\vps\massclick.md`. Only flush
prod as part of R.8, never casually: it is 284 live keys and dropping them is a cache-miss burst on the
real site.

---

## 0.8 — the deploy, and the order everything after it must happen in

Phase 0 code is complete and committed on `dev`. **Nothing below is code work; it is all sequencing,
and the order matters.** Three of the outstanding gates can only close on a deployed environment, which
is why they were left rather than faked.

### Step order — do not reorder

| # | Action | Why here |
|---|---|---|
| 1 | Deploy `dev` → dev environment | — |
| 2 | `flush-caches --commit` on dev | ✅ already proven; re-run after deploy so the new code's output is cached |
| 3 | `checkPublicImageUrls --api=<dev> --compare=imgcheck-2026-08-11-dev.json` | must print **NEWLY broken: 0** |
| 4 | Warm-cache browser check on a review QR | closes 0.4's gate; needs a real browser |
| 5 | Deploy to **prod** | — |
| 6 | `checkPublicImageUrls --api=<prod> --compare=imgcheck-2026-08-11-prod.json` | must print **NEWLY broken: 0** |
| 7 | **Backup**, then `fixRatingPhotos --uri=<prod> --commit` | **must be after 5** — see 0.6 |
| 8 | *(optional)* `qrText` repair on prod | open question 4 |
| 9 | Re-clone prod → dev | after 7 and 8, or their work is discarded |
| 10 | `scan` dev again | refresh the baseline the re-clone invalidated |

Steps 7 and 8 are the two prod data repairs; they belong in one sitting, and both must land **before**
step 9 or the next clone throws them away.

### Risk register after Phase 0

| # | Risk | State |
|---|---|---|
| 1 | one-year `Cache-Control` | code done; **browser check outstanding** (step 4) |
| 2 | half-created records | not started — belongs to 1.4 |
| 3 | the two DBs may not be clones | ✅ retired — 95.68% overlap, 0 genuine conflicts |
| 4 | `setByPath` array corruption | ✅ retired — 31/31 gate |
| 5 | 63 objects unrestorable | ✅ retired — bucket versioning `Enabled` |
| 6 | prerender HTML not invalidated | ✅ **retired by non-existence** — verified on the server; a *real* Redis gap was found and fixed instead |
| 7 | torn final line in an append-only log | not started — belongs to 2.2 `doctor` |
| 8 | tunnel drops mid-rewrite | not started — belongs to 2.2 |
| 9 | signed-URL fields unreachable by the smoke script | ✅ handled — documented exclusions, covered by `verify` + manual download |

**Three bugs were found that were not on the risk register at all**, all of which had already fired:
the `$set` subdocument wipe (4,442 prod documents), `extractS3Key` mis-parsing repeated prefixes (live
on prod today), and `ratingPhotos` at 71% of the BSON limit.

---

## 0.8 — dev deployed and verified 2026-08-11

| | commit | state |
|---|---|---|
| dev backend + frontend | `e24522c6` | ✅ deployed and verified |
| prod backend | `e30540a6` | untouched — pre-Phase-0 |
| prod frontend | `f66f5b95` | untouched |

`origin/prod` is still pre-Phase-0. Nothing has reached production.

**Verification run against dev:**

```
flush-caches --commit     all 7 invalidators ok, 1 -> 0
checkPublicImageUrls      17/17 endpoints 2xx, 632 assets resolve
  vs the pre-deploy baseline:   NEWLY broken: 0   exit 0
```

### ⚠️ A bug I shipped, and the process lesson

`97129004`'s edit to `invalidateCategoryDisplaySettingsCache` only half-applied: it replaced the line
*using* `directKeys` but left the `directKeys` block, so the function referenced an undefined
`directPatterns`, threw, and returned `false` on every call. It was deployed to dev.

**I nearly missed it because I had filtered `flush-caches` output down to the count lines, dropping the
`FAIL` line — in the very tool built to surface failures.** The counts looked right so it read as
verified. Fixed in `fb515f29`; `directResults` now counts toward the return value so a silent failure
cannot report `ok`.

**Rule for R.4/R.8: read the whole `flush-caches` output. Never grep it down to the counts.**

### Cache coverage is now audited, not assumed

Every `cacheMiddleware` `keyPrefix` in `routes/` was checked against invalidator patterns. Two more
carried image URLs and were uncovered — both now covered:

```
mobile-v3             GET /api/businesslist/findByMobile   business images
district-category-v2  GET /api/v2/category/district        category images
```

Seven remain uncovered on purpose — `admin-analytics-report` and six `wa-*` analytics caches — after
checking their controllers for image fields and finding none. **20 of 27 covered, exclusions verified.**

Re-run this audit if a new cached endpoint is added:

```bash
grep -rhoE "keyPrefix:\s*['\"][a-zA-Z0-9_-]+" server/routes/ | sed -E "s/.*['\"]//" | sort -u
```

---

## 0.6 data repair — EXECUTED on prod 2026-08-12

Ran only after prod was deployed with the both-shape read path, per the ordering rule above.

| | before | after |
|---|---|---|
| largest review document | **11.30 MB** — 71% of the 16 MB BSON limit | **~0.00 MB** |
| second | 8.28 MB | ~0.00 MB |
| photos | 50, inline base64 | 50, S3 keys |
| dropped | — | **0** |

**Backup:** `db-backups/snapshots/massClick/2026-08-12_07-14-56__pre-rating-photos-quarantine`
— checksum MATCH, 64 lines = 64 docs = 64 live at snapshot time.

Verification chain, each step checked rather than assumed:

```
dry run     50 upload, 0 dropped, counts unchanged
S3          all 50 objects HEAD 200, none zero-byte
idempotent  re-ran --commit -> 0 to upload, 50 recognised as keys under the right prefix
live API    GET /api/business/6a5724fd…/reviews -> 45 URLs, shape=url, first HEAD 200
```

**Caveat recorded honestly:** the first `--commit` printed a stack-trace fragment mid-run which was
not captured (output was piped through `tail`). Every downstream check passes, so the outcome is
sound, but the cause is unknown. If it recurs, capture full stderr rather than tailing.

Rollback if ever needed: `node db-backups/restore.js --from db-backups/snapshots/massClick/2026-08-12_07-14-56__pre-rating-photos-quarantine`
(dry-run by default). The 50 new S3 objects are additive and covered by bucket versioning.

---

## Phase 1 — where it stands

**1.1 + 1.2 are done and committed (`cd038ae6`), gate 63/63.**

- `utils/idGen.js` — 26-char ULID on `node:crypto`, monotonic in-process, backwards-clock safe.
- `utils/s3ObjectKeys.js` — `s3Path` / `parseS3Key` / `isCanonicalKey` / `entityPrefix` /
  `belongsToEntity` / `s3Keys.*` builders. Its catalogue of 44 valid `(entity, purpose,
  stability)` triples is **derived from `s3ScopeRegistry.js` at import time**, so there is no
  second list to drift. `s3Path` returns a **branded token carrying a Symbol** — a template
  literal cannot fabricate one, which is what makes 1.3's chokepoint a real gate.

Key shapes:

```
versioned   {entity}/{entityId}/{purpose}/{ulid}     every upload a new object
stable      {entity}/{entityId}/{purpose}            regeneration OVERWRITES
stable+seq  {entity}/{entityId}/{purpose}/{seq}      only categories/variant, 6 named variants
```

Keys carry **no extension** — `uploadImageToS3` appends it at [s3Uploder.js:59](server/s3Uploder.js:59),
since only it knows whether sharp converted the buffer to webp.

### 1.3 — DONE 2026-08-12, later flipped to `strict` (see 1.4 below)

All three pieces landed in one commit alongside this update.

1. **`resolveUploadPath()` in `server/s3Uploder.js`** — accepts a branded `s3Path()` token
   (returns `.key`), or a plain string only if `isCanonicalKey()` passes. `const s3Key = ...`
   at what was line 59 now routes through it. `S3_PATH_MODE` env var, default `warn`: a legacy
   string still uploads (return unchanged) but logs one warning per distinct `(path, call site)`
   pair via `console.warn`, naming the offending path and the caller's stack frame. `strict`
   throws instead. An unrecognised `S3_PATH_MODE` value throws at import time.
2. **`server/scripts/lintS3Paths.js`** — static, read-only scan of `server/` and
   `client/ui-app/src`. Fails on any `uploadImageToS3(` call whose 2nd argument is a template
   literal or a string concatenation, including a one-hop back-reference when the argument is a
   bare identifier assigned one line earlier (`trackedKeywordHelper.js`, `fcmAdminController.js`,
   `categoryDisplaySettingsController.js` all build the path into a variable first — a plain
   per-call-site check alone would have missed these 3). Also fails on the literal
   `massclickdev.s3` outside two documented exceptions: the 0.5 fallback default in
   `imageUrlHelper.js`, and a synthetic base URL used only as fixture input inside
   `verifyS3KeyUtils.js`'s own tests. **Run it — it is *expected* to exit 1 right now: 51 legacy
   call sites across 22 files, 0 bucket-literal leaks.** That list is 1.4's todo, not a defect in
   this script.
3. **`deleteEntityAssets(entity, entityId)`** in `server/s3Uploder.js` — cascade delete via
   `entityPrefix()`, which throws for a malformed entity/entityId *before* any AWS call, so a bad
   call fails closed with no network involved. Every key S3 lists under that prefix is then
   re-checked with `belongsToEntity()` (a real registry parse, not a bare string-prefix test),
   and the **whole page is refused — nothing deleted — if even one key fails to parse** as owned
   by that entity. Nothing calls this yet; 1.4/2.x wires it up. Not reversible the way a key
   rewrite is — only S3 versioning (0.2, Enabled) makes a delete undoable, via `undelete`.

**New gate:** `server/scripts/verifyS3PathEnforcement.js` — 22/22 green. Proves warn-mode
does-not-throw + logs once (deduped by call site, not just by path — verified by exercising the
*same* logging call twice via a loop, since two textually different call expressions on one line
are, correctly, two different call sites), strict-mode throws, and `deleteEntityAssets`'s guard
rejects before any network call. Reads nothing, writes nothing, no S3, no database.

**DECISION (already taken, held): enforcement ships in `warn` mode first.** A chokepoint that
throws today breaks every image upload the moment it deploys, and dev/prod deploy on the user's
own schedule. `S3_PATH_MODE` defaults to `warn`; **flip to `strict` only as the final commit of
1.4**, once `lintS3Paths.js` reports 0/0. **Until that flip the plan's "bypass impossible"
requirement is NOT met** — 1.3 does not retire anything by itself; it makes bypass *visible*.

**Two things worth knowing for a fresh session:**

- **`lintS3Paths.js` found one real call site the hand-written inventory below had missed**:
  `server/scripts/fixRatingPhotos.js:128` (the 0.6 repair script, mirroring
  `reviewHelper.js:62`'s `${prefix}photo-${Date.now()}-${i}` shape exactly). The doc's original
  "51 across 21 files" prose was actually 50 across 21 in the hand count — the static scanner is
  now the source of truth at **51 across 22 files**, and the table below is corrected to match.
- **`/server/scripts` is entirely gitignored** (`.gitignore:87`). The existing gate scripts
  (`verifyS3KeyUtils.js`, `verifyAssetUrl.js`, etc.) are tracked only because a past session ran
  `git add -f` on each one individually. **A new script in that directory needs the same
  `git add -f`, or it silently never gets committed** — `git status` shows nothing wrong, there is
  no untracked-file warning, it just isn't there. Hit this for both new 1.3 scripts.

⚠️ **A real CRLF-churn incident, distinct from the earlier heredoc one:** editing
`server/s3Uploder.js` with the Edit tool (correctly, no heredoc) still normalised the whole file
to uniform CRLF, flipping the ~38 lines that were originally bare LF (the tail: `getImageDataUrlByKey`,
`getObjectBufferByKey`, `deleteObjectByKey`) even though their content never changed. First
`git diff --numstat` read `159 insertions(+) 40 deletions(-)` against ~110 real new lines — the
tell. Fixed by reconstructing the file in Node (`latin1` round-trip to stay byte-exact, since the
file is UTF-8 and em-dashes are multi-byte): current head (genuinely new content) + the ORIGINAL
bytes for the untouched tail (sliced straight from `git show HEAD:...`, not re-typed) + the new
`deleteEntityAssets` block. Final diff: 121 insertions / 2 deletions — exactly the real change.
**Lesson: after ANY edit to a mixed-EOL file, check `git diff --numstat` before moving on — not
just "is it a big number" but "does insertions-minus-deletions roughly equal what I actually
typed." A `sed` pipeline is not safe for this repair either**: on this machine `sed` piping
through `/tmp` silently stripped every `\r`, corrupting a first repair attempt — use Node with
explicit `latin1` reads/writes on files addressed by their real Windows path instead.

### 1.4 — DONE 2026-08-12. All 51 call sites across 22 files migrated, `S3_PATH_MODE=strict`

**Every legacy `uploadImageToS3(` call site now builds its key through the registry.**
`lintS3Paths.js` → 0 legacy call sites / 0 bucket-literal leaks, and `S3_PATH_MODE` defaults to
`strict` as of the final commit — a non-canonical path now throws instead of warning.
`server/scripts` being gitignored means **nothing here was pushed automatically** — see the
"open user items" section for what's still local-only.

**Commits, in order** (all on `dev`, none pushed — ask before pushing):

```
03199133  1.3 chokepoint + lint + deleteEntityAssets (warn mode)
e5712a85  businessListHelper.js            11 sites
40d83465  BUG FIX: isEntityId rejected real Mongoose ObjectId objects  <- see below
6582a706  categoryHelper.js                 6 sites
2b6a75f9  advertismentHelper.js             6 sites
f1d4c766  seoOnpageBlogHelper.js            5 sites
22a9324d  userHelper.js                     2 sites
2ac26622  massclickEventHelper.js           2 sites (ULID pattern)
52cd4a73  massclickDocumentsHelper.js       2 sites
598c287c  eventCreationHelper.js            2 sites
f3ed2f60  eventAdvertisementHelper.js       2 sites + 3 missing registry builders
b22f4cab  eventLocationHelper.js + eventCategoryHelper.js   2 sites
585704bc  rewardHelper.js + reviewHelper.js  2 sites (reviewHelper design decision resolved)
79076573  massclickFeedHelper.js + hiringHelper.js  2 sites
c3f9ee71  businessCertificateHelper.js  1 site + certificate cache-buster wiring (3 files)
[ade6ae78 — concurrent commit by the user swept up trackedKeywordHelper.js's already-finished edit]
8583574e  fixRatingPhotos.js               1 site
8cc12d0e  msg91Controller.js  1 site + customer-avatar cache-buster wiring (2 files)
be095175  categoryImageController.js  1 site + category-image cache-buster wiring (2 files)
01a8a450  categoryDisplaySettingsController.js  1 site + 9 more cache-buster read sites
21619ac0  FINAL: S3_PATH_MODE default flipped to strict
```

#### The bug that would have broken every migrated call site — found and fixed mid-1.4

`isEntityId()` in `s3ObjectKeys.js` required `typeof value === "string"`. Every real call site
passes `document._id` or `new mongoose.Types.ObjectId()` — **objects**, not strings — so `s3Path()`
threw on every single invocation, including the already-committed `businessListHelper.js` work.
The gate never caught it because `verifyS3ObjectKeys.js`'s fixtures (`BIZ`, `CAT`) are string
constants. Found by hand-testing a real ObjectId while starting `categoryHelper.js`. Fixed:
`isEntityId` now accepts anything whose `String(value)` is a valid ObjectId/ULID — matching what
the rest of `s3Path()` already did (the template-literal key construction coerces either way).
Added 3 regression checks (gate 63 → 66). **If a future session sees `s3Path: entityId must be a
24-char ObjectId or a ULID` on what looks like a valid id, check this fix is still present before
assuming the caller is wrong.**

#### Registry gaps found along the way

The registry (0.1) and the `s3Keys` named builders (1.1) were built in the same pass but drifted:
three entities were declared in `s3ScopeRegistry.js` with no matching `s3Keys.*` group —
`event-advertisements`, `event-categories`, `event-locations` — plus one purpose that didn't exist
in the registry at all: the embedded `business.reviews[].ratingPhotos` path
([businessListHelper.js:1352](server/helper/businessList/businessListHelper.js:1352)) is a
**separate mechanism from the `businessreviews` collection** already declared under
`entity: "reviews"` — an undeclared/Mixed field on the business document itself, not a reference to
a `businessReviewModel` document. Added `purpose: "review-photo"` under the `businesses` scope
(scoped by business, not by a review sub-id, since embedded reviews have no declared `_id`) plus a
matching `s3Keys.business.reviewPhoto(id)` builder — then reused the *same* purpose in
`reviewHelper.js`'s `sanitizeRatingPhotos` (the separate `businessreviews`-collection path) once its
turn came, since that file's own docstring had already documented the business-scoped Phase 1 form
of its trust-check. All four gaps closed as each file needing them came up; `verifyS3ObjectKeys.js`
stayed green throughout (66/66 by the end).

#### Decoupled-upload pattern: ULID as entityId, three times

Three upload endpoints have **no real entity id at upload time and no guarantee one will ever
exist** — a standalone "upload media" endpoint called before the owning form is submitted, with
document creation elsewhere not pre-minting an id either:
`massclickEventHelper.js`'s `uploadMassclickEventMedia`, `fcmAdminController.js`'s
`uploadFCMImageAction` (the campaign schema stores only `imageUrl`, no `imageKey`/campaign id to key
off), and `categoryImageController.js`'s `uploadCategoryImagesAction` when `categoryId` isn't
supplied (a create-category form uploading variants before the category exists). All three use
`ulid()` as the entity id — the documented case for "no document exists at upload time". This means
these specific objects won't be found by `deleteEntityAssets("massclick-events"/"fcm-campaigns"/
"categories", realId)` later, since they live under a pseudo-entity prefix, not the real one. Noted
inline at each site as a known, accepted gap — closing it needs an API contract change (mint the
real id before the first upload), out of scope for a call-site migration.

#### The recurring finding: stable keys need their READ sites fixed, not just the write site

The registry declares several purposes `stable` (deterministic, regeneration overwrites). Every one
of them **used to mint a fresh `Date.now()`-suffixed key specifically to dodge the 1-year
`Cache-Control`** — moving the upload to the registry's stable form without ALSO wiring every render
site through `assetUrl(key, { version })` would have reintroduced exactly the staleness bug 0.4
built `assetUrl` to prevent. This bit three purposes, each found while migrating an unrelated
file's write site, not planned in advance:

| Purpose | Found while migrating | Read sites fixed | Files touched |
|---|---|---|---|
| `certificate-verified` / `certificate-trust` | `businessCertificateHelper.js` | `appendCertificateUrls` (3 internal callers) + `businessListHelper.js` ×2 + `businessListController.js` ×2 | 3 |
| `customers.profileImageKey` (avatar) | `msg91Controller.js` | 4 sites in `msg91Controller.js` + 2 in the unrelated `smsGatewayController.js` (reads the same field, has no upload of its own) | 2 |
| `categories.categoryImageKey`/`liveImageKey`/`categoryImages.*` | `categoryImageController.js` (which exposed that `categoryHelper.js`'s OWN 6582a706 commit had never wired its reads) | 5 sites in `categoryHelper.js` + 9 more in `categoryDisplaySettingsController.js` (a second, independent copy of the same rendering logic) | 2 |

Version source is always the most specific timestamp available, falling back to the document's
`updatedAt`, same pattern as the QR helpers: `certificates.generatedAt`, then
`business.updatedAt`/`category.updatedAt`. Where a query's projection didn't happen to include
`updatedAt` (`businessSearchCategory`, the district explorer), `assetUrl` degrades gracefully to an
unversioned URL — byte-identical to the pre-migration behavior, never worse.
**If a new stable purpose gets added later, grep for every render of its key field before
considering the write-side migration done** — this pattern hit 3 times unprompted.

#### A live collision with the user's own concurrent work

Mid-session, `git status` showed `HEAD` had moved to a commit ("Add FCM dismiss control", `ade6ae78`)
neither made nor expected — the user was committing unrelated work in the **same working
directory** at the same time, and their `git add`/`commit` swept up this session's already-finished,
still-unstaged edit to `trackedKeywordHelper.js` along with their own changes, then pushed it.
Verified byte-for-byte that the swept content was exactly the intended change (no corruption), and
that no other in-progress file was touched. No harm done, but **a fresh session should `git status`
before assuming its own uncommitted edits are still there**, and commit promptly rather than leaving
work unstaged for long stretches when the working directory might not be exclusive.

#### CRLF churn hit repeatedly — the fix, generalized

Six more files hit the same Edit-tool line-ending-normalization issue first found in step 1.3
(`s3Uploder.js`): `userHelper.js`, `reviewHelper.js`, `businessListController.js`,
`msg91Controller.js`, and `s3Uploder.js` again on the strict-mode-flip commit. **Not every
originally-mixed-EOL file churns, and not every large `git diff --numstat` after an edit is
churn** — verified this directly: `businessListHelper.js`, `categoryHelper.js`,
`advertismentHelper.js` and `seoOnpageBlogHelper.js` all showed the SAME symptom locally
(working tree flips to uniform CRLF or LF) but their **committed** history (`git diff <parent>
<commit>`, which bypasses the working-tree/`core.autocrlf` conversion) was already clean — because
`core.autocrlf=true` here normalizes the working tree back to LF on `git add`/`commit` regardless of
what got checked out, UNLESS the file was already inconsistent *within its own stored blob* (a real
mix of literal `\r\n` and bare `\n`, not something autocrlf itself produced) — which is exactly what
kept happening to a specific handful of older files.

**The check, every time:** after an edit, `git diff --numstat` on the affected file. If
insertions+deletions is wildly larger than what was actually typed, don't assume — measure:

```bash
git show HEAD:<path> > .eol_check.js
node -e "
  const fs = require('fs');
  const before = fs.readFileSync('.eol_check.js', 'latin1');
  const after = fs.readFileSync('<path>', 'latin1');
  const crlf = (t) => (t.match(/\r\n/g) || []).length;
  const lfOnly = (t) => (t.match(/(?<!\r)\n/g) || []).length;
  console.log('before:', crlf(before), lfOnly(before), '  after:', crlf(after), lfOnly(after));
"
```
If `before` was already uniform (all-CRLF or all-LF), the working-tree flip is cosmetic and the
diff is already accurate — no fix needed. If `before` was genuinely mixed, the diff IS corrupted and
needs reconstruction: LCS-diff `before` against `after` (ignoring EOL), keep `before`'s exact
per-line terminator on every line that matched unchanged, use `\n` only on genuinely new/changed
lines. **A `sed` pipeline is not safe for the reconstruction step** — on this machine piping through
`/tmp` silently stripped every `\r`. This session's working version of that reconstruction script
lived at the session's scratchpad path (not committed — it's a Claude-Code editing workaround, not
a project tool); recreate it fresh if this recurs rather than searching for it.

#### Ordering rule, applied throughout

Every upload-before-document-creation site — `createBusinessList`, `createCategory`,
`createAdvertisement`, `createPageContentBlogSeo`, `createUsers`, `createEventCreation`,
`createEventAdvertisement`, `createEventLocation`/`createEventCategory`, `createRewardClaim`,
`createMassclickDocument`, `createMassclickFeedPost`, `submitApplication` — now mints the `_id`
first (`new mongoose.Types.ObjectId()` or `new ObjectId()`) and passes it to both the upload(s) and
the model constructor, per the plan's rule: never upload-then-mint. `s3Path` enforces the shape by
rejecting a non-ObjectId/ULID `entityId` — this caught nothing live, but is the backstop.

**No new gate script was needed** — `lintS3Paths.js` (1.3) and the four existing verify gates were
sufficient for the whole burndown; re-run after every file, every time.

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

5. **Do not re-clone prod → dev between `plan` and R.9.** The user re-clones dev from prod periodically
   (stated 2026-08-11). Before the run this is *helpful* — it pushes `_id` overlap from 95.68% toward
   100% and makes the dev rehearsal a truer stand-in. Inside the run window it is destructive in three
   ways that are not obvious from the code:
   - a re-clone after **R.3** overwrites dev's rewritten keys with prod's old ones, silently undoing the
     rewrite and invalidating the **R.6 soak** that gates the prod rewrite;
   - `applied-massClick_dev.jsonl` then describes documents that no longer exist in that state, so
     **`reverse` no longer works** — the rollback disappears exactly when it would be needed;
   - the manifest records owners by `docId`, and a re-clone changes which documents exist.

   **Safe windows:** any time before `plan`, or after R.9. **Unsafe:** everything in between.
   **After any re-clone, re-run `scan` on dev** — the baseline miss count is what `verify` is checked
   against, and a stale one makes R.5 either fail spuriously or hide a real regression.

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
| 4 | Repair the 4,442 (prod) / 4,443 (dev) businesses whose `qrCode.qrText` + `createdAt` were wiped by bug 3? Self-heals on view; a bulk repair is a DB write needing a `--collections businesslists` backup first. **If done at all, do prod FIRST then re-clone** — repairing dev before a re-clone is wasted | **USER DECISION** — not blocking |
| 8 | Is prerendering enabled on the server? | ✅ **ANSWERED 2026-08-11** — no nginx match, no container, no process. Risk 6 retired by non-existence |
| 9 | Run `flush-caches --commit` against a real Redis | ✅ **DONE 2026-08-11** — dev Redis via tunnel; exposed and fixed an invalidation gap |
| 7 | `fixRatingPhotos.js --commit` on prod | ✅ **DONE 2026-08-12** — backup verified, 50 uploaded, 0 dropped, all 50 objects HEAD 200, re-run idempotent, live API returns resolvable URLs |
| 6 | `REACT_APP_ASSET_BASE_URL` | ✅ **DONE 2026-08-11** — dev in `/var/www/dev-massclick/client/ui-app/.env`, prod as a GitHub repo variable. Both verified correct for where each is actually built. Residual: `frontend.sh prod` would build on the server without it and fall back to the default |
| 5 | **Prod is under active data entry.** User is waiting for it to settle, then re-cloning prod → dev (stated 2026-08-11). Fine before `plan`, **destructive between `plan` and R.9** — see "Do NOT do" rule 5. Re-run `scan` on dev afterwards to refresh the baseline. Blocks nothing: 0.4–0.7 are code only and touch no database | **WAITING ON PROD — tell Claude when the clone happens** |

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

### The baseline is a MOVING TARGET — prod is under active data entry

Two scans an hour apart on 2026-08-11 measured the drift directly:

```
                       09:34        10:38      delta
bucket objects         36,384       36,437       +53
massClick refs         31,789       31,843       +54
```

~50 new objects/hour of real traffic. Consequences:

- **Re-run `scan` shortly before the run.** `verify` at R.5 compares the miss count against *a*
  baseline; comparing against a stale one either fails spuriously or hides a real regression.
- The invariants are what's stable, not the absolutes. **Genuine cross-DB conflicts: 0** and
  **missing: 45** both held across the two runs; only the totals moved.
- This is the concrete argument for **"Do NOT do" rule 1**: the path registry must ship before `plan`,
  so new uploads land on canonical keys and fall outside the manifest. Against a prod adding ~50
  objects an hour, a manifest built too early is stale before it runs.

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
| 2026-08-12 | **1.4 DONE — all 51 call sites across 22 files migrated, `S3_PATH_MODE` flipped to `strict`.** Full detail in the "Phase 1 — where it stands" section above; summary: found and fixed a real bug mid-migration (`isEntityId` rejected real Mongoose ObjectId objects — would have broken every call site, gate never caught it since fixtures were plain strings); found 3 registry/`s3Keys` builder gaps and closed them as each file needing them came up; resolved the `reviewHelper.js` design question flagged when `businessListHelper.js` was migrated (reuse `s3Keys.business.reviewPhoto`, per that file's own docstring); used a ULID entity id for 3 genuinely decoupled upload endpoints (massclick event media, FCM images, category variants uploaded before a category exists); found and fixed the SAME class of cache-staleness gap three separate times (certificates, customer avatars, category images) — moving a purpose to its registry-declared `stable` form without wiring every read site through `assetUrl` would have reintroduced the exact bug 0.4 exists to prevent; survived a live collision with the user's own concurrent commit in the same working directory (verified no corruption); and hit + fixed the Edit-tool CRLF-churn issue on 5 more files, confirming empirically that `core.autocrlf=true` makes most such churn cosmetic (already-uniform files round-trip clean) except where a file's stored blob was already internally inconsistent. All 5 gates (`verifyS3KeyUtils` 31/31, `verifyAssetUrl` 22/22, `verifyS3ObjectKeys` 66/66, `verifyS3PathEnforcement` 23/23, `lintS3Paths.js` 0/0) green at every commit. |
| 2026-08-12 | **1.3 done, shipped in `warn` mode.** `resolveUploadPath()` chokepoint in `s3Uploder.js` (token or canonical string passes through; legacy string warns once per call site and keeps working; strict mode throws — controlled by `S3_PATH_MODE`, default `warn`). `deleteEntityAssets(entity, entityId)` cascade delete, refuses the whole page if any listed key fails `belongsToEntity()`. `lintS3Paths.js` static scanner — found **51 legacy call sites across 22 files** (one more than the hand-written inventory: `scripts/fixRatingPhotos.js:128`, mirroring `reviewHelper.js`'s pattern), 0 bucket-literal leaks; it is *correctly* failing right now, that failure IS 1.4's todo list. New gate `verifyS3PathEnforcement.js`, 22/22, all four gates plus the new one re-run clean. **Two process gotchas hit and fixed:** the Edit tool normalised `s3Uploder.js`'s mixed CRLF/LF to uniform CRLF, corrupting `git diff --numstat` with ~40 lines of pure line-ending noise — repaired via a byte-exact Node/`latin1` reconstruction pulling the original bytes back from `git show HEAD:...` (a `sed`-based first attempt silently stripped all `\r` and made it worse); and `/server/scripts` is entirely gitignored, so both new scripts needed `git add -f` or they'd have been silently left uncommitted. |
| 2026-08-11 | **0.7 code done.** `flush-caches` added to the migration CLI — dry-run by default, discovers invalidators by reflection (verified: all 7), reports cached-key counts before/after, and refuses to run at all if Redis is unreachable. **Risk 6's premise turns out to be wrong:** `prerender-node` is a dependency but is imported nowhere, `app.js` never references it, and `prerenderServer.js` is standalone with a hardcoded Windows Chrome path. Either prerendering is not deployed or it lives in nginx outside this repo. The command handles both — POSTs to `PRERENDER_PURGE_URL` when set, otherwise prints an explicit SKIPPED. Two user items: confirm whether prerender is deployed, and run the flush once against a real Redis (not reachable from this machine). |
| 2026-08-11 | **0.6 code done; data repair awaiting approval.** Fixed the unvalidated `ratingPhotos` write path — it was the only writer that trusted the request body, and the field renders as an image URL. Measured the stored data and it is **not** the injected keys the plan assumed: 50 prod entries / 20.4 MB of **inline base64**, with one review document at **11.30 MB — 71% of MongoDB's hard 16 MB limit**, i.e. a few photos from being unwritable. Repair therefore uploads-and-replaces instead of quarantining. Built `fixRatingPhotos.js` (dry-run default) and ran it on both DBs: nothing would be lost. Prod `--commit` needs a backup and the user's go-ahead, and should be paired with the `qrText` repair before the re-clone. |
| 2026-08-11 | **0.5 done.** 15 hardcoded bucket URLs → 0 (2 of the 9 server ones were dead code). Client now reads `REACT_APP_ASSET_BASE_URL` with the literal as a default so an unset var cannot break a build. Found and fixed the **client-side twin of 0.3's repeated-prefix bug** — and `checkPublicImageUrls.js` caught **prod serving a doubled URL to real users** on `/seopagecontentblog/viewall`. Built that checker (also the R.5/R.9 diff tool) and captured dev + prod baselines: 632/635 and 657/662 assets resolve, every failure a pre-existing `businessDetails[].bannerImage` verified against the 0.1 missing list. `--compare` validated end-to-end: newly broken 0, exit 0. **User action: add the `REACT_APP_ASSET_BASE_URL` repo variable.** |
| 2026-08-11 | **0.4 code done, 22/22 mechanism gate green; browser check still owed by the user.** Built `server/utils/assetUrl.js`. Key finding that scoped it: **31 of the 32 upload paths end in `Date.now()`**, so only `businessList/qr/review-<id>` is deterministic today — the one-year `max-age` is mostly a risk *Phase 1 creates*, which is why 0.4 precedes it. Wired the five review-QR render paths only; the rest belong in 1.4 behind the lint gate. Verified the version fallback on real dev data across all three cases (createdAt present / wiped by 0.3 bug 3 / absent). |
| 2026-08-11 | **0.3 done, gate green (31/31).** Extracted `server/utils/s3KeyUtils.js` as the single copy and repointed all four callers. Found **three** bugs where the plan expected one — and bug 3 had already fired: building the `$set` payload with `setByPath` meant `$set: {qrCode:{qrImageKey}}` replaced the whole subdocument, wiping `qrText` and `createdAt` on **4,442 prod / 4,443 dev** businesses. Proven by cross-tab: every loss is a `.webp` key, zero losses among non-webp. Damage is bounded — `qrText` is derived and self-heals on next view against a deterministic key. Bulk repair left as a user decision (open question 4). |
| 2026-08-11 | **0.2 complete.** Access logging repointed off the asset bucket onto `massclick-access-logs` (caught at 0 delivered logs, before it could contaminate the orphan accounting). Applied `expire-noncurrent-90d` to `massclickdev` by API rather than console — explicit JSON means the "expire current versions" footgun is absent rather than unticked — and read it back: `rules expiring CURRENT versions: 0`. Side effect worth knowing: `undelete` now works for 90 days after the sweep, not 30. Log-bucket lifecycle still needs one IAM ARN. |
| 2026-08-11 | **0.2 gate met.** User enabled bucket versioning and granted the IAM user read-only bucket-config permissions, so `getBucketVersioning` → `{Status:"Enabled"}` is now verified from this machine instead of taken on trust. Risk 5 retired; the sweep is reversible. Two follow-ups left with the user: access logging currently targets `massclickdev` itself (would contaminate the migration's own orphan accounting — caught at 0 delivered logs), and no lifecycle rule exists yet. Neither blocks 0.3. |
| 2026-08-11 | **0.1 done, awaiting review.** Verified the tunnel. Built `server/utils/s3ScopeRegistry.js` (20 collections / 47 fields / new `arrayOfObjects` kind) and the read-only `scan` + `collections` subcommands of `server/scripts/s3KeyMigration.js`. Scanned both DBs against the live bucket. **Gate result: DBs are clones (95.68% `_id` overlap, one-directional), 45/46 pre-existing broken refs, 13% orphans, 0 genuine cross-DB conflicts — the plan holds unchanged.** Found two things the plan had wrong: six non-existent collection names in the backup list, and a second live defect in `extractS3Key` (strips a repeated base URL only once; real data has it 4×) to fold into 0.3. `ratingPhotos` turns out to be inline base64, not injected keys — 0.6 grows. |
| 2026-08-11 | Plan written and approved. Explored bucket (36,187 objects / 1,774 MB), mapped all S3 fields across ~20 schemas, verified 4 latent defects: `setByPath` array corruption in 3 shipped helpers, unvalidated `ratingPhotos` write, 15 hardcoded dev-bucket URLs, stale S3 backup (June, 63 failures). Progress file created and committed (`b30e02e8`). Started 0.1 — confirmed model/schema layout, no code written. Session ended here. |
