/**
 * Executable gate for steps 1.1 and 1.2 of the S3 key restructure.
 *
 * Covers ULID generation (including the two properties that matter — monotonicity and
 * sortability) and the path registry (construction, parsing, round-tripping, and the
 * rejections that make bypass impossible).
 *
 * Reads nothing and writes nothing — no database, no S3, no network.
 *
 * Usage:
 *   node scripts/verifyS3ObjectKeys.js       # exits 0 on pass, 1 on any failure
 */
import { ulid, isUlid, ulidTime, ULID_RE, encodeUlidTime, MAX_ULID_TIME } from "../utils/idGen.js";
import {
  s3Path,
  s3Keys,
  parseS3Key,
  isCanonicalKey,
  entityPrefix,
  belongsToEntity,
  isS3PathToken,
  listCatalogue,
  CATEGORY_VARIANTS,
} from "../utils/s3ObjectKeys.js";

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

const throws = (label, fn) => {
  let threw = false;
  try { fn(); } catch { threw = true; }
  check(label, threw, true);
};

const BIZ = "6a5724fdc724249364e529cc";
const CAT = "690aea9cb2edd517f8846dc4";

console.log("\n=== idGen — ULID ===\n");

const a = ulid();
check("26 characters", a.length, 26);
check("matches ULID_RE", ULID_RE.test(a), true);
check("isUlid", isUlid(a), true);
check("no ambiguous letters I L O U", /[ILOU]/.test(a), false);
check("decodes its own timestamp", Math.abs(ulidTime(a) - Date.now()) < 5000, true);
// Asserted on the encoder directly: ulid(seedTime) deliberately routes a backwards
// seed through the monotonic guard, so ulid(0) would return the LAST timestamp.
check("encodes 0", encodeUlidTime(0), "0000000000");
check("encodes 32 (carries one base32 digit)", encodeUlidTime(32), "0000000010");
// "7ZZZZZZZZZ", not all-Z: ten base32 characters hold 50 bits (2^50-1), while the ULID
// spec caps the timestamp at 48 bits, so the leading character only ever reaches 7.
check("encodes the max timestamp", encodeUlidTime(MAX_ULID_TIME), "7ZZZZZZZZZ");
check("max timestamp round-trips", ulidTime(encodeUlidTime(MAX_ULID_TIME) + "0".repeat(16)), MAX_ULID_TIME);
check("encoding round-trips through ulidTime", ulidTime(encodeUlidTime(1700000000000) + "0".repeat(16)), 1700000000000);
throws("rejects a negative timestamp", () => encodeUlidTime(-1));
throws("rejects a timestamp beyond 48 bits", () => encodeUlidTime(MAX_ULID_TIME + 1));

// Monotonic within a millisecond: 31 of 32 upload paths use Date.now(), so two uploads
// in the same millisecond collide today. These must not.
const burst = Array.from({ length: 500 }, () => ulid());
check("500 rapid ids are unique", new Set(burst).size, 500);
const sorted = [...burst].sort();
check("500 rapid ids are already in sort order", sorted.every((v, i) => v === burst[i]), true);

// Same forced millisecond — the actual collision case.
const same = Array.from({ length: 100 }, () => ulid(1700000000000));
check("100 ids in ONE forced millisecond are unique", new Set(same).size, 100);
check("...and monotonic", [...same].sort().every((v, i) => v === same[i]), true);
check("...and share the time prefix", new Set(same.map((v) => v.slice(0, 10))).size, 1);

// A backwards clock step must not emit ids that sort before ones already issued.
const before = ulid(1700000000000);
const afterBackwards = ulid(1699999999000);
check("clock going backwards still sorts forward", afterBackwards > before, true);

check("isUlid rejects junk", [isUlid(""), isUlid("nope"), isUlid(null), isUlid("I".repeat(26))], [false, false, false, false]);

console.log("\n=== s3ObjectKeys — catalogue ===\n");

const cat = listCatalogue();
check("catalogue derived from the scope registry", cat.length >= 40, true);
check("every entry has a stability", cat.every((c) => c.stability === "stable" || c.stability === "versioned"), true);

console.log("\n=== construction ===\n");

const logo = s3Keys.business.logo(BIZ);
check("returns a branded token, not a string", typeof logo === "object" && isS3PathToken(logo), true);
check("a plain string is NOT a token", isS3PathToken(`businesses/${BIZ}/logo`), false);
check("token stringifies to the key", String(logo), `businesses/${BIZ}/logo`);
check("token.key", logo.key, `businesses/${BIZ}/logo`);
check("carries no extension", /\.[a-z]+$/.test(logo.key), false);

// Stable: regeneration must land on the SAME key, which is the whole point.
check("stable key is deterministic", s3Keys.business.logo(BIZ).key, s3Keys.business.logo(BIZ).key);
check("review QR is stable", s3Keys.business.reviewQr(BIZ).key, `businesses/${BIZ}/qr-review`);
check("profile QR is stable too (fixes the Date.now() orphan)", s3Keys.business.profileQr(BIZ).key, `businesses/${BIZ}/qr-profile`);

// Versioned: every call is a new object.
const g1 = s3Keys.business.gallery(BIZ).key;
const g2 = s3Keys.business.gallery(BIZ).key;
check("versioned keys differ per call", g1 !== g2, true);
check("versioned key shape", /^businesses\/[0-9a-f]{24}\/gallery\/[0-9A-HJKMNP-TV-Z]{26}$/.test(g1), true);

// Stable with a named variant.
check("category variant", s3Keys.category.variant(CAT, "webHero").key, `categories/${CAT}/variant/webHero`);
check("all six variants build", CATEGORY_VARIANTS.every((v) => s3Keys.category.variant(CAT, v).key.endsWith(`/${v}`)), true);

console.log("\n=== rejections — this is what makes bypass impossible ===\n");

throws("unknown entity", () => s3Path({ entity: "widgets", entityId: BIZ, purpose: "logo" }));
throws("unknown purpose for a known entity", () => s3Path({ entity: "businesses", entityId: BIZ, purpose: "nonsense" }));
throws("missing entityId", () => s3Path({ entity: "businesses", purpose: "logo" }));
throws("entityId that is not an ObjectId or ULID", () => s3Path({ entity: "businesses", entityId: "abc", purpose: "logo" }));
throws("path traversal in seq", () => s3Path({ entity: "categories", entityId: CAT, purpose: "variant", seq: "../../etc" }));
throws("uppercase entity", () => s3Path({ entity: "Businesses", entityId: BIZ, purpose: "logo" }));
throws("stable singleton rejects a seq", () => s3Path({ entity: "businesses", entityId: BIZ, purpose: "logo", seq: "extra" }));
throws("variant purpose requires a seq", () => s3Path({ entity: "categories", entityId: CAT, purpose: "variant" }));
throws("variant purpose rejects an unknown variant", () => s3Path({ entity: "categories", entityId: CAT, purpose: "variant", seq: "notAVariant" }));
check("a ULID is an acceptable entityId (no document yet)", typeof s3Path({ entity: "fcm-campaigns", entityId: ulid(), purpose: "image" }).key, "string");

console.log("\n=== parseS3Key / isCanonicalKey ===\n");

check("round-trips a stable key", parseS3Key(`businesses/${BIZ}/logo.webp`), {
  entity: "businesses", entityId: BIZ, purpose: "logo", id: null, seq: null, ext: "webp", stability: "stable",
});
const parsedVersioned = parseS3Key(`${g1}.webp`);
check("round-trips a versioned key", [parsedVersioned.entity, parsedVersioned.purpose, isUlid(parsedVersioned.id)], ["businesses", "gallery", true]);
check("round-trips a stable+seq key", parseS3Key(`categories/${CAT}/variant/webHero.webp`).seq, "webHero");
check("extension is optional", isCanonicalKey(`businesses/${BIZ}/logo`), true);
check("query string ignored", isCanonicalKey(`businesses/${BIZ}/logo.webp?v=abc`), true);

// Every legacy key must be rejected — `verify` relies on this to prove the rewrite.
const legacy = [
  "businessList/banners/banner-1766578459445.webp",
  "category/images/category-1761722447013.webp",
  "businessList/qr/review-694e790c29ab18f9465e0f0f.png",
  "home-sections/popular-search/1782977910086.webp",
  "seo/og-image-1780395622103.webp",
];
check("all 5 legacy shapes rejected", legacy.filter(isCanonicalKey).length, 0);

check("stable singleton with a ULID tail is rejected", isCanonicalKey(`businesses/${BIZ}/logo/${ulid()}`), false);
check("stable singleton with any tail is rejected", isCanonicalKey(`businesses/${BIZ}/logo/anything`), false);
check("variant purpose without a variant is rejected", isCanonicalKey(`categories/${CAT}/variant`), false);
check("variant purpose with an unknown variant is rejected", isCanonicalKey(`categories/${CAT}/variant/bogus`), false);
check("all six declared variants parse", CATEGORY_VARIANTS.every((v) => isCanonicalKey(`categories/${CAT}/variant/${v}.webp`)), true);
check("versioned purpose without a ULID is rejected", isCanonicalKey(`businesses/${BIZ}/gallery/whatever`), false);
check("wrong entity for the purpose is rejected", isCanonicalKey(`categories/${CAT}/logo`), false);
check("junk", [isCanonicalKey(""), isCanonicalKey(null), isCanonicalKey("a/b"), isCanonicalKey("a/b/c/d/e")], [false, false, false, false]);

console.log("\n=== entityPrefix / belongsToEntity — cascade delete and injection ===\n");

check("entityPrefix", entityPrefix("businesses", BIZ), `businesses/${BIZ}/`);
check("every key for an entity starts with its prefix", [s3Keys.business.logo(BIZ).key, s3Keys.business.gallery(BIZ).key, s3Keys.business.reviewQr(BIZ).key].every((k) => k.startsWith(entityPrefix("businesses", BIZ))), true);
check("belongsToEntity accepts its own key", belongsToEntity(s3Keys.business.logo(BIZ).key, "businesses", BIZ), true);
check("belongsToEntity rejects another business's key", belongsToEntity(s3Keys.business.logo(CAT.replace(/^./, "7")).key, "businesses", BIZ), false);
check("belongsToEntity rejects a legacy key", belongsToEntity("businessList/banners/x.webp", "businesses", BIZ), false);
throws("entityPrefix rejects a bad id", () => entityPrefix("businesses", "nope"));

console.log(`\n${"=".repeat(56)}`);
if (failures.length) {
  console.log(`FAILED — ${failures.length} of ${passed + failures.length} checks failed\n`);
  for (const f of failures) console.log(`  - ${f}`);
  console.log();
  process.exit(1);
}
console.log(`1.1 + 1.2 GATE PASSED — all ${passed} checks green\n`);
process.exit(0);
