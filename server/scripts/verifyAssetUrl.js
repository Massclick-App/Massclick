/**
 * Executable gate for step 0.4 of the S3 key restructure.
 *
 * Proves the cache-busting mechanism itself. The other half of the 0.4 gate — that a
 * real browser with a warm cache serves the new bytes — cannot be asserted from Node
 * (curl and fetch have no stale copy to be wrong about) and is a manual check; see
 * S3_KEY_RESTRUCTURE_PROGRESS.md.
 *
 * Reads nothing and writes nothing — no database, no S3, no network. It only needs
 * server/.env for the bucket name and region used to build URLs.
 *
 * Usage:
 *   node scripts/verifyAssetUrl.js          # exits 0 on pass, 1 on any failure
 */
import { assetUrl, versionToken } from "../utils/assetUrl.js";
import { getSignedUrlByKey } from "../s3Uploder.js";

let passed = 0;
const failures = [];

const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failures.push(label);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    console.log(`          expected: ${JSON.stringify(expected)}`);
    console.log(`          actual:   ${JSON.stringify(actual)}`);
  }
};

const KEY = "businessList/qr/review-694e790c29ab18f9465e0f0f.png";
const UPDATED = new Date("2026-08-11T09:30:00.000Z");

console.log("\n=== versionToken ===\n");

check("Date -> base36 epoch", versionToken(UPDATED), UPDATED.getTime().toString(36));
check("ISO string matches the Date", versionToken(UPDATED.toISOString()), versionToken(UPDATED));
check("number", versionToken(1786423128622), (1786423128622).toString(36));
check("null", versionToken(null), "");
check("undefined", versionToken(undefined), "");
check("empty string", versionToken(""), "");
check("invalid Date", versionToken(new Date("nonsense")), "");
check("NaN", versionToken(NaN), "");
check("object is rejected", versionToken({}), "");
check("opaque token is sanitised", versionToken('"a1b2-c3/d4"'), "a1b2c3d4");

const token = versionToken(UPDATED);
check("token is URL-safe", /^[A-Za-z0-9]+$/.test(token), true);
check("token is short", token.length <= 16, true);

console.log("\n=== assetUrl ===\n");

const plain = getSignedUrlByKey(KEY);

check("no key -> empty string", assetUrl(""), "");
check("null key -> empty string", assetUrl(null), "");

// Adopting assetUrl at a call site with no version to hand must not change the URL.
check("no version -> byte-identical to getSignedUrlByKey", assetUrl(KEY), plain);
check("null version -> unchanged", assetUrl(KEY, { version: null }), plain);

check("version appends ?v=", assetUrl(KEY, { version: UPDATED }), `${plain}?v=${token}`);

// A token that changes per render would defeat caching rather than bust it.
check(
  "deterministic across calls",
  assetUrl(KEY, { version: UPDATED }) === assetUrl(KEY, { version: UPDATED }),
  true,
);
check(
  "a later updatedAt yields a different URL",
  assetUrl(KEY, { version: UPDATED }) !== assetUrl(KEY, { version: new Date(UPDATED.getTime() + 1000) }),
  true,
);
check(
  "different keys stay different",
  assetUrl(KEY, { version: UPDATED }) !== assetUrl("businessList/logos/logo.webp", { version: UPDATED }),
  true,
);

console.log("\n=== signed URLs are never versioned ===\n");

// aws-sdk v2 emits SigV2 here (AWSAccessKeyId/Signature), which signs only the
// canonicalised resource — so an extra query param would survive it TODAY. The rule
// still stands: SigV4 signs the whole query string and is the modern default, so an
// SDK upgrade or a signatureVersion config change would silently start producing
// SignatureDoesNotMatch. Signed URLs are unique per signature and already expire, so
// they have no staleness problem worth taking that risk for.
const signed = assetUrl(KEY, { version: UPDATED, signed: true });
check("signed URL carries no v= parameter", /[?&]v=/.test(signed), false);
check(
  "signed URL is still signed (SigV2 or SigV4)",
  /[?&](X-Amz-Signature|Signature)=/.test(signed),
  true,
);

console.log(`\n${"=".repeat(56)}`);
if (failures.length) {
  console.log(`FAILED — ${failures.length} of ${passed + failures.length} checks failed\n`);
  for (const f of failures) console.log(`  - ${f}`);
  console.log();
  process.exit(1);
}
console.log(`0.4 MECHANISM GATE PASSED — all ${passed} checks green`);
console.log(`(the warm-cache browser check is manual — see the progress file)\n`);
process.exit(0);
