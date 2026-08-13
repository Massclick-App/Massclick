/**
 * Retry policy + a tiny concurrency pool, shared by copy/verify-s3/rewrite (step 2.2).
 *
 * `withRetry`/`NON_RETRYABLE_AWS_CODES`/`RETRY_DELAYS_MS` are the plan's explicit
 * instruction — "Reuse withRetry + NON_RETRYABLE_AWS_CODES from
 * s3CacheHeaderMigrationHelper.js verbatim." That file doesn't export them (module-
 * private consts), so this is a byte-for-byte copy of the logic rather than an import.
 * If the cache-header helper's policy ever changes, this one does not follow it
 * automatically — check both if retry behaviour needs to change project-wide.
 */

export const NON_RETRYABLE_AWS_CODES = new Set([
  "AccessDenied",
  "InvalidAccessKeyId",
  "NoSuchBucket",
  "NoSuchKey",
  "NotFound",
  "SignatureDoesNotMatch",
]);

const RETRY_DELAYS_MS = [500, 1000, 2000, 4000, 8000];

export const withRetry = async (fn, retryCount = 3) => {
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      const retryable = !NON_RETRYABLE_AWS_CODES.has(error?.code);
      if (attempt === retryCount || !retryable) {
        throw error;
      }
      const delayMs = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Retry loop exited unexpectedly");
};

/**
 * Run `worker` over `items` with at most `limit` in flight at once. Not a queue
 * library — deliberately minimal, no new dependency, matches the plan's "8-16
 * concurrent CopyObject" sizing. Each result is {item, ok, value, error}; nothing
 * throws out of runPool itself, so one failure never aborts the rest of the batch.
 */
export const runPool = async (items, limit, worker, onProgress) => {
  const results = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  const runOne = async () => {
    while (nextIndex < items.length) {
      const i = nextIndex;
      nextIndex += 1;
      try {
        const value = await worker(items[i], i);
        results[i] = { item: items[i], ok: true, value };
      } catch (error) {
        results[i] = { item: items[i], ok: false, error };
      }
      completed += 1;
      if (onProgress) onProgress(completed, items.length, results[i]);
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) || 0 }, () => runOne());
  await Promise.all(workers);
  return results;
};

/** CopySource for aws-sdk v2's copyObject — encodes everything except the `/` separators. */
export const copySourceFor = (bucket, key) => `${bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
