/**
 * Cache-busted public URLs for S3 assets.
 *
 * Step 0.4 of the S3 key restructure. See S3_KEY_RESTRUCTURE_PROGRESS.md.
 *
 * WHY THIS EXISTS
 *
 * Uploads are stored with `Cache-Control: public, max-age=31536000`
 * ([s3Uploder.js:66](../s3Uploder.js)) — a ONE YEAR browser TTL. That is fine while
 * every key is unique per upload, which is the case today: of the 32 upload paths in
 * this codebase, 31 end in `Date.now()` and can never be overwritten.
 *
 * The exception is `businessList/qr/review-${businessId}`, which is deterministic. When
 * a review QR is regenerated with different content, anyone holding the cached image
 * keeps the OLD QR — pointing at the old URL — for up to a year.
 *
 * Phase 1 makes that the normal case rather than the exception: logo, avatar, all QR
 * codes, certificates and the six category variants all become deterministic so that
 * regeneration overwrites instead of orphaning. This module has to exist and be proven
 * BEFORE the first of those keys is written, which is why it is scheduled in Phase 0.
 *
 * Note that changing the upload header would not help: the 36,000+ objects already in
 * the bucket carry their stored `Cache-Control` forever. Versioning the URL is the only
 * fix that covers existing objects.
 *
 * USAGE
 *
 *   assetUrl(business.logoImageKey, { version: business.updatedAt })
 *   -> https://<bucket>.s3.<region>.amazonaws.com/businessList/logos/logo.webp?v=m9x1k2
 *
 * The token is derived from a value that changes when the asset changes — normally the
 * owning document's `updatedAt`. It must be DETERMINISTIC: a token that changes on every
 * render (Date.now(), a random value) defeats caching entirely rather than busting it.
 */
import { getSignedUrlByKey } from "../s3Uploder.js";

/**
 * Reduce a version input to a short, URL-safe, deterministic token.
 * Returns "" when there is nothing usable, in which case no parameter is appended and
 * the URL is byte-identical to what `getSignedUrlByKey` returns today.
 */
export const versionToken = (version) => {
  if (version === null || version === undefined) return "";

  if (version instanceof Date) {
    const ms = version.getTime();
    return Number.isFinite(ms) ? ms.toString(36) : "";
  }

  if (typeof version === "number") {
    return Number.isFinite(version) ? Math.trunc(version).toString(36) : "";
  }

  if (typeof version === "string") {
    const trimmed = version.trim();
    if (!trimmed) return "";

    // ISO date strings arrive whenever a document has been through JSON.
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) return parsed.toString(36);

    // Anything else (an ETag, a hash) — keep it URL-safe and short.
    const safe = trimmed.replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
    return safe;
  }

  return "";
};

/**
 * Public URL for an S3 key, with an optional cache-busting version parameter.
 *
 * Falls back to exactly `getSignedUrlByKey(key)` when no usable version is supplied, so
 * this is safe to adopt incrementally at a call site that has no version to hand.
 *
 * SIGNED URLs ARE NEVER VERSIONED. SigV4 signs the query string, so appending a
 * parameter to a signed URL produces `SignatureDoesNotMatch` and a broken asset. Signed
 * URLs are also unique per signature and already expire, so they have no staleness
 * problem to solve.
 */
export const assetUrl = (key, { version = null, signed = false, expiry = 3600 } = {}) => {
  if (!key) return "";

  const url = getSignedUrlByKey(key, { signed, expiry });
  if (!url) return "";
  if (signed) return url;

  const token = versionToken(version);
  if (!token) return url;

  return `${url}${url.includes("?") ? "&" : "?"}v=${token}`;
};

export default assetUrl;
