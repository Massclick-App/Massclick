import dotenv from "dotenv";
dotenv.config();

import AWS from "aws-sdk";
import sharp from "sharp";
import { isS3PathToken, isCanonicalKey, entityPrefix, belongsToEntity } from "./utils/s3ObjectKeys.js";

const assetsBucket = process.env.AWS_S3_BUCKET_MASSCLICK;
if (!assetsBucket) throw new Error("AWS S3 bucket not configured in env");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

/**
 * Step 1.3a of the S3 key restructure — the chokepoint every upload passes through.
 * See S3_KEY_RESTRUCTURE_PROGRESS.md.
 *
 * Accepts a branded `s3Path()` token, or a plain string ONLY if `isCanonicalKey()`
 * passes. A stray template literal is not a token and does not parse as canonical, so it
 * cannot slip through silently — it either warns or throws (strict, the default).
 *
 * S3_PATH_MODE now defaults to "strict" — the FINAL commit of step 1.4, flipped once
 * lintS3Paths.js reported zero legacy call sites across all 51 sites in 22 files. Bypass
 * is now actually impossible, not merely visible: an uncaught path resolves to nothing
 * a fresh call site can accidentally reintroduce. `S3_PATH_MODE=warn` remains available
 * as an emergency override (log and keep working) if something outside the lint's scan
 * surfaces after this deploys — server/ and client/ui-app/src only, so a call site added
 * elsewhere (a script directory it doesn't walk, a future workspace) would not be caught
 * by the static gate and would only be caught here, at runtime.
 */
const S3_PATH_MODE = String(process.env.S3_PATH_MODE || "strict").toLowerCase();
if (S3_PATH_MODE !== "warn" && S3_PATH_MODE !== "strict") {
  throw new Error(`S3_PATH_MODE must be "warn" or "strict", got ${JSON.stringify(process.env.S3_PATH_MODE)}`);
}

/** One warning per distinct (path, call site) pair — legacy call sites run on every request. */
const warnedLegacyPaths = new Set();

const callerLocation = () => {
  const frames = (new Error().stack || "").split("\n").slice(1);
  const frame = frames.find((line) => !line.includes("s3Uploder.js"));
  return frame ? frame.trim().replace(/^at\s+/, "") : "unknown call site";
};

export const resolveUploadPath = (uploadPath) => {
  if (isS3PathToken(uploadPath)) return uploadPath.key;

  if (typeof uploadPath !== "string" || !uploadPath) {
    throw new Error(
      `resolveUploadPath: expected an s3Path()/s3Keys token or a non-empty string, got ${JSON.stringify(uploadPath)}`,
    );
  }

  if (isCanonicalKey(uploadPath)) return uploadPath;

  if (S3_PATH_MODE === "strict") {
    throw new Error(
      `resolveUploadPath: "${uploadPath}" is not a canonical S3 key (S3_PATH_MODE=strict). ` +
        `Build it with s3Path()/s3Keys from utils/s3ObjectKeys.js.`,
    );
  }

  const site = callerLocation();
  const dedupeKey = `${uploadPath}::${site}`;
  if (!warnedLegacyPaths.has(dedupeKey)) {
    warnedLegacyPaths.add(dedupeKey);
    console.warn(
      `[S3_PATH_MODE=warn] legacy S3 path "${uploadPath}" is not canonical — ${site}. ` +
        `See S3_KEY_RESTRUCTURE_PROGRESS.md step 1.4.`,
    );
  }
  return uploadPath;
};

export const uploadImageToS3 = async (fileData, uploadPath, options = {}) => {
  const { skipImageConversion = false, contentType: forcedContentType = "", extension: forcedExtension = "" } = options;
  let fileBuffer;
  let mimeType;
  let extension;

  if (typeof fileData === "string" && fileData.startsWith("data:")) {
    const matches = fileData.match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (!matches) throw new Error("Invalid base64 string");

    mimeType = forcedContentType || matches[1];
    fileBuffer = Buffer.from(matches[2], "base64");
    extension = forcedExtension || mimeType.split("/")[1];
  }

  else if (Buffer.isBuffer(fileData)) {
    fileBuffer = fileData;
    mimeType = forcedContentType || "application/octet-stream";
    extension = forcedExtension || "bin";
  }

  else {
    throw new Error("Invalid file format. Must be Base64 or Buffer.");
  }

  let finalBuffer = fileBuffer;


  if (mimeType.startsWith("image/") && !skipImageConversion) {
    try {
      finalBuffer = await sharp(fileBuffer)
        .webp({ quality: 70 })
        .toBuffer();

      mimeType = "image/webp";
      extension = "webp";
    } catch (err) {
      console.error("WebP conversion failed → uploading original", err);
    }
  }

  const s3Key = `${resolveUploadPath(uploadPath)}.${extension}`;

  await s3.upload({
    Bucket: assetsBucket,
    Key: s3Key,
    Body: finalBuffer,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000',
  }).promise();

  return { key: s3Key };
};


// export const getSignedUrlByKey = (key, bucketName, expiryTime = 3600) => {
//   if (!key) return "";

//   return s3.getSignedUrl("getObject", {
//     Bucket: bucketName ?? assetsBucket,
//     Key: key,
//     Expires: expiryTime,
//   });
// };
export const getSignedUrlByKey = (key, { signed = false, expiry = 3600 } = {}) => {
  if (!key) return "";

  if (signed) {
    return s3.getSignedUrl("getObject", {
      Bucket: assetsBucket,
      Key: key,
      Expires: expiry,
    });
  }

  return `https://${assetsBucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export const getImageDataUrlByKey = async (key) => {
  if (!key) return "";

  try {
    const object = await s3.getObject({
      Bucket: assetsBucket,
      Key: key,
    }).promise();

    const buffer = Buffer.isBuffer(object.Body)
      ? object.Body
      : Buffer.from(object.Body || []);
    const contentType = object.ContentType || "image/webp";

    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.warn("Unable to read image data URL from S3:", error.message);
    return "";
  }
};

export const getObjectBufferByKey = async (key) => {
  if (!key) return null;

  const object = await s3.getObject({
    Bucket: assetsBucket,
    Key: key,
  }).promise();

  const content = Buffer.isBuffer(object.Body)
    ? object.Body
    : Buffer.from(object.Body || []);

  return {
    content,
    contentType: object.ContentType || "application/octet-stream",
  };
};

export const deleteObjectByKey = async (key) => {
  if (!key) return false;

  await s3.deleteObject({
    Bucket: assetsBucket,
    Key: key,
  }).promise();

  return true;
};

/**
 * Step 1.3c of the S3 key restructure — cascade delete via the entity prefix.
 * See S3_KEY_RESTRUCTURE_PROGRESS.md.
 *
 * `entityPrefix()` throws for a malformed entity/entityId before anything below runs,
 * so a bad call fails closed. Every key S3 returns for that prefix is then re-checked
 * with `belongsToEntity()` — a real parse against the registry, not a bare string
 * prefix test — and the WHOLE page is refused (nothing deleted) if even one key fails
 * to parse as owned by this entity. That refusal is deliberate: 34,000+ legacy objects
 * carry no owning entity id today, so nothing outside this new canonical scheme can ever
 * collide with a real prefix, but a refusal is always safer here than a partial delete.
 *
 * Nothing in the codebase calls this yet — 1.4 wires it up as entities gain real
 * cascade-delete support. Deleting an object is NOT reversible by `reverse` the way a
 * key rewrite is; only S3 versioning (0.2, Enabled) makes it undoable, via `undelete`.
 */
export const deleteEntityAssets = async (entity, entityId) => {
  const prefix = entityPrefix(entity, entityId);

  let continuationToken;
  let deletedCount = 0;
  const deletedKeys = [];

  do {
    const page = await s3
      .listObjectsV2({
        Bucket: assetsBucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
      .promise();

    const keys = (page.Contents || []).map((obj) => obj.Key);

    const rogue = keys.filter((key) => !belongsToEntity(key, entity, entityId));
    if (rogue.length) {
      throw new Error(
        `deleteEntityAssets: refusing to delete — S3 listed ${rogue.length} key(s) under prefix ` +
          `"${prefix}" that do not parse as canonical keys owned by ${entity}/${entityId}: ` +
          `${rogue.slice(0, 5).join(", ")}${rogue.length > 5 ? ", ..." : ""}`,
      );
    }

    if (keys.length) {
      await s3
        .deleteObjects({
          Bucket: assetsBucket,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        })
        .promise();
      deletedKeys.push(...keys);
      deletedCount += keys.length;
    }

    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return { entity, entityId: String(entityId), prefix, deletedCount, deletedKeys };
};
