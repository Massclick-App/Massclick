/**
 * Executable gate for helper/s3Migration/s3KeyMigrationRunner.js — the 2026-08-13
 * addition that lets the admin UI start S3 key migration runs by spawning the CLI as
 * a child process. This does NOT spawn a real child process, touch S3, or touch a
 * database — it only unit-tests the two pure, security-relevant pieces:
 *
 *   - `resolveTargetUri`: the only place a "dev"/"prod" label becomes a real
 *     connection string. Must throw on anything else, and must never fall back to a
 *     default when the env var is missing (silently defaulting here could point a
 *     "dev" click at a stale/blank string instead of failing loudly).
 *   - `expectedConfirmPhrase`: the phrase the controller's `confirm` guard checks
 *     against, and that the frontend's TypeToConfirmModal is built to mirror. Wrong
 *     here means either a commit that should require typing "RUN ON PROD" doesn't, or
 *     a correct UI submission gets rejected — both worth a gate, not just a manual check.
 *
 * Usage:
 *   node scripts/verifyS3KeyMigrationRunner.js   # exits 0 on pass, 1 on any failure
 */
import { expectedConfirmPhrase, resolveTargetUri } from "../helper/s3Migration/s3KeyMigrationRunner.js";

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

const checkThrows = (label, fn, messagePattern) => {
  try {
    fn();
    failures.push({ label, expected: `throws matching ${messagePattern}`, actual: "did not throw" });
    console.log(`  FAIL  ${label}`);
    console.log(`          expected a throw matching ${messagePattern}, but it did not throw`);
  } catch (error) {
    const ok = messagePattern.test(error.message);
    if (ok) passed += 1;
    else failures.push({ label, expected: `throws matching ${messagePattern}`, actual: error.message });
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
    if (!ok) console.log(`          actual message: ${error.message}`);
  }
};

console.log("\n=== resolveTargetUri ===\n");

{
  const env = { S3_MIGRATION_DEV_URI: "mongodb://dev-host/massClick_dev", S3_MIGRATION_PROD_URI: "mongodb://prod-host/massClick" };

  check("dev resolves to the dev URI", resolveTargetUri("dev", env), "mongodb://dev-host/massClick_dev");
  check("prod resolves to the prod URI", resolveTargetUri("prod", env), "mongodb://prod-host/massClick");
  checkThrows("unknown target throws", () => resolveTargetUri("staging", env), /unknown migration target "staging"/);
  checkThrows("empty target throws", () => resolveTargetUri("", env), /unknown migration target/);
  checkThrows(
    "missing env var throws instead of silently returning undefined",
    () => resolveTargetUri("dev", {}),
    /S3_MIGRATION_DEV_URI is not configured/,
  );
  checkThrows(
    "prod target with only dev configured still throws (no cross-fallback)",
    () => resolveTargetUri("prod", { S3_MIGRATION_DEV_URI: "mongodb://dev-host/massClick_dev" }),
    /S3_MIGRATION_PROD_URI is not configured/,
  );
}

console.log("\n=== expectedConfirmPhrase ===\n");

check("copy against dev/no target", expectedConfirmPhrase({ subcommand: "copy", scope: "advertisements" }), "copy:advertisements");
check("rewrite targeting dev", expectedConfirmPhrase({ subcommand: "rewrite", scope: "category", target: "dev" }), "rewrite:category");
check(
  "rewrite targeting prod escalates regardless of scope",
  expectedConfirmPhrase({ subcommand: "rewrite", scope: "category", target: "prod" }),
  "RUN ON PROD",
);
check(
  "copy never escalates even if a target were passed by mistake — only rewrite/verify pass target",
  expectedConfirmPhrase({ subcommand: "copy", scope: "all", target: undefined }),
  "copy:all",
);
check("scope of 'all' is preserved literally, not specially-cased", expectedConfirmPhrase({ subcommand: "plan", scope: "all" }), "plan:all");

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  console.log("FAILURES:");
  for (const f of failures) console.log(`  - ${f.label}`);
  process.exit(1);
}
process.exit(0);
