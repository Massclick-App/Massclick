/**
 * Executable gate for the "duplicate deterministic newKey" hardening added after the
 * 2026-08-13 category rehearsal (run 01KZX58W744B4PH074VTZ3YKDA — see
 * S3_KEY_RESTRUCTURE_PROGRESS.md). Reproduces that exact incident as a fixture:
 * category `_id` 6a0c2eaf1cd0e0343e0ca37a had different `legacy-image` bytes in
 * massClick vs massClick_dev, both minted the same deterministic newKey, and `plan`
 * did not flag it — `copy` silently overwrote one DB's bytes with the other's.
 *
 * Pure unit test of utils/s3ManifestDedup.js — no fs, no S3, no database, no network.
 *
 * Usage:
 *   node scripts/verifyS3ManifestDedup.js   # exits 0 on pass, 1 on any failure
 */
import { resolveDuplicateNewKeys } from "../utils/s3ManifestDedup.js";

let passed = 0;
const failures = [];
let seq = 0;
const fakeUlid = () => `FAKE${(seq += 1)}`;

const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failures.push({ label, expected, actual });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    console.log(`          expected: ${JSON.stringify(expected)}`);
    console.log(`          actual:   ${JSON.stringify(actual)}`);
  }
};

// ---------------------------------------------------------------- fixture 1: the
// real incident — same entityId + purpose, different oldKey/size/etag per DB.

console.log("\n=== the 2026-08-13 category incident, reproduced ===\n");

seq = 0;
{
  const pendingRows = [
    {
      oldKey: "category/images/category-1781846772966.webp",
      newKey: "categories/6a0c2eaf1cd0e0343e0ca37a/legacy-image",
      size: 10434,
      etag: "\"dev-etag\"",
      mapKind: "shared",
      owners: [{ db: "massClick_dev", entity: "categories", entityId: "6a0c2eaf1cd0e0343e0ca37a", purpose: "legacy-image" }],
    },
    {
      oldKey: "category/images/category-1786095430007.webp",
      newKey: "categories/6a0c2eaf1cd0e0343e0ca37a/legacy-image",
      size: 11762,
      etag: "\"prod-etag\"",
      mapKind: "shared",
      owners: [{ db: "massClick", entity: "categories", entityId: "6a0c2eaf1cd0e0343e0ca37a", purpose: "legacy-image" }],
    },
  ];

  const result = resolveDuplicateNewKeys(pendingRows, { ulid: fakeUlid });

  check("duplicate-bytes group excluded from manifest", result.manifestRows.length, 0);
  check("duplicate-bytes group counted", result.duplicateNewKeyGroups, 1);
  check("no merge happened (bytes differ)", result.mergedNewKeyGroups, 0);
  check("one conflicts.jsonl entry emitted", result.conflictEntries.length, 1);
  check("conflict kind", result.conflictEntries[0].kind, "duplicate-newkey-diff-bytes");
  check("conflict newKey", result.conflictEntries[0].newKey, "categories/6a0c2eaf1cd0e0343e0ca37a/legacy-image");
  check("conflict carries both source rows", result.conflictEntries[0].rows.length, 2);
  check(
    "conflict rows carry the differing sizes",
    result.conflictEntries[0].rows.map((r) => r.size).sort(),
    [10434, 11762],
  );
}

// ---------------------------------------------------------------- fixture 2: same
// entityId + purpose, byte-identical across two oldKeys — must merge, not conflict.

console.log("\n=== byte-identical duplicate — safe merge, not a conflict ===\n");

seq = 0;
{
  const pendingRows = [
    {
      oldKey: "category/images/category-old-a.webp",
      newKey: "categories/6a1111111111111111111111/legacy-image",
      size: 5000,
      etag: "\"same-etag\"",
      mapKind: "shared",
      owners: [{ db: "massClick_dev", entity: "categories", entityId: "6a1111111111111111111111", purpose: "legacy-image" }],
    },
    {
      oldKey: "category/images/category-old-b.webp",
      newKey: "categories/6a1111111111111111111111/legacy-image",
      size: 5000,
      etag: "\"same-etag\"",
      mapKind: "shared",
      owners: [{ db: "massClick", entity: "categories", entityId: "6a1111111111111111111111", purpose: "legacy-image" }],
    },
  ];

  const result = resolveDuplicateNewKeys(pendingRows, { ulid: fakeUlid });

  check("merged into exactly one manifest row", result.manifestRows.length, 1);
  check("merge counted", result.mergedNewKeyGroups, 1);
  check("no conflict emitted", result.conflictEntries.length, 0);
  check("merged row keeps both owners", result.manifestRows[0].owners.length, 2);
  check("merged row records both source oldKeys", result.manifestRows[0].mergedFromOldKeys.length, 2);
  check("merged row has a fresh rowId", result.manifestRows[0].rowId, "FAKE1");
}

// ---------------------------------------------------------------- fixture 3: the
// ordinary case — one oldKey, one newKey, no collision. Must pass through untouched.

console.log("\n=== ordinary single-row case — unaffected by the hardening ===\n");

seq = 0;
{
  const pendingRows = [
    {
      oldKey: "advertisements/images/ad-1.webp",
      newKey: "advertisements/6a2222222222222222222222/creative/01ABCXYZ",
      size: 4321,
      etag: "\"ad-etag\"",
      mapKind: "shared",
      owners: [{ db: "massClick_dev", entity: "advertisements", entityId: "6a2222222222222222222222", purpose: "creative" }],
    },
  ];

  const result = resolveDuplicateNewKeys(pendingRows, { ulid: fakeUlid });

  check("single row passes straight through", result.manifestRows.length, 1);
  check("no merge", result.mergedNewKeyGroups, 0);
  check("no conflict", result.duplicateNewKeyGroups, 0);
  check("oldKey/newKey preserved", [result.manifestRows[0].oldKey, result.manifestRows[0].newKey], [
    "advertisements/images/ad-1.webp",
    "advertisements/6a2222222222222222222222/creative/01ABCXYZ",
  ]);
}

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  console.log("FAILURES:");
  for (const f of failures) console.log(`  - ${f.label}`);
  process.exit(1);
}
process.exit(0);
