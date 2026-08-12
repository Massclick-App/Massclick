/**
 * Executable gate for step 1.3 of the S3 key restructure (pieces a and c).
 * See S3_KEY_RESTRUCTURE_PROGRESS.md.
 *
 * Proves the two runtime mechanisms without ever touching S3 or a database:
 *
 *   - `resolveUploadPath()` in `warn` mode and in `strict` mode (the shipped default
 *     since 1.4's final commit — every legacy call site is migrated, so bypass is
 *     actually impossible now, not merely visible), including that a legacy string
 *     still uploads in warn mode but is logged, and that strict mode throws instead, AND
 *     that omitting S3_PATH_MODE entirely now resolves to strict, not warn. `S3_PATH_MODE`
 *     is read once at module load, so each mode is exercised by importing s3Uploder.js
 *     fresh with a cache-busting query string.
 *   - `deleteEntityAssets()`'s refusal guard: `entityPrefix()` throws for a malformed
 *     entity/entityId BEFORE any AWS call, so the rejection here is proof the guard
 *     fires with no network involved — nothing further in the function ever runs.
 *
 * Step 1.3b (`lintS3Paths.js`) is its own script and is NOT re-covered here — it is a
 * static source scan and reads no runtime code path.
 *
 * Reads nothing and writes nothing — no database, no S3, no network. Only needs
 * server/.env for the bucket name and region used at import time (same as
 * verifyAssetUrl.js).
 *
 * Usage:
 *   node scripts/verifyS3PathEnforcement.js       # exits 0 on pass, 1 on any failure
 */
import { s3Keys, isCanonicalKey } from "../utils/s3ObjectKeys.js";

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

const rejects = async (label, promise) => {
  let message = null;
  try {
    await promise;
  } catch (err) {
    message = err.message;
  }
  check(label, message !== null, true);
  return message;
};

const BIZ = "6a5724fdc724249364e529cc";
const LEGACY = `businessList/banners/banner-${Date.now()}`;

/** Fresh import so the module-level S3_PATH_MODE constant is re-read for this mode. */
const loadUploader = async (mode) => {
  const prev = process.env.S3_PATH_MODE;
  if (mode === undefined) delete process.env.S3_PATH_MODE;
  else process.env.S3_PATH_MODE = mode;
  try {
    return await import(`../s3Uploder.js?mode=${mode ?? "default"}&t=${Date.now()}-${Math.random()}`);
  } finally {
    if (prev === undefined) delete process.env.S3_PATH_MODE;
    else process.env.S3_PATH_MODE = prev;
  }
};

const withCapturedWarnings = async (fn) => {
  const calls = [];
  const original = console.warn;
  console.warn = (...args) => calls.push(args.join(" "));
  try {
    await fn();
  } finally {
    console.warn = original;
  }
  return calls;
};

console.log("\n=== resolveUploadPath — invalid S3_PATH_MODE ===\n");

{
  let threw = false;
  try {
    await loadUploader("nonsense");
  } catch {
    threw = true;
  }
  check("rejects an unrecognised S3_PATH_MODE value", threw, true);
}

console.log("\n=== resolveUploadPath — warn mode (explicit opt-in) ===\n");

{
  const { resolveUploadPath } = await loadUploader("warn");

  const token = s3Keys.business.logo(BIZ);
  check("branded token resolves to its key", resolveUploadPath(token), token.key);

  const canonical = `businesses/${BIZ}/gallery/01HT8Z9K2X3Y4Z5A6B7C8D9E0F`;
  check("already-canonical string passes through unchanged", isCanonicalKey(canonical), true);
  check("...and resolveUploadPath returns it as-is", resolveUploadPath(canonical), canonical);

  // The dedupe key includes column, not just line, so two calls must come from the
  // exact same EXPRESSION — not merely the same line — to collide. A loop body is one
  // expression executed twice, which is what "the same call site hit twice" means in
  // practice: 51 real call sites each run once per request, repeatedly, from one spot.
  const callLegacyTwice = () => {
    const out = [];
    for (let i = 0; i < 2; i += 1) out.push(resolveUploadPath(LEGACY));
    return out;
  };

  let legacyResults;
  let legacyThrew = false;
  const warnings = await withCapturedWarnings(() => {
    try {
      legacyResults = callLegacyTwice();
    } catch {
      legacyThrew = true;
    }
  });
  check("warn mode does NOT throw on a legacy path (uploads must keep working)", legacyThrew, false);
  check("warn mode returns the legacy path unchanged", legacyResults, [LEGACY, LEGACY]);
  check("the SAME (path, call site) pair warns once, not twice", warnings.length, 1);
  check("...naming the offending path", warnings[0]?.includes(LEGACY), true);

  for (const bad of [undefined, null, 42, {}]) {
    let threw = false;
    try {
      resolveUploadPath(bad);
    } catch {
      threw = true;
    }
    check(`rejects a non-string, non-token value: ${JSON.stringify(bad)}`, threw, true);
  }
}

console.log("\n=== resolveUploadPath — strict mode ===\n");

{
  // No S3_PATH_MODE at all — proves the shipped DEFAULT is strict, not just that
  // strict works when asked for explicitly.
  const { resolveUploadPath: resolveDefault } = await loadUploader(undefined);
  let defaultThrew = false;
  try {
    resolveDefault(LEGACY);
  } catch {
    defaultThrew = true;
  }
  check("omitting S3_PATH_MODE now defaults to strict", defaultThrew, true);

  const { resolveUploadPath } = await loadUploader("strict");

  const token = s3Keys.business.logo(BIZ);
  check("branded token still resolves in strict mode", resolveUploadPath(token), token.key);

  const canonical = `businesses/${BIZ}/gallery/01HT8Z9K2X3Y4Z5A6B7C8D9E0F`;
  check("canonical string still passes through in strict mode", resolveUploadPath(canonical), canonical);

  let threw = false;
  let message = "";
  try {
    resolveUploadPath(LEGACY);
  } catch (err) {
    threw = true;
    message = err.message;
  }
  check("strict mode THROWS on a legacy path", threw, true);
  check("...error names the path", message.includes(LEGACY), true);
}

console.log("\n=== deleteEntityAssets — refuses before any AWS call ===\n");

{
  const { deleteEntityAssets } = await loadUploader(undefined);

  const msg1 = await rejects(
    "invalid entity is rejected",
    deleteEntityAssets("Businesses", BIZ), // uppercase — entityPrefix's ENTITY_RE rejects it
  );
  check("...by entityPrefix, not a later step", msg1?.includes("entityPrefix") ?? false, true);

  const msg2 = await rejects("invalid entityId is rejected", deleteEntityAssets("businesses", "not-an-id"));
  check("...by entityPrefix, not a later step", msg2?.includes("entityPrefix") ?? false, true);

  const msg3 = await rejects("missing entity is rejected", deleteEntityAssets(undefined, BIZ));
  check("...by entityPrefix, not a later step", msg3?.includes("entityPrefix") ?? false, true);
}

console.log(`\n${"=".repeat(56)}`);
if (failures.length) {
  console.log(`FAILED — ${failures.length} of ${passed + failures.length} checks failed\n`);
  for (const f of failures) console.log(`  - ${f}`);
  console.log();
  process.exit(1);
}
console.log(`1.3 MECHANISM GATE PASSED — all ${passed} checks green`);
console.log("(1.3b — lintS3Paths.js — is a separate script; run it too. Both are 0/0 as of 1.4's completion.)\n");
process.exit(0);
