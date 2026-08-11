# S3 Key Restructure — Progress

**Last updated:** 2026-08-11 by Claude · **Active runId:** none
**Current step:** 0.8 (deploy) · **Status:** 0.1–0.7 code complete; **0.8 is the next action and it is the user's**

### Everything Phase 0 built — one place

```bash
node server/scripts/verifyS3KeyUtils.js                     # 0.3 gate   31/31
node server/scripts/verifyAssetUrl.js                       # 0.4 gate   22/22
node server/scripts/s3KeyMigration.js collections           # 0.1  registry -> backup list
node server/scripts/s3KeyMigration.js scan --uri=… --compare-uri=…   # 0.1  baseline
node server/scripts/s3KeyMigration.js flush-caches [--commit]        # 0.7
node server/scripts/checkPublicImageUrls.js --api=… [--compare=…]    # 0.5  no-broken-images
node server/scripts/fixRatingPhotos.js --uri=… [--commit]            # 0.6  data repair
```

New modules: `utils/s3ScopeRegistry.js` · `utils/s3KeyUtils.js` · `utils/assetUrl.js`
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
| 0.6 | `ratingPhotos` fix + quarantine | 🟡 CODE DONE | write path fixed · **report below awaits review, no DB write yet** |
| 0.7 | `flush-caches` incl. prerender purge | 🟡 CODE DONE | needs one run against a real Redis · **prerender premise disproved, see below** |
| 0.8 | Deploy 0.3–0.7 dev → prod | ⬜ **NEXT — USER** | smoke clean; see the 0.8 checklist below |
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

### ⏳ USER ACTION — set the GitHub repository variable

`REACT_APP_ASSET_BASE_URL` must be added as a repository **variable** (Settings → Secrets and variables
→ Actions → Variables), value `https://massclickdev.s3.ap-southeast-2.amazonaws.com`. A **variable, not
a secret**: it is a public hostname that ships in the bundle anyway, and masking it only makes build
logs harder to read.

If it is left unset the build still succeeds — `imageUrlHelper.js` defaults to the same literal — but
the `index.html` preconnect degrades to a no-op, losing the LCP head-start that the comment there says
is worth hundreds of milliseconds.

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

### ⚠️ Risk 6's premise does not hold — prerender is not in the request path

The plan says prerendered HTML escapes Redis invalidation. **Nothing in this repo puts prerender in the
request path at all:**

- `prerender-node` (the Express middleware) is in `package.json` but is **imported nowhere**
- `app.js` never references it
- `prerenderServer.js` exists but is a standalone service, started by nothing in the repo, and hardcodes
  `C:\Program Files\Google\Chrome\...` — a Windows path, on a Linux-deployed server

So either prerendering is not deployed, or it is wired at the nginx layer, outside this repository. The
backend deploy runs `/home/admin/scripts/backend.sh`, which is not in the repo, so this cannot be
resolved from here.

`flush-caches` handles both outcomes: it POSTs to `PRERENDER_PURGE_URL` when that is set (with an
optional `PRERENDER_PURGE_TOKEN`), and otherwise prints an explicit SKIPPED with the reasoning above
rather than quietly passing.

**USER: confirm whether prerendering is enabled on the server.** If it is not, risk 6 is retired by
non-existence. If it is, set `PRERENDER_PURGE_URL` and the existing code covers it.

### ⏳ OUTSTANDING — one run against a real Redis

Redis is not reachable from this machine (only Mongo is tunnelled on 27018), so the flush itself is
unproven. Run it on the server, or open a second tunnel:

```bash
ssh -L 6379:127.0.0.1:6379 <server>          # then:
node server/scripts/s3KeyMigration.js flush-caches           # expect a non-zero key count
node server/scripts/s3KeyMigration.js flush-caches --commit  # expect it to drop
```

**Gate:** the before/after counts move, and a second `--commit` reports ~0 cleared. Cheap to fold into
the 0.8 deploy.

---

## 0.8 — the deploy, and the order everything after it must happen in

Phase 0 code is complete and committed on `dev`. **Nothing below is code work; it is all sequencing,
and the order matters.** Three of the outstanding gates can only close on a deployed environment, which
is why they were left rather than faked.

### Step order — do not reorder

| # | Action | Why here |
|---|---|---|
| 1 | Deploy `dev` → dev environment | — |
| 2 | `flush-caches --commit` on the dev server | closes 0.7's gate; needs a real Redis |
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
| 6 | prerender HTML not invalidated | **premise disproved** — prerender is not in the request path; confirm on the server |
| 7 | torn final line in an append-only log | not started — belongs to 2.2 `doctor` |
| 8 | tunnel drops mid-rewrite | not started — belongs to 2.2 |
| 9 | signed-URL fields unreachable by the smoke script | ✅ handled — documented exclusions, covered by `verify` + manual download |

**Three bugs were found that were not on the risk register at all**, all of which had already fired:
the `$set` subdocument wipe (4,442 prod documents), `extractS3Key` mis-parsing repeated prefixes (live
on prod today), and `ratingPhotos` at 71% of the BSON limit.

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
| 8 | **Is prerendering actually enabled on the server?** Nothing in this repo wires `prerender-node` into the request path. If it is not deployed, risk 6 is retired by non-existence; if it is (nginx layer), set `PRERENDER_PURGE_URL` and `flush-caches` already covers it | **USER — needs a look at the server** |
| 9 | Run `flush-caches --commit` once against a real Redis (unreachable from this machine — only Mongo is tunnelled). Fold into the 0.8 deploy | **USER / at 0.8** |
| 7 | **Run `fixRatingPhotos.js --commit` on prod?** 50 inline-base64 photos / 20.4 MB, one doc at **71% of the 16 MB BSON limit**. Dry-run shows nothing lost. Needs a `businessreviews` backup first. **BLOCKED UNTIL 0.8 IS DEPLOYED** — the key→URL read path must ship first or every review photo 404s. Then prod, then re-clone dev, alongside open question 4 | **USER DECISION** — blocked on 0.8 |
| 6 | Add GitHub repository **variable** `REACT_APP_ASSET_BASE_URL` = `https://massclickdev.s3.ap-southeast-2.amazonaws.com` (Settings → Secrets and variables → Actions → Variables). Build still succeeds without it; only the `index.html` preconnect degrades | **USER ACTION** — not blocking |
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
| 2026-08-11 | **0.7 code done.** `flush-caches` added to the migration CLI — dry-run by default, discovers invalidators by reflection (verified: all 7), reports cached-key counts before/after, and refuses to run at all if Redis is unreachable. **Risk 6's premise turns out to be wrong:** `prerender-node` is a dependency but is imported nowhere, `app.js` never references it, and `prerenderServer.js` is standalone with a hardcoded Windows Chrome path. Either prerendering is not deployed or it lives in nginx outside this repo. The command handles both — POSTs to `PRERENDER_PURGE_URL` when set, otherwise prints an explicit SKIPPED. Two user items: confirm whether prerender is deployed, and run the flush once against a real Redis (not reachable from this machine). |
| 2026-08-11 | **0.6 code done; data repair awaiting approval.** Fixed the unvalidated `ratingPhotos` write path — it was the only writer that trusted the request body, and the field renders as an image URL. Measured the stored data and it is **not** the injected keys the plan assumed: 50 prod entries / 20.4 MB of **inline base64**, with one review document at **11.30 MB — 71% of MongoDB's hard 16 MB limit**, i.e. a few photos from being unwritable. Repair therefore uploads-and-replaces instead of quarantining. Built `fixRatingPhotos.js` (dry-run default) and ran it on both DBs: nothing would be lost. Prod `--commit` needs a backup and the user's go-ahead, and should be paired with the `qrText` repair before the re-clone. |
| 2026-08-11 | **0.5 done.** 15 hardcoded bucket URLs → 0 (2 of the 9 server ones were dead code). Client now reads `REACT_APP_ASSET_BASE_URL` with the literal as a default so an unset var cannot break a build. Found and fixed the **client-side twin of 0.3's repeated-prefix bug** — and `checkPublicImageUrls.js` caught **prod serving a doubled URL to real users** on `/seopagecontentblog/viewall`. Built that checker (also the R.5/R.9 diff tool) and captured dev + prod baselines: 632/635 and 657/662 assets resolve, every failure a pre-existing `businessDetails[].bannerImage` verified against the 0.1 missing list. `--compare` validated end-to-end: newly broken 0, exit 0. **User action: add the `REACT_APP_ASSET_BASE_URL` repo variable.** |
| 2026-08-11 | **0.4 code done, 22/22 mechanism gate green; browser check still owed by the user.** Built `server/utils/assetUrl.js`. Key finding that scoped it: **31 of the 32 upload paths end in `Date.now()`**, so only `businessList/qr/review-<id>` is deterministic today — the one-year `max-age` is mostly a risk *Phase 1 creates*, which is why 0.4 precedes it. Wired the five review-QR render paths only; the rest belong in 1.4 behind the lint gate. Verified the version fallback on real dev data across all three cases (createdAt present / wiped by 0.3 bug 3 / absent). |
| 2026-08-11 | **0.3 done, gate green (31/31).** Extracted `server/utils/s3KeyUtils.js` as the single copy and repointed all four callers. Found **three** bugs where the plan expected one — and bug 3 had already fired: building the `$set` payload with `setByPath` meant `$set: {qrCode:{qrImageKey}}` replaced the whole subdocument, wiping `qrText` and `createdAt` on **4,442 prod / 4,443 dev** businesses. Proven by cross-tab: every loss is a `.webp` key, zero losses among non-webp. Damage is bounded — `qrText` is derived and self-heals on next view against a deterministic key. Bulk repair left as a user decision (open question 4). |
| 2026-08-11 | **0.2 complete.** Access logging repointed off the asset bucket onto `massclick-access-logs` (caught at 0 delivered logs, before it could contaminate the orphan accounting). Applied `expire-noncurrent-90d` to `massclickdev` by API rather than console — explicit JSON means the "expire current versions" footgun is absent rather than unticked — and read it back: `rules expiring CURRENT versions: 0`. Side effect worth knowing: `undelete` now works for 90 days after the sweep, not 30. Log-bucket lifecycle still needs one IAM ARN. |
| 2026-08-11 | **0.2 gate met.** User enabled bucket versioning and granted the IAM user read-only bucket-config permissions, so `getBucketVersioning` → `{Status:"Enabled"}` is now verified from this machine instead of taken on trust. Risk 5 retired; the sweep is reversible. Two follow-ups left with the user: access logging currently targets `massclickdev` itself (would contaminate the migration's own orphan accounting — caught at 0 delivered logs), and no lifecycle rule exists yet. Neither blocks 0.3. |
| 2026-08-11 | **0.1 done, awaiting review.** Verified the tunnel. Built `server/utils/s3ScopeRegistry.js` (20 collections / 47 fields / new `arrayOfObjects` kind) and the read-only `scan` + `collections` subcommands of `server/scripts/s3KeyMigration.js`. Scanned both DBs against the live bucket. **Gate result: DBs are clones (95.68% `_id` overlap, one-directional), 45/46 pre-existing broken refs, 13% orphans, 0 genuine cross-DB conflicts — the plan holds unchanged.** Found two things the plan had wrong: six non-existent collection names in the backup list, and a second live defect in `extractS3Key` (strips a repeated base URL only once; real data has it 4×) to fold into 0.3. `ratingPhotos` turns out to be inline base64, not injected keys — 0.6 grows. |
| 2026-08-11 | Plan written and approved. Explored bucket (36,187 objects / 1,774 MB), mapped all S3 fields across ~20 schemas, verified 4 latent defects: `setByPath` array corruption in 3 shipped helpers, unvalidated `ratingPhotos` write, 15 hardcoded dev-bucket URLs, stale S3 backup (June, 63 failures). Progress file created and committed (`b30e02e8`). Started 0.1 — confirmed model/schema layout, no code written. Session ended here. |
