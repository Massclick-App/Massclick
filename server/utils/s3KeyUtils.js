/**
 * Shared helpers for reading and rewriting S3 key references on documents.
 *
 * These were duplicated in three shipped helpers — s3WebpMigrationHelper.js,
 * businessWebpMigrationHelper.js and categoryHelper.js — with three subtly
 * different implementations. This is now the only copy. Step 0.3 of the S3 key
 * restructure; see S3_KEY_RESTRUCTURE_PROGRESS.md.
 *
 * Two of the copied implementations carried live bugs, both fixed here.
 */

/**
 * Reduce any stored image reference to a bare S3 object key.
 *
 * Accepts a bare key, an absolute URL, a signed URL, or a URL whose base has been
 * prepended more than once, and returns the key with no leading slash and no query
 * string. Returns "" for anything unusable.
 *
 * BUG FIXED (1 of 2): the previous implementation stripped a repeated base URL
 * exactly ONCE, via a single regex match on "/https://". Real data has the base
 * prepended up to four times —
 *
 *   https://<bucket>.s3.../https://<bucket>.s3.../https://<bucket>.s3.../businessList/banners/x.jpg
 *
 * — so one pass returned a still-doubled string, which then matched no object.
 * 51 of the 45-odd broken references found by `s3KeyMigration.js scan` are this.
 * Stripping until the value stops changing handles any depth.
 */
export const extractS3Key = (value) => {
  if (!value || typeof value !== "string") return "";
  let current = value.trim();
  if (!current) return "";

  // Bounded rather than while(true): a pathological value can't spin here.
  for (let i = 0; i < 8 && /^https?:\/\//i.test(current); i += 1) {
    let next;
    try {
      next = new URL(current).pathname.replace(/^\/+/, "");
    } catch {
      return current;
    }
    if (!next || next === current) return current;
    current = next;
  }

  // A stored value occasionally carries a leading slash ("/category/images/x.webp").
  // No S3 key begins with one, so it would never match an object. Normalise it.
  return current.split("?")[0].replace(/^\/+/, "");
};

export const isWebpKey = (value) => extractS3Key(value).toLowerCase().endsWith(".webp");

export const toWebpKey = (value) => {
  const key = extractS3Key(value);
  if (!key) return "";
  if (key.toLowerCase().endsWith(".webp")) return key;
  return `${key.replace(/\.[^./]+$/, "")}.webp`;
};

/**
 * Read a dotted path, including numeric segments for array indices
 * ("mediaItems.0.mediaKey").
 *
 * Uses a null check rather than the previous truthiness check, so a legitimately
 * falsy intermediate value (0, "") doesn't silently abort the walk.
 */
export const getByPath = (obj, path) =>
  path
    .split(".")
    .reduce((acc, part) => (acc === null || acc === undefined ? undefined : acc[part]), obj);

/**
 * Write a dotted path on an in-memory object, creating missing containers.
 *
 * BUG FIXED (2 of 2): the previous implementation created a plain `{}` for every
 * missing segment, so writing "mediaItems.0.mediaKey" onto a fresh object produced
 *
 *   { mediaItems: { "0": { mediaKey: … } } }        <- an object, not an array
 *
 * That is the array corruption the restructure plan calls out. A missing segment
 * whose *next* segment is numeric is now created as an array, and an existing
 * container is never replaced — so a real array stays an array.
 *
 * NOTE: for building a MongoDB `$set` payload, use `setUpdatePath` instead. This
 * function is for mutating plain in-memory objects.
 */
export const setByPath = (obj, path, value) => {
  const parts = path.split(".");
  let cursor = obj;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const existing = cursor[part];

    if (existing === null || existing === undefined || typeof existing !== "object") {
      cursor[part] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }

    cursor = cursor[part];
  }

  cursor[parts[parts.length - 1]] = value;
};

/**
 * Record one field update for a MongoDB `$set`, keyed by its dotted path.
 *
 * This exists because building the update document with `setByPath` — which is what
 * all three helpers did — is silently destructive. `setByPath(updates, "qrCode.qrImageKey", k)`
 * produces `{ qrCode: { qrImageKey: k } }`, and
 *
 *   updateOne({ _id }, { $set: { qrCode: { qrImageKey: k } } })
 *
 * REPLACES the whole `qrCode` subdocument, discarding `qrText` and `createdAt`.
 * That already happened: 4,442 businesses in prod and 4,443 in dev have a
 * `qrCode.qrImageKey` and no siblings, and every one of them has a `.webp` key —
 * i.e. exactly the documents the WebP migration touched.
 *
 * A dotted key sets only the leaf and leaves siblings alone:
 *
 *   { $set: { "qrCode.qrImageKey": k } }            <- siblings preserved
 *   { $set: { "mediaItems.0.mediaKey": k } }        <- array stays an array
 */
export const setUpdatePath = (updates, path, value) => {
  updates[path] = value;
};
