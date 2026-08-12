/**
 * Repair `businessreviews.ratingPhotos` — the data half of step 0.6.
 *
 * The write path is fixed in helper/reviewHelper/reviewHelper.js; this deals with what
 * was already stored before that landed.
 *
 * WHAT IS ACTUALLY IN THERE (measured 2026-08-11, both databases):
 *
 *   massClick       4 documents, 50 entries, 20.4 MB   all inline base64 data URIs
 *   massClick_dev   2 documents, 48 entries, 19.6 MB   all inline base64 data URIs
 *
 *   largest document: 11.30 MB — 71% of MongoDB's hard 16 MB per-document limit
 *
 * So this is not the "injected keys" the plan anticipated: these are real reviewer
 * photos that were stored inline instead of uploaded. They are therefore UPLOADED AND
 * REPLACED BY THEIR KEY rather than quarantined away — quarantining would throw away
 * customer content. Only entries that are neither a valid data URI nor a key under the
 * owning business's prefix are dropped, and every dropped value is recorded in the
 * report so nothing disappears silently.
 *
 * Uploading also collapses those documents from megabytes to a few hundred bytes, which
 * is the real fix: at 71% of the BSON limit that review is a few photos away from being
 * unwritable.
 *
 * DRY RUN BY DEFAULT. --commit is required to upload or write, and --uri= has no
 * default so prod cannot be hit by accident.
 *
 * TAKE A BACKUP FIRST:
 *   node db-backups/backup.js --db massClick_dev --collections businessreviews \
 *     --label pre-rating-photos-quarantine --reason "0.6 ratingPhotos repair"
 *
 * Usage:
 *   node scripts/fixRatingPhotos.js --uri=... --out=report.json      # dry run
 *   node scripts/fixRatingPhotos.js --uri=... --commit
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";

import { uploadImageToS3 } from "../s3Uploder.js";
import { s3Keys } from "../utils/s3ObjectKeys.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const argv = process.argv.slice(2);
const flag = (n) => {
  const hit = argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : null;
};
const COMMIT = argv.includes("--commit");
const URI = flag("uri");
const OUT = flag("out");

if (!URI) {
  console.error("\n--uri=... is required (no default, so prod cannot be hit by accident).\n");
  process.exit(1);
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const reviewPhotoPrefix = (businessId) => `businessList/reviews/${businessId}/`;

const decodedBytes = (dataUri) => {
  const payload = dataUri.slice(dataUri.indexOf(",") + 1);
  return Math.floor((payload.length * 3) / 4);
};

const classify = (value, prefix) => {
  if (typeof value !== "string" || !value.trim()) return { action: "drop", reason: "not a string" };
  const v = value.trim();

  if (v.startsWith("data:image/")) {
    const bytes = decodedBytes(v);
    if (bytes > MAX_PHOTO_BYTES) return { action: "drop", reason: `oversized base64 (${(bytes / 1048576).toFixed(1)} MB)`, bytes };
    return { action: "upload", reason: "inline base64", bytes, mime: (v.match(/^data:([^;]+)/) || [])[1] || "?" };
  }

  if (v.startsWith(prefix) && !v.includes("..") && !/^https?:/i.test(v)) {
    return { action: "keep", reason: "already a key under this business" };
  }

  if (/^https?:/i.test(v)) return { action: "drop", reason: "absolute URL, not a key" };
  if (v.includes("/")) return { action: "drop", reason: "key outside this business's prefix" };
  return { action: "drop", reason: "unrecognised value" };
};

const dbName = (URI.split("/").pop() || "").split("?")[0];

console.log(`\n=== fixRatingPhotos ===`);
console.log(`database: ${dbName}`);
console.log(`mode:     ${COMMIT ? "COMMIT (uploads to S3 and writes to the DB)" : "DRY RUN (nothing is written)"}\n`);

const connection = await mongoose.createConnection(URI, { serverSelectionTimeoutMS: 8000 }).asPromise();
const collection = connection.db.collection("businessreviews");

const docs = await collection
  .find({ ratingPhotos: { $exists: true, $ne: [] } }, { projection: { ratingPhotos: 1, businessId: 1, userName: 1 } })
  .toArray();

const rows = [];
let uploads = 0;
let drops = 0;
let keeps = 0;
let bytesBefore = 0;

for (const doc of docs) {
  if (!Array.isArray(doc.ratingPhotos) || !doc.ratingPhotos.length) continue;

  const prefix = reviewPhotoPrefix(doc.businessId);
  const next = [];
  const entries = [];

  for (let i = 0; i < doc.ratingPhotos.length; i += 1) {
    const value = doc.ratingPhotos[i];
    const verdict = classify(value, prefix);
    bytesBefore += typeof value === "string" ? value.length : 0;

    if (verdict.action === "keep") {
      keeps += 1;
      next.push(value);
      entries.push({ index: i, ...verdict });
      continue;
    }

    if (verdict.action === "upload") {
      uploads += 1;
      if (COMMIT) {
        // Canonical key (step 1.4) — matches the live write path in reviewHelper.js,
        // not the legacy `prefix` used above only to recognise already-good entries.
        const uploadResult = await uploadImageToS3(value, s3Keys.business.reviewPhoto(doc.businessId));
        next.push(uploadResult.key);
        entries.push({ index: i, ...verdict, key: uploadResult.key });
      } else {
        // Push the placeholder too, so the dry-run's before/after counts reflect what
        // --commit would actually produce. Without this the report reads as though the
        // photos are being deleted.
        const placeholder = `businesses/${doc.businessId}/review-photo/<ulid>`;
        next.push(placeholder);
        entries.push({ index: i, ...verdict, key: placeholder });
      }
      continue;
    }

    drops += 1;
    // Record enough to identify it, never the whole blob.
    entries.push({ index: i, ...verdict, sample: String(value).slice(0, 120) });
  }

  rows.push({
    _id: String(doc._id),
    businessId: String(doc.businessId),
    userName: doc.userName || "",
    before: doc.ratingPhotos.length,
    after: next.length,
    entries,
  });

  // Compare by value: an upload keeps the count identical but changes every entry, so
  // a length check would skip exactly the documents that most need writing.
  const changed = JSON.stringify(next) !== JSON.stringify(doc.ratingPhotos);

  if (COMMIT && changed) {
    // Filter on the old value so a re-run matches zero documents.
    await collection.updateOne(
      { _id: doc._id, ratingPhotos: doc.ratingPhotos },
      { $set: { ratingPhotos: next } },
    );
  }
}

console.log(`documents with photos: ${rows.length}`);
console.log(`  entries to upload:   ${uploads}`);
console.log(`  entries kept as-is:  ${keeps}`);
console.log(`  entries dropped:     ${drops}`);
console.log(`  inline bytes today:  ${(bytesBefore / 1048576).toFixed(1)} MB\n`);

for (const r of rows) {
  console.log(`  ${r._id}  business ${r.businessId}  ${r.before} -> ${r.after} photos`);
  const byReason = {};
  for (const e of r.entries) byReason[`${e.action}: ${e.reason}`] = (byReason[`${e.action}: ${e.reason}`] || 0) + 1;
  for (const [k, v] of Object.entries(byReason)) console.log(`      ${String(v).padStart(3)} x ${k}`);
}

if (OUT) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), database: dbName, committed: COMMIT, uploads, keeps, drops, bytesBefore, rows }, null, 2));
  console.log(`\nreport written to ${OUT}`);
}

if (!COMMIT) {
  console.log(`\nDRY RUN — nothing was uploaded or written.`);
  console.log(`Take a backup, then re-run with --commit.\n`);
} else {
  console.log(`\nCOMMITTED.\n`);
}

await connection.close();
process.exit(0);
