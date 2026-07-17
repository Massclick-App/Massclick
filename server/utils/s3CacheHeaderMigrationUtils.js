export const TARGET_CACHE_MAX_AGE_SECONDS = 31536000;
export const TARGET_CACHE_CONTROL = `public, max-age=${TARGET_CACHE_MAX_AGE_SECONDS}`;

const parseCacheControl = (cacheControl = "") =>
  String(cacheControl)
    .split(",")
    .map((directive) => directive.trim().toLowerCase())
    .filter(Boolean);

export const hasSufficientBrowserCache = (cacheControl) => {
  const directives = parseCacheControl(cacheControl);

  if (
    directives.some(
      (directive) =>
        directive === "no-store" ||
        directive.startsWith("no-store=") ||
        directive === "no-cache" ||
        directive.startsWith("no-cache="),
    )
  ) {
    return false;
  }

  const maxAgeDirective = directives.find((directive) =>
    /^max-age\s*=/.test(directive),
  );
  const maxAgeMatch = maxAgeDirective?.match(/^max-age\s*=\s*"?(\d+)"?$/);

  if (!maxAgeMatch) {
    return false;
  }

  const maxAge = Number.parseInt(maxAgeMatch[1], 10);

  return Number.isFinite(maxAge) && maxAge >= TARGET_CACHE_MAX_AGE_SECONDS;
};

const encodeCopySource = (bucket, key) => {
  const encodedKey = String(key)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${encodeURIComponent(bucket)}/${encodedKey}`;
};

const copyDefinedValue = (target, source, property) => {
  if (
    source[property] !== undefined &&
    source[property] !== null &&
    source[property] !== ""
  ) {
    target[property] = source[property];
  }
};

export const buildCacheHeaderCopyParams = ({ bucket, key, head }) => {
  const params = {
    Bucket: bucket,
    CopySource: encodeCopySource(bucket, key),
    Key: key,
    CacheControl: TARGET_CACHE_CONTROL,
    Metadata: head.Metadata || {},
    MetadataDirective: "REPLACE",
    TaggingDirective: "COPY",
  };

  [
    "ContentDisposition",
    "ContentEncoding",
    "ContentLanguage",
    "ContentType",
    "Expires",
    "WebsiteRedirectLocation",
    "StorageClass",
    "ServerSideEncryption",
    "SSEKMSKeyId",
    "BucketKeyEnabled",
    "ObjectLockMode",
    "ObjectLockRetainUntilDate",
    "ObjectLockLegalHoldStatus",
  ].forEach((property) => copyDefinedValue(params, head, property));

  if (head.ETag) {
    params.CopySourceIfMatch = head.ETag;
  }

  return params;
};
