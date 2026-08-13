/**
 * Second-pass dedup for `s3KeyMigration.js plan` — step 2.2 hardening.
 *
 * A deterministic newKey is minted from (entity, entityId, purpose, seq) alone, with
 * no dependency on the source bytes. Two DIFFERENT oldKeys (typically the same
 * entity's dev-DB image and prod-DB image) can therefore independently mint the SAME
 * newKey. `plan`'s main loop processes one oldKey at a time, so that collision is
 * invisible until every oldKey has been seen — this module is that second pass.
 *
 * This is the exact bug that fired in the 2026-08-13 category rehearsal (run
 * 01KZX58W744B4PH074VTZ3YKDA): category `_id` 6a0c2eaf1cd0e0343e0ca37a had different
 * image bytes in massClick vs massClick_dev, both mapped to the same deterministic
 * `categories/<id>/legacy-image` key, and `copy` silently overwrote one with the
 * other because nothing flagged it. See S3_KEY_RESTRUCTURE_PROGRESS.md for the
 * incident writeup.
 *
 * Extracted as a pure function (no fs, no S3, no DB) so it can be unit-tested with
 * plain fixtures — see server/scripts/verifyS3ManifestDedup.js.
 */

/** `${size}:${etag}` — deliberately excludes oldKey, since two different oldKeys can
 * legitimately hold byte-identical copies of the same image. */
const byteSig = (row) => `${row.size}:${row.etag}`;

/**
 * @param {Array<{oldKey:string, newKey:string, size:number, etag:string, mapKind:string, owners:Array}>} pendingRows
 *   One entry per (oldKey, group) pair from plan's main loop — NOT yet deduped by newKey.
 * @returns {{
 *   manifestRows: Array,        // rows safe to write to manifest.jsonl, each with a fresh rowId
 *   conflictEntries: Array,     // rows to write to conflicts.jsonl, kind "duplicate-newkey-diff-bytes"
 *   mergedNewKeyGroups: number, // count of newKeys where >1 oldKey collapsed into one row (safe, byte-identical)
 *   duplicateNewKeyGroups: number, // count of newKeys where sources genuinely disagree (unsafe, excluded from manifest)
 * }}
 */
export const resolveDuplicateNewKeys = (pendingRows, { ulid }) => {
  const byNewKey = new Map();
  for (const row of pendingRows) {
    if (!byNewKey.has(row.newKey)) byNewKey.set(row.newKey, []);
    byNewKey.get(row.newKey).push(row);
  }

  const manifestRows = [];
  const conflictEntries = [];
  let mergedNewKeyGroups = 0;
  let duplicateNewKeyGroups = 0;

  for (const [newKey, rowsForKey] of byNewKey) {
    if (rowsForKey.length === 1) {
      manifestRows.push({ rowId: ulid(), ...rowsForKey[0] });
      continue;
    }

    const distinctBytes = new Set(rowsForKey.map(byteSig));

    if (distinctBytes.size === 1) {
      mergedNewKeyGroups += 1;
      manifestRows.push({
        rowId: ulid(),
        oldKey: rowsForKey[0].oldKey,
        newKey,
        size: rowsForKey[0].size,
        etag: rowsForKey[0].etag,
        mapKind: "merged-duplicate-newkey",
        mergedFromOldKeys: rowsForKey.map((r) => r.oldKey),
        owners: rowsForKey.flatMap((r) => r.owners),
      });
      continue;
    }

    duplicateNewKeyGroups += 1;
    conflictEntries.push({
      newKey,
      kind: "duplicate-newkey-diff-bytes",
      rows: rowsForKey.map((r) => ({ oldKey: r.oldKey, size: r.size, etag: r.etag, owners: r.owners })),
    });
  }

  return { manifestRows, conflictEntries, mergedNewKeyGroups, duplicateNewKeyGroups };
};
