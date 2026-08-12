/**
 * Static gate for step 1.3b of the S3 key restructure — the burndown list for 1.4.
 * See S3_KEY_RESTRUCTURE_PROGRESS.md.
 *
 * Read-only source scan. No database, no S3, no network. Two checks:
 *
 *   1. Every `uploadImageToS3(` call site whose 2nd argument is a template literal or
 *      a string concatenation — the shape every one of the known legacy call sites
 *      takes today. A one-hop check also follows a bare identifier back to its nearest
 *      preceding `const`/`let` assignment in the same file, because a few call sites
 *      build the path one line earlier and pass a variable in.
 *   2. The literal substring "massclickdev.s3" anywhere under server/ or
 *      client/ui-app/src, outside the one sanctioned default
 *      (client/ui-app/src/utils/imageUrlHelper.js — see step 0.5) — a regression guard
 *      for the 15 hardcoded URLs already removed.
 *
 * This is deliberately a heuristic bracket-depth scan, not a real parser — the server
 * has no AST tooling and none of this needs one. It was checked by hand against the full
 * call-site inventory in the progress doc and currently classifies every one of them
 * correctly; it is not a general-purpose JS analyser and can be fooled by sufficiently
 * unusual formatting.
 *
 * Exit code is 0 only when BOTH lists are empty. Today it is expected to FAIL — the
 * enumerated list below IS 1.4's todo list, not a bug in this script. Flipping
 * S3_PATH_MODE to "strict" (server/s3Uploder.js) is gated on this script reporting zero
 * legacy call sites — see step 1.4.
 *
 * Usage:
 *   node scripts/lintS3Paths.js               # human-readable report, exit 0/1
 *   node scripts/lintS3Paths.js --json=out.json
 *   node scripts/lintS3Paths.js --quiet        # summary only, no per-site listing
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");

const argv = process.argv.slice(2);
const flag = (n) => {
  const hit = argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : null;
};
const QUIET = argv.includes("--quiet");
const JSON_OUT = flag("json");

const SCAN_ROOTS = [path.join(ROOT, "server"), path.join(ROOT, "client", "ui-app", "src")];
const EXCLUDE_DIR_NAMES = new Set(["node_modules", ".git", "build", "dist", "coverage"]);
const FILE_RE = /\.jsx?$/;
const ENV_FILE_RE = /^\.env(\..+)?$/;

/**
 * Where `massclickdev.s3` is allowed to appear:
 *   - imageUrlHelper.js — the documented 0.5 fallback default, not a live risk (an unset
 *     env var falling back to the bucket actually in use).
 *   - verifyS3KeyUtils.js — a synthetic base URL used only to build fixture input for the
 *     0.3 gate's `extractS3Key` tests; never sent over the network or served to a user.
 */
const BUCKET_LITERAL_ALLOWLIST = new Set([
  path.join(ROOT, "client", "ui-app", "src", "utils", "imageUrlHelper.js"),
  path.join(ROOT, "server", "scripts", "verifyS3KeyUtils.js"),
]);
const BUCKET_LITERAL = "massclickdev.s3";

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIR_NAMES.has(entry.name)) continue;
    if (ENV_FILE_RE.test(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (FILE_RE.test(entry.name) && full !== __filename) out.push(full);
  }
  return out;
};

/**
 * Split the argument list of a call starting at `openParenIdx` (index of the `(`),
 * respecting nested (), [], {} and quotes ('/"/`) so a comma inside any of those does
 * not end an argument early.
 */
const parseCallArgs = (src, openParenIdx) => {
  let i = openParenIdx + 1;
  let depth = 1;
  let current = "";
  let quote = null;
  const args = [];

  while (i < src.length && depth > 0) {
    const ch = src[i];

    if (quote) {
      current += ch;
      if (ch === "\\") {
        i += 1;
        if (i < src.length) current += src[i];
      } else if (ch === quote) {
        quote = null;
      }
      i += 1;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      current += ch;
      i += 1;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
      current += ch;
      i += 1;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      if (depth === 0) {
        i += 1;
        break;
      }
      current += ch;
      i += 1;
      continue;
    }
    if (ch === "," && depth === 1) {
      args.push(current.trim());
      current = "";
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  if (current.trim()) args.push(current.trim());
  return args;
};

/** Remove the contents of every quoted span, so a `+` found afterwards is a real operator. */
const stripQuotedSpans = (s) => {
  let out = "";
  let quote = null;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (quote) {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      continue;
    }
    out += ch;
  }
  return out;
};

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** template literal | concat | null (not flagged at this level). */
const classifyExpr = (expr) => {
  const trimmed = expr.trim();
  if (trimmed.startsWith("`")) return "template literal";
  if (stripQuotedSpans(trimmed).includes("+")) return "string concatenation";
  return null;
};

/**
 * One-hop resolution for a bare identifier: find its nearest preceding
 * `const <ident> = <rhs>;` / `let <ident> = <rhs>;` in the same file (searching
 * backwards from the call site) and classify that instead. Real call sites in this
 * codebase build the path one line above and pass the variable straight in — a genuine
 * registry token would instead be a `const x = s3Keys...` or `s3Path(...)` call, which
 * `classifyExpr` correctly leaves unflagged.
 */
const resolveIdentifier = (src, ident, beforeIdx) => {
  const declRe = new RegExp(`(?:const|let)\\s+${ident}\\s*=\\s*`, "g");
  let match;
  let last = null;
  while ((match = declRe.exec(src.slice(0, beforeIdx)))) last = match;
  if (!last) return null;

  const rhsStart = last.index + last[0].length;
  // RHS runs to the next top-level `;` — reuse the same quote/bracket-aware scan.
  let i = rhsStart;
  let depth = 0;
  let quote = null;
  let rhs = "";
  while (i < src.length) {
    const ch = src[i];
    if (quote) {
      rhs += ch;
      if (ch === "\\") {
        i += 1;
        if (i < src.length) rhs += src[i];
      } else if (ch === quote) {
        quote = null;
      }
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      rhs += ch;
      i += 1;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
      rhs += ch;
      i += 1;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      rhs += ch;
      i += 1;
      continue;
    }
    if (ch === ";" && depth === 0) break;
    rhs += ch;
    i += 1;
  }
  return { ident, rhs: rhs.trim() };
};

const CALL_RE = /\buploadImageToS3\s*\(/g;

const findLegacyCallSites = (files) => {
  const offenders = [];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    CALL_RE.lastIndex = 0;
    let match;
    while ((match = CALL_RE.exec(src))) {
      const openParenIdx = match.index + match[0].length - 1;
      const args = parseCallArgs(src, openParenIdx);
      const arg2 = args[1];
      if (!arg2) continue;

      const line = src.slice(0, match.index).split("\n").length;
      let reason = classifyExpr(arg2);
      let via = null;

      if (!reason && IDENT_RE.test(arg2)) {
        const resolved = resolveIdentifier(src, arg2, match.index);
        if (resolved) {
          const resolvedReason = classifyExpr(resolved.rhs);
          if (resolvedReason) {
            reason = resolvedReason;
            via = arg2;
          }
        }
      }

      if (reason) {
        offenders.push({
          file: path.relative(ROOT, file).replace(/\\/g, "/"),
          line,
          arg: arg2.length > 80 ? `${arg2.slice(0, 77)}...` : arg2,
          via,
          reason,
        });
      }
    }
  }
  return offenders;
};

const findBucketLiteralLeaks = (files) => {
  const leaks = [];
  for (const file of files) {
    if (BUCKET_LITERAL_ALLOWLIST.has(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes(BUCKET_LITERAL)) continue;
    src.split("\n").forEach((lineText, idx) => {
      if (lineText.includes(BUCKET_LITERAL)) {
        leaks.push({ file: path.relative(ROOT, file).replace(/\\/g, "/"), line: idx + 1, text: lineText.trim() });
      }
    });
  }
  return leaks;
};

const files = SCAN_ROOTS.flatMap((dir) => walk(dir));
const legacy = findLegacyCallSites(files);
const bucketLeaks = findBucketLiteralLeaks(files);

console.log(`\nScanned ${files.length} files under ${SCAN_ROOTS.map((d) => path.relative(ROOT, d)).join(", ")}\n`);

if (!QUIET) {
  console.log("=== uploadImageToS3() legacy call sites (the 1.4 burndown) ===\n");
  const byFile = new Map();
  for (const o of legacy) {
    if (!byFile.has(o.file)) byFile.set(o.file, []);
    byFile.get(o.file).push(o);
  }
  for (const [file, sites] of [...byFile.entries()].sort()) {
    console.log(`  ${file}  (${sites.length})`);
    for (const s of sites) {
      const viaNote = s.via ? ` (via variable '${s.via}')` : "";
      console.log(`    :${s.line}  ${s.reason}${viaNote} — ${s.arg}`);
    }
  }
  if (!legacy.length) console.log("  (none)");

  console.log(`\n=== "${BUCKET_LITERAL}" outside the sanctioned default ===\n`);
  for (const l of bucketLeaks) console.log(`  ${l.file}:${l.line}  ${l.text}`);
  if (!bucketLeaks.length) console.log("  (none)");
}

console.log(`\n${"=".repeat(56)}`);
console.log(`legacy call sites : ${legacy.length}  across ${new Set(legacy.map((o) => o.file)).size} files`);
console.log(`bucket literal leaks : ${bucketLeaks.length}`);

if (JSON_OUT) {
  fs.writeFileSync(JSON_OUT, JSON.stringify({ generatedAt: new Date().toISOString(), legacy, bucketLeaks }, null, 2));
  console.log(`\nWrote ${JSON_OUT}`);
}

if (legacy.length || bucketLeaks.length) {
  console.log(
    "\nFAIL — this is expected until step 1.4 migrates every call site above. " +
      "S3_PATH_MODE stays \"warn\" until this gate is 0.\n",
  );
  process.exit(1);
}

console.log("\nPASS — 0 legacy call sites, 0 bucket literal leaks. Safe to flip S3_PATH_MODE=strict.\n");
process.exit(0);
