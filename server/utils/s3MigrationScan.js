/**
 * Shared database-walking / classification logic for the S3 key restructure CLI.
 *
 * Originally lived inline in scripts/s3KeyMigration.js's `scan` subcommand (step 0.1).
 * Extracted here, unchanged in behaviour, so `plan` (step 2.2) can reuse the exact same
 * classification instead of carrying a second copy that could drift from what `scan`
 * reports as the baseline. `readField` and `scanDatabase` gained one addition each —
 * `seq` (the variant name for `kind: "object"` fields) and per-owner
 * `entity`/`entityId`/`purpose` — both purely additive, so `scan`'s existing output is
 * unchanged.
 */
import mongoose from "mongoose";
import AWS from "aws-sdk";

import { SCOPES, registryCollections, validateRegistry } from "./s3ScopeRegistry.js";
import { extractS3Key, getByPath } from "./s3KeyUtils.js";

export const OBJECT_EXT =
  /\.(jpe?g|png|webp|gif|svg|avif|bmp|tiff?|pdf|mp4|mov|webm|mkv|docx?|xlsx?|pptx?|csv|zip|txt|heic|html?)$/i;

const die = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

/**
 * What is actually stored in this field on this document?
 *   key            a bare object key — the overwhelming majority
 *   url-ours       an absolute URL that resolves into our bucket (fcmCampaign.imageUrl,
 *                  seoBlog businessDetails[].bannerImage)
 *   url-external   an absolute URL somewhere else — never touched by the migration
 *   empty          "" / null / absent — not a reference
 *   junk           a string that is neither: a bare word, a data: URI, a path with
 *                  no extension. Needs eyes before the manifest is built.
 */
export const classify = (raw, bucket) => {
  if (raw === null || raw === undefined) return { shape: "empty", key: "" };
  if (typeof raw !== "string") return { shape: "junk", key: String(raw).slice(0, 200) };
  const value = raw.trim();
  if (!value) return { shape: "empty", key: "" };

  if (/^data:/i.test(value)) return { shape: "junk", key: value.slice(0, 60) };

  if (/^https?:\/\//i.test(value)) {
    const ours = (bucket && value.includes(bucket)) || /massclickdev|massclickprod/i.test(value);
    const key = extractS3Key(value);
    if (ours && key) return { shape: "url-ours", key };
    return { shape: "url-external", key: "" };
  }

  const bare = value.replace(/^\/+/, "").split("?")[0];
  if (!OBJECT_EXT.test(bare)) return { shape: "junk", key: bare };
  return { shape: "key", key: bare };
};

/**
 * Every stored reference on one document for one registry field, as
 * {locator, raw, seq} — `locator` is precise enough to rewrite the exact slot later.
 * `seq` is the variant name for `kind: "object"` fields (e.g. "webCard"), needed to
 * mint a stable+seq key; null for every other kind.
 */
export const readField = (doc, field) => {
  const out = [];
  const value = getByPath(doc, field.path);

  switch (field.kind) {
    case "single":
      out.push({ locator: field.path, raw: value, seq: null });
      break;

    case "array":
      if (Array.isArray(value)) {
        value.forEach((item, i) => out.push({ locator: `${field.path}[${i}]`, raw: item, seq: null }));
      } else if (value !== null && value !== undefined && value !== "") {
        // A scalar where the schema says array — real corruption, surfaced as junk.
        out.push({ locator: `${field.path}<NOT-ARRAY>`, raw: value, seq: null });
      }
      break;

    case "object":
      if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const key of field.keys) out.push({ locator: `${field.path}.${key}`, raw: value[key], seq: key });
      }
      break;

    case "arrayOfObjects":
      if (Array.isArray(value)) {
        value.forEach((item, i) => {
          if (item && typeof item === "object") {
            out.push({ locator: `${field.path}[${i}].${field.itemPath}`, raw: item[field.itemPath], seq: null });
          }
        });
      } else if (value !== null && value !== undefined && value !== "") {
        // This is exactly the `{"0":{…}}` corruption the setByPath bug produces.
        out.push({ locator: `${field.path}<NOT-ARRAY>.${field.itemPath}`, raw: null, seq: null, corrupt: true });
      }
      break;

    default:
      break;
  }

  return out;
};

/** entity/entityId/purpose for one field, honouring its optional per-field override. */
export const resolveIdentity = (scope, field, doc) => ({
  entity: field.entity || scope.entity,
  entityId: field.entityIdField ? doc[field.entityIdField] : doc._id,
  purpose: field.purpose,
});

export const connect = async (uri, label) => {
  const connection = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 8000 });
  try {
    await connection.asPromise();
  } catch (error) {
    if (/ECONNREFUSED|ETIMEDOUT|ServerSelection/i.test(error.message)) {
      die(
        `Cannot reach ${label} at ${uri.replace(/\/\/[^@]*@/, "//<redacted>@")}\n` +
          `  ${error.message}\n\n` +
          `The SSH tunnel to 127.0.0.1:27018 is almost certainly down. Reconnect it and re-run.`,
      );
    }
    throw error;
  }
  return connection;
};

/**
 * Walk one database through the registry. Read-only: find() and nothing else.
 *
 * `keyOwners`: key -> [{scopeKey, collection, docId, locator, valueShape, entity,
 * entityId, purpose, seq}]. The entity/entityId/purpose/seq quadruple is what `plan`
 * groups owners by to decide shared-identity vs cross-DB-split vs intra-DB fan-out —
 * see the plan's "Key referenced by BOTH databases" resolution table.
 */
export const scanDatabase = async (connection, dbLabel, bucket, { junkSampleLimit = 40 } = {}) => {
  const problems = await validateRegistry(connection.db);
  if (problems.length) {
    console.error(`\nRegistry does not match ${dbLabel}:`);
    for (const p of problems) console.error(`  - ${p}`);
    die("Refusing to scan against a registry that disagrees with the database.");
  }

  const perField = [];
  const shapeTotals = {};
  const keyOwners = new Map();
  const junkSamples = [];
  const externalSamples = [];
  const corruptArrays = [];

  for (const scope of Object.values(SCOPES)) {
    const collection = connection.db.collection(scope.collection);
    const docCount = await collection.countDocuments({});
    const matching = await collection.countDocuments(scope.buildQuery());

    const perFieldCounts = new Map();
    for (const field of scope.fields) {
      const id = `${field.path}${field.itemPath ? `.${field.itemPath}` : ""}`;
      perFieldCounts.set(id, { field, id, shapes: {}, refs: 0, distinct: new Set() });
    }

    const cursor = collection.find(scope.buildQuery(), { projection: scope.projection });
    for await (const doc of cursor) {
      for (const field of scope.fields) {
        const id = `${field.path}${field.itemPath ? `.${field.itemPath}` : ""}`;
        const bucketRow = perFieldCounts.get(id);
        const identity = resolveIdentity(scope, field, doc);

        for (const { locator, raw, seq, corrupt } of readField(doc, field)) {
          if (corrupt) {
            corruptArrays.push({ collection: scope.collection, docId: String(doc._id), locator });
            continue;
          }
          const { shape, key } = classify(raw, bucket);
          if (shape === "empty") continue;

          bucketRow.shapes[shape] = (bucketRow.shapes[shape] || 0) + 1;
          shapeTotals[shape] = (shapeTotals[shape] || 0) + 1;
          bucketRow.refs += 1;

          if (shape === "junk" && junkSamples.length < junkSampleLimit) {
            junkSamples.push({ collection: scope.collection, docId: String(doc._id), locator, value: key });
          }
          // Always collected in full, never capped — `plan` needs the complete list
          // for external.jsonl ("review the count before copying"); scan's own report
          // only ever displays a slice of it, via .slice(0, N) at the print call site.
          if (shape === "url-external") {
            externalSamples.push({ collection: scope.collection, docId: String(doc._id), locator, value: String(raw) });
          }

          if (shape === "key" || shape === "url-ours") {
            bucketRow.distinct.add(key);
            if (!keyOwners.has(key)) keyOwners.set(key, []);
            keyOwners.get(key).push({
              scopeKey: scope.scopeKey,
              collection: scope.collection,
              docId: String(doc._id),
              locator,
              valueShape: shape === "url-ours" ? "url" : "key",
              entity: identity.entity,
              entityId: identity.entityId === null || identity.entityId === undefined ? null : String(identity.entityId),
              purpose: identity.purpose,
              seq,
            });
          }
        }
      }
    }

    for (const row of perFieldCounts.values()) {
      perField.push({
        scopeKey: scope.scopeKey,
        collection: scope.collection,
        docCount,
        matchingDocs: matching,
        field: row.id,
        kind: row.field.kind,
        declaredShape: row.field.valueShape,
        stability: row.field.stability,
        refs: row.refs,
        distinctKeys: row.distinct.size,
        shapes: row.shapes,
      });
    }
  }

  return { perField, shapeTotals, keyOwners, junkSamples, externalSamples, corruptArrays };
};

/** _id overlap per collection — the "are these two databases clones?" question. */
export const compareIds = async (a, b, labelA, labelB) => {
  const rows = [];
  for (const name of registryCollections()) {
    const idsA = new Set(
      (await a.db.collection(name).find({}, { projection: { _id: 1 } }).toArray()).map((d) => String(d._id)),
    );
    const idsB = new Set(
      (await b.db.collection(name).find({}, { projection: { _id: 1 } }).toArray()).map((d) => String(d._id)),
    );
    let shared = 0;
    for (const id of idsA) if (idsB.has(id)) shared += 1;
    const union = idsA.size + idsB.size - shared;
    rows.push({
      collection: name,
      [labelA]: idsA.size,
      [labelB]: idsB.size,
      shared,
      onlyA: idsA.size - shared,
      onlyB: idsB.size - shared,
      overlapPct: union ? Number(((shared / union) * 100).toFixed(2)) : 100,
    });
  }
  return rows;
};

/** key -> size, ETag (quoted, as S3 returns it). ETag lets `verify-s3` catch a byte-changed object without a full re-download. */
export const listBucket = async (bucket) => {
  if (!bucket) die("AWS_S3_BUCKET_MASSCLICK is not set in server/.env.");
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  const s3 = new AWS.S3();

  const keys = new Map();
  let token;
  let pages = 0;
  do {
    const page = await s3
      .listObjectsV2({ Bucket: bucket, MaxKeys: 1000, ContinuationToken: token })
      .promise();
    for (const obj of page.Contents || []) keys.set(obj.Key, { size: obj.Size, etag: obj.ETag });
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
    pages += 1;
    process.stdout.write(`\r  listing bucket ${bucket}: ${keys.size} objects (${pages} pages)`);
  } while (token);
  process.stdout.write("\n");
  return keys;
};
