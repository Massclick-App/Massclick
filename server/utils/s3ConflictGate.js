/**
 * The `copy --commit` conflicts gate, as a pure function — no fs, no S3, no DB, so it
 * can be unit-tested without a live environment. Same split-out-for-testability
 * rationale as `s3ManifestDedup.js`.
 *
 * WHY THIS EXISTS
 *
 * `plan` writes two very different things to the same `conflicts.jsonl`:
 *
 *   1. Kinds whose rows are EXCLUDED from the manifest — `duplicate-newkey-diff-bytes`
 *      (the two databases disagree about an entity's bytes), `missing-entity-id`, and
 *      `key-mint-failed`. These are dangerous precisely BECAUSE the affected rows are
 *      absent: copying would silently migrate a subset while the operator believes the
 *      run was complete. `duplicate-newkey-diff-bytes` is the 2026-08-13 category
 *      incident, where one database's bytes overwrote the other's at a shared
 *      deterministic key.
 *
 *   2. Kinds whose rows are INCLUDED in the manifest — `split` and `fanout`, i.e. one
 *      S3 object legitimately referenced by two different entities (a business banner
 *      that is also an seo-blog's `businessDetails[].bannerImage`). `plan`'s own
 *      docstring calls these "mechanically identical to build, but also logged to
 *      conflicts.jsonl for human review". Every owner still gets its own newKey and its
 *      own manifest row. Nothing is missing.
 *
 * The original gate refused on ANY non-empty conflicts.jsonl and told the operator to
 * "re-clone dev from prod and re-run plan". That advice cannot resolve case 2 — a
 * shared image is a permanent property of the data, not drift — so a full-scope run
 * was permanently blocked by rows that carry no risk. This module keeps case 1
 * absolutely unbypassable and makes case 2 acknowledgeable.
 *
 * FAIL-CLOSED BY DESIGN: any conflict kind not explicitly listed as reviewable is
 * treated as blocking. If a future `plan` change introduces a new kind, it blocks
 * until someone classifies it here on purpose — it can never be waved through by an
 * existing `--acknowledge-conflicts` value.
 */

/** Rows EXCLUDED from the manifest. No flag may ever bypass these. */
export const BLOCKING_KINDS = Object.freeze(["duplicate-newkey-diff-bytes", "missing-entity-id", "key-mint-failed"]);

/** Rows INCLUDED in the manifest, logged for human review only. */
export const REVIEWABLE_KINDS = Object.freeze(["split", "fanout"]);

const isReviewable = (kind) => REVIEWABLE_KINDS.includes(kind);

/**
 * @param {object}   args
 * @param {object[]} args.conflictRows    parsed rows of conflicts.jsonl (may be empty)
 * @param {string?}  args.acknowledgeRaw  raw `--acknowledge-conflicts=` value, or null
 *                                        when the flag was absent
 * @param {string}   [args.runId]         only used to build the message text
 * @returns {{allowed: boolean, reason: string|null, counts: object,
 *            blocking: number, reviewable: number}}
 */
export const evaluateConflictGate = ({ conflictRows = [], acknowledgeRaw = null, runId = "<run>" } = {}) => {
  const counts = {};
  let blocking = 0;
  let reviewable = 0;

  for (const row of conflictRows) {
    const kind = row?.kind || "(missing kind)";
    counts[kind] = (counts[kind] || 0) + 1;
    if (isReviewable(kind)) reviewable += 1;
    else blocking += 1; // includes every unrecognised kind — fail closed
  }

  const kindSummary = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([kind, n]) => `    ${n} × ${kind}${isReviewable(kind) ? "" : "   <-- BLOCKING"}`)
    .join("\n");

  // 1. Blocking kinds refuse unconditionally, whatever the flag says.
  if (blocking > 0) {
    return {
      allowed: false,
      blocking,
      reviewable,
      counts,
      reason:
        `run ${runId} has ${blocking} BLOCKING conflict entr${blocking === 1 ? "y" : "ies"} — copy --commit refuses, and no flag can override this.\n` +
        `${kindSummary}\n\n` +
        `  These kinds are excluded from manifest.jsonl, so the affected objects would be silently\n` +
        `  left behind while the run reported success. Resolve the underlying data (for a\n` +
        `  duplicate-newkey-diff-bytes, re-clone dev from prod so both sides agree on the bytes),\n` +
        `  then re-run \`plan\` to mint a fresh, clean manifest.`,
    };
  }

  // 2. Nothing at all to acknowledge. A stale flag value here almost certainly means
  //    the operator is pointing at a different run than they think.
  if (reviewable === 0) {
    const acknowledged = acknowledgeRaw === null ? null : Number(acknowledgeRaw);
    if (acknowledged !== null && acknowledged !== 0) {
      return {
        allowed: false,
        blocking,
        reviewable,
        counts,
        reason:
          `--acknowledge-conflicts=${acknowledgeRaw} was passed, but run ${runId} has NO conflicts to acknowledge.\n` +
          `  That mismatch usually means the flag was copied from a different run. Re-check --run=.`,
      };
    }
    return { allowed: true, blocking, reviewable, counts, reason: null };
  }

  // 3. Reviewable-only. Require the exact count, so acknowledging requires having read
  //    the file rather than reflexively appending a flag.
  if (acknowledgeRaw === null) {
    return {
      allowed: false,
      blocking,
      reviewable,
      counts,
      reason:
        `run ${runId} has ${reviewable} conflict entr${reviewable === 1 ? "y" : "ies"} for review — copy --commit refuses until they are acknowledged.\n` +
        `${kindSummary}\n\n` +
        `  These rows ARE present in manifest.jsonl: each owner mints its own newKey and is\n` +
        `  rewritten independently, so nothing is missing from the run. They are logged because\n` +
        `  one S3 object being referenced by two different entities is worth a human look —\n` +
        `  "a large count is a stop signal".\n\n` +
        `  Read them first:\n` +
        `    _migrations/s3-key-restructure/${runId}/conflicts.jsonl\n\n` +
        `  Then re-run with the exact count:\n` +
        `    --acknowledge-conflicts=${reviewable}`,
    };
  }

  const acknowledged = Number(acknowledgeRaw);
  if (!Number.isInteger(acknowledged) || acknowledged !== reviewable) {
    return {
      allowed: false,
      blocking,
      reviewable,
      counts,
      reason:
        `--acknowledge-conflicts=${acknowledgeRaw} does not match run ${runId}'s ${reviewable} reviewable conflict entr${reviewable === 1 ? "y" : "ies"}.\n` +
        `  The count must match exactly. If it changed since you last looked, the plan changed —\n` +
        `  re-read conflicts.jsonl before acknowledging.`,
    };
  }

  return { allowed: true, blocking, reviewable, counts, reason: null };
};
