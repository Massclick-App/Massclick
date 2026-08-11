/**
 * Executable gate for step 0.3 of the S3 key restructure.
 *
 * The server has no test framework ("test": "echo Error: no test specified"), so
 * correctness here is a runnable reconciliation rather than a suite. This asserts
 * the two bugs that were live in three shipped helpers stay fixed, and that a
 * fixture carrying all four array-of-subdocument shapes survives a round trip with
 * Array.isArray() true on every path.
 *
 * Reads nothing and writes nothing — no database, no S3, no network.
 *
 * Usage:
 *   node scripts/verifyS3KeyUtils.js         # exits 0 on pass, 1 on any failure
 */
import {
  extractS3Key,
  getByPath,
  isWebpKey,
  setByPath,
  setUpdatePath,
  toWebpKey,
} from "../utils/s3KeyUtils.js";

let passed = 0;
const failures = [];

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

const BASE = "https://massclickdev.s3.ap-southeast-2.amazonaws.com";

console.log("\n=== extractS3Key ===\n");

check("bare key passes through", extractS3Key("businessList/banners/x.webp"), "businessList/banners/x.webp");
check("single absolute URL", extractS3Key(`${BASE}/businessList/banners/x.webp`), "businessList/banners/x.webp");
check("query string dropped", extractS3Key(`${BASE}/seo/og-1.webp?v=123`), "seo/og-1.webp");
check("leading slash dropped", extractS3Key("/category/images/x.webp"), "category/images/x.webp");

// THE BUG: the shipped version stripped one level and returned a still-doubled
// string. Real data in seopagecontentblogs.businessDetails[].bannerImage has four.
check("doubled base URL", extractS3Key(`${BASE}/${BASE}/businessList/banners/x.jpg`), "businessList/banners/x.jpg");
check(
  "quadrupled base URL (real data)",
  extractS3Key(`${BASE}/${BASE}/${BASE}/${BASE}/businessList/banners/banner-1768806705739.jpg`),
  "businessList/banners/banner-1768806705739.jpg",
);

check("empty string", extractS3Key(""), "");
check("null", extractS3Key(null), "");
check("non-string", extractS3Key(42), "");
check("whitespace trimmed", extractS3Key("  businessList/x.webp  "), "businessList/x.webp");

console.log("\n=== isWebpKey / toWebpKey ===\n");

check("isWebpKey on URL", isWebpKey(`${BASE}/category/images/x.webp`), true);
check("isWebpKey on jpg", isWebpKey("category/images/x.jpg"), false);
check("toWebpKey rewrites ext", toWebpKey("category/images/x.jpg"), "category/images/x.webp");
check("toWebpKey idempotent", toWebpKey("category/images/x.webp"), "category/images/x.webp");
check("toWebpKey keeps dotted dirs", toWebpKey("a.b/c/x.png"), "a.b/c/x.webp");

console.log("\n=== getByPath ===\n");

const doc = {
  qrCode: { qrImageKey: "k1", qrText: "https://example.test/r/1" },
  mediaItems: [{ mediaKey: "m0" }, { mediaKey: "m1" }],
  zero: 0,
  emptyString: "",
};
check("nested read", getByPath(doc, "qrCode.qrImageKey"), "k1");
check("array index read", getByPath(doc, "mediaItems.1.mediaKey"), "m1");
check("missing path", getByPath(doc, "nope.deeper"), undefined);
// The old implementation short-circuited on any falsy intermediate value.
check("falsy value is returned, not skipped", getByPath(doc, "zero"), 0);
check("empty string is returned", getByPath(doc, "emptyString"), "");

console.log("\n=== setByPath — array preservation (THE 0.3 GATE) ===\n");

// The four array-of-subdocument shapes named in the plan.
const fixture = {
  mediaItems: [{ mediaKey: "old-0" }, { mediaKey: "old-1" }],
  businessDetails: [{ bannerImageKey: "old-b0" }, { bannerImageKey: "old-b1" }],
  evidenceFiles: [{ key: "old-e0" }],
  popularSearchCards: [{ imageKey: "old-p0" }, { imageKey: "old-p1" }],
};

setByPath(fixture, "mediaItems.0.mediaKey", "new-0");
setByPath(fixture, "mediaItems.1.mediaKey", "new-1");
setByPath(fixture, "businessDetails.1.bannerImageKey", "new-b1");
setByPath(fixture, "evidenceFiles.0.key", "new-e0");
setByPath(fixture, "popularSearchCards.0.imageKey", "new-p0");

for (const path of ["mediaItems", "businessDetails", "evidenceFiles", "popularSearchCards"]) {
  check(`${path} is still an Array`, Array.isArray(fixture[path]), true);
}
check("array values updated", fixture.mediaItems, [{ mediaKey: "new-0" }, { mediaKey: "new-1" }]);
check("untouched sibling element preserved", fixture.businessDetails[0], { bannerImageKey: "old-b0" });
check("lengths unchanged", [fixture.mediaItems.length, fixture.popularSearchCards.length], [2, 2]);

// Building a missing container from nothing: the old version produced {"0":{…}}.
const fromScratch = {};
setByPath(fromScratch, "mediaItems.0.mediaKey", "k");
check("missing numeric segment creates an Array, not an object", Array.isArray(fromScratch.mediaItems), true);
check("missing named segment still creates an object", (() => {
  const o = {};
  setByPath(o, "qrCode.qrImageKey", "k");
  return Array.isArray(o.qrCode);
})(), false);

console.log("\n=== setUpdatePath — $set payloads keep siblings ===\n");

// The bug that already fired on 4,442 prod documents: setByPath built
// { qrCode: { qrImageKey } }, and $set on that replaces the whole subdocument,
// discarding qrText and createdAt.
const updates = {};
setUpdatePath(updates, "qrCode.qrImageKey", "new-key");
setUpdatePath(updates, "mediaItems.0.mediaKey", "new-media");
setUpdatePath(updates, "updatedAt", "2026-08-11");

check("dotted keys, no nesting", updates, {
  "qrCode.qrImageKey": "new-key",
  "mediaItems.0.mediaKey": "new-media",
  updatedAt: "2026-08-11",
});
check(
  "no update key holds a nested object (would replace a subdocument)",
  Object.values(updates).every((v) => typeof v !== "object" || v === null),
  true,
);

console.log(`\n${"=".repeat(56)}`);
if (failures.length) {
  console.log(`FAILED — ${failures.length} of ${passed + failures.length} checks failed\n`);
  for (const f of failures) console.log(`  - ${f.label}`);
  console.log();
  process.exit(1);
}
console.log(`0.3 GATE PASSED — all ${passed} checks green\n`);
process.exit(0);
