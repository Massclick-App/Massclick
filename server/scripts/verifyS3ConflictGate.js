/**
 * Gate for `utils/s3ConflictGate.js` — the kind-aware `copy --commit` conflicts check.
 * Pure unit tests: no database, no S3, no filesystem. Run it after any change to that
 * module, and after any change to `plan` that could introduce a new conflict kind.
 *
 *   node scripts/verifyS3ConflictGate.js
 *
 * The fixtures below are drawn from the real 2026-08-14 full-scope plan
 * (run 01KZZWKQAN20SAR8GS0WFGZ4AJ: 77 × split, 0 blocking) and the real 2026-08-13
 * category incident (duplicate-newkey-diff-bytes), so a regression here fails a gate
 * rather than surfacing mid-run.
 */
import { evaluateConflictGate, BLOCKING_KINDS, REVIEWABLE_KINDS } from "../utils/s3ConflictGate.js";

let pass = 0;
let fail = 0;

const check = (label, condition, detail = "") => {
  if (condition) {
    pass += 1;
    console.log(`  ok    ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ""}`);
  }
};

const splitRow = (i) => ({
  oldKey: `businessList/banners/banner-${i}.webp`,
  kind: "split",
  groups: [{ groupKey: `businesses/abc${i}/banner` }, { groupKey: `seo-blogs/def${i}/business-banner` }],
});
const dupBytesRow = { oldKey: "category/images/x.webp", kind: "duplicate-newkey-diff-bytes" };
const missingIdRow = { oldKey: "businessList/foo.png", kind: "missing-entity-id" };
const mintFailedRow = { oldKey: "businessList/bar.png", kind: "key-mint-failed" };
const fanoutRow = { oldKey: "event/x.png", kind: "fanout", groups: [{ groupKey: "a" }, { groupKey: "b" }] };

console.log("\n=== verifyS3ConflictGate ===\n");

// --- the empty case -------------------------------------------------------------
console.log("no conflicts at all");
{
  const r = evaluateConflictGate({ conflictRows: [], acknowledgeRaw: null, runId: "R1" });
  check("clean plan is allowed with no flag", r.allowed === true);
  check("reports 0 blocking / 0 reviewable", r.blocking === 0 && r.reviewable === 0);
}
{
  const r = evaluateConflictGate({ conflictRows: [], acknowledgeRaw: "0", runId: "R1" });
  check("--acknowledge-conflicts=0 on a clean plan is allowed", r.allowed === true);
}
{
  const r = evaluateConflictGate({ conflictRows: [], acknowledgeRaw: "77", runId: "R1" });
  check("stale --acknowledge-conflicts=77 on a clean plan is REFUSED", r.allowed === false);
  check("  and says there is nothing to acknowledge", /NO conflicts to acknowledge/.test(r.reason));
}

// --- reviewable only: the real 2026-08-14 shape ----------------------------------
console.log("\n77 × split (real full-scope plan, 2026-08-14)");
const seventySeven = Array.from({ length: 77 }, (_, i) => splitRow(i));
{
  const r = evaluateConflictGate({ conflictRows: seventySeven, acknowledgeRaw: null, runId: "R2" });
  check("refuses without the flag", r.allowed === false);
  check("  counts 77 reviewable, 0 blocking", r.reviewable === 77 && r.blocking === 0);
  check("  tells the operator the exact flag to use", /--acknowledge-conflicts=77/.test(r.reason));
  check("  explains the rows ARE in the manifest", /present in manifest\.jsonl/.test(r.reason));
}
{
  const r = evaluateConflictGate({ conflictRows: seventySeven, acknowledgeRaw: "77", runId: "R2" });
  check("allowed with the exact count", r.allowed === true);
}
{
  const r = evaluateConflictGate({ conflictRows: seventySeven, acknowledgeRaw: "76", runId: "R2" });
  check("refused when the count is one too low", r.allowed === false);
}
{
  const r = evaluateConflictGate({ conflictRows: seventySeven, acknowledgeRaw: "78", runId: "R2" });
  check("refused when the count is one too high", r.allowed === false);
}
{
  const r = evaluateConflictGate({ conflictRows: seventySeven, acknowledgeRaw: "yes", runId: "R2" });
  check("refused on a non-numeric acknowledgement", r.allowed === false);
}
{
  const r = evaluateConflictGate({ conflictRows: [fanoutRow], acknowledgeRaw: "1", runId: "R2" });
  check("fanout is reviewable too", r.allowed === true && r.reviewable === 1);
}

// --- blocking kinds: unbypassable ------------------------------------------------
console.log("\nblocking kinds cannot be acknowledged by any value");
for (const kind of BLOCKING_KINDS) {
  const row = { oldKey: "k", kind };
  for (const ack of [null, "0", "1", "77", "999999"]) {
    const r = evaluateConflictGate({ conflictRows: [row], acknowledgeRaw: ack, runId: "R3" });
    check(`${kind} refused with --acknowledge-conflicts=${ack === null ? "(absent)" : ack}`, r.allowed === false);
  }
  const r = evaluateConflictGate({ conflictRows: [row], acknowledgeRaw: "1", runId: "R3" });
  check(`  ${kind} message says no flag can override`, /no flag can override/.test(r.reason));
}

// --- the 2026-08-13 category incident --------------------------------------------
console.log("\nthe real 2026-08-13 category incident");
{
  const r = evaluateConflictGate({ conflictRows: [dupBytesRow, dupBytesRow], acknowledgeRaw: "2", runId: "R4" });
  check("2 × duplicate-newkey-diff-bytes still refused", r.allowed === false);
  check("  counted as blocking, not reviewable", r.blocking === 2 && r.reviewable === 0);
}

// --- mixtures: one blocking row poisons an otherwise-acknowledgeable plan ---------
console.log("\nmixed blocking + reviewable");
{
  const rows = [...seventySeven, missingIdRow];
  const r = evaluateConflictGate({ conflictRows: rows, acknowledgeRaw: "77", runId: "R5" });
  check("77 split + 1 missing-entity-id is REFUSED even with the right split count", r.allowed === false);
  check("  blocking=1, reviewable=77", r.blocking === 1 && r.reviewable === 77);
}
{
  const rows = [...seventySeven, missingIdRow, mintFailedRow];
  const r = evaluateConflictGate({ conflictRows: rows, acknowledgeRaw: "79", runId: "R5" });
  check("acknowledging the TOTAL count does not launder blocking rows", r.allowed === false);
}

// --- fail-closed on unknown kinds ------------------------------------------------
console.log("\nfail-closed on unrecognised kinds");
{
  const r = evaluateConflictGate({ conflictRows: [{ oldKey: "k", kind: "some-future-kind" }], acknowledgeRaw: "1", runId: "R6" });
  check("an unknown kind is treated as BLOCKING", r.allowed === false && r.blocking === 1);
}
{
  const r = evaluateConflictGate({ conflictRows: [{ oldKey: "k" }], acknowledgeRaw: "1", runId: "R6" });
  check("a row with no kind at all is treated as BLOCKING", r.allowed === false && r.blocking === 1);
}
{
  check(
    "reviewable/blocking kind lists do not overlap",
    REVIEWABLE_KINDS.every((k) => !BLOCKING_KINDS.includes(k)),
  );
}

// --- counts surface for the caller's log line ------------------------------------
console.log("\ncounts");
{
  const r = evaluateConflictGate({ conflictRows: [...seventySeven, fanoutRow], acknowledgeRaw: "78", runId: "R7" });
  check("per-kind counts reported", r.counts.split === 77 && r.counts.fanout === 1);
  check("split + fanout acknowledged together", r.allowed === true);
}

console.log(`\n=== ${pass}/${pass + fail} passed${fail ? `, ${fail} FAILED` : ""} ===\n`);
process.exit(fail ? 1 : 0);
