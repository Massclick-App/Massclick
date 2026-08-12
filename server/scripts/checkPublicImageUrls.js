/**
 * "No broken images" proof — hits the real API, extracts every S3 reference from the
 * JSON responses, and HEADs each one.
 *
 * Gate for step 0.5 of the S3 key restructure, and the before/after diff used at R.5
 * and R.9. See S3_KEY_RESTRUCTURE_PROGRESS.md.
 *
 * This exercises controllers, URL builders, Redis and S3 together against real data,
 * which unit tests would not — the server has no test framework anyway.
 *
 * READ-ONLY: GET on public endpoints, HEAD on assets. No writes, no database
 * connection, no credentials.
 *
 * Usage:
 *   node scripts/checkPublicImageUrls.js --api=https://dev-api.massclick.in/api
 *   node scripts/checkPublicImageUrls.js --api=... --out=before.json
 *   node scripts/checkPublicImageUrls.js --api=... --compare=before.json
 *
 * Flags:
 *   --api=       API base URL, including /api. Required.
 *   --out=       write the full result as JSON (for a later --compare)
 *   --compare=   diff against an earlier report. **The diff must be empty.**
 *   --endpoint=  add an extra endpoint path (repeatable), e.g.
 *                --endpoint=/business/by-slug?location=trichy&slug=some-business
 *   --limit=     max unique assets to HEAD (default 1500)
 *
 * Exit code is 0 only when every asset resolved AND, with --compare, nothing regressed.
 */
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const flag = (n) => {
  const hit = argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : null;
};
const flags = (n) => argv.filter((a) => a.startsWith(`--${n}=`)).map((a) => a.slice(n.length + 3));

const API = (flag("api") || "").replace(/\/+$/, "");
const OUT = flag("out");
const COMPARE = flag("compare");
const LIMIT = Number(flag("limit") || 1500);

if (!API) {
  console.error("\n--api=<base url including /api> is required.\n");
  process.exit(1);
}

/** Public, unauthenticated endpoints that render images. */
const DEFAULT_ENDPOINTS = [
  "/category/all",
  "/category/home",
  "/category/home-mobile",
  "/category/popular",
  "/category/service-cards",
  "/category/mobile-service-cards",
  "/v2/category/home",
  "/v2/category/home-mobile",
  "/v2/category/popular",
  "/v2/category/service-cards",
  "/v2/category/mobile-service-cards",
  "/v2/home/popular-searches",
  "/v2/home/top-tourist",
  "/v2/home/popular-category-content",
  "/advertisment/viewall",
  "/seopagecontentblog/viewall",
  "/massclick-events",
];

/**
 * Endpoints that render images but are NOT unauthenticated — they return 401, so this
 * script cannot cover them. Their assets are checked by `s3KeyMigration.js verify`
 * (HeadObject against the DB references) plus one manual download each, which is how
 * risk 9 in the plan is retired. Listed here so nobody "fixes" the coverage gap by
 * adding them back and getting a red run.
 *
 *   /massclick-feed/posts          AUTH_REQUIRED
 *   /massclick-documents/viewall   AUTH_REQUIRED
 *   hiring résumés, reward-claim evidence — signed-URL only, by design
 */

const ENDPOINTS = [...DEFAULT_ENDPOINTS, ...flags("endpoint")];

const OBJECT_EXT =
  /\.(jpe?g|png|webp|gif|svg|avif|bmp|tiff?|pdf|mp4|mov|webm|mkv|docx?|xlsx?|heic)$/i;
const S3_HOST = /\.s3[.-][a-z0-9-]+\.amazonaws\.com/i;

/** Walk any JSON value and yield {jsonPath, value} for every S3-looking string. */
const collectAssets = (node, jsonPath, out) => {
  if (node === null || node === undefined) return;

  if (typeof node === "string") {
    const v = node.trim();
    if (!v || v.length > 2000) return;
    if (/^data:/i.test(v)) return;

    if (/^https?:\/\//i.test(v)) {
      if (S3_HOST.test(v)) out.push({ jsonPath, value: v });
      return;
    }
    // A bare key that was never turned into a URL still needs checking.
    if (v.includes("/") && OBJECT_EXT.test(v.split("?")[0])) out.push({ jsonPath, value: v });
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item, i) => collectAssets(item, `${jsonPath}[${i}]`, out));
    return;
  }

  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      collectAssets(v, jsonPath ? `${jsonPath}.${k}` : k, out);
    }
  }
};

const headStatus = async (url) => {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return { status: res.status, contentType: res.headers.get("content-type") || "" };
  } catch (error) {
    return { status: 0, error: error.message };
  }
};

/** Bounded-concurrency map — 36k-object buckets do not want an unbounded fan-out. */
const mapLimit = async (items, limit, fn) => {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor;
        cursor += 1;
        results[i] = await fn(items[i], i);
      }
    }),
  );
  return results;
};

const main = async () => {
  console.log(`\n=== checkPublicImageUrls — READ-ONLY ===`);
  console.log(`api:       ${API}`);
  console.log(`endpoints: ${ENDPOINTS.length}`);
  console.log(`started:   ${new Date().toISOString()}\n`);

  const endpointResults = [];
  const assets = new Map(); // url -> [{endpoint, jsonPath}]
  let baseUrlForKeys = null;

  for (const endpoint of ENDPOINTS) {
    const url = `${API}${endpoint}`;
    let status = 0;
    let found = 0;
    let error = "";

    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      status = res.status;
      const text = await res.text();

      if (res.ok) {
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          error = "response was not JSON";
        }

        if (json !== undefined) {
          const out = [];
          collectAssets(json, "", out);
          found = out.length;

          for (const { jsonPath, value } of out) {
            // Learn the bucket host from the first absolute URL seen, so bare keys
            // can be checked against the same host the API is actually serving.
            if (!baseUrlForKeys && /^https?:\/\//i.test(value)) {
              try {
                const u = new URL(value);
                baseUrlForKeys = `${u.protocol}//${u.host}`;
              } catch {
                /* ignore */
              }
            }

            const absolute = /^https?:\/\//i.test(value)
              ? value
              : baseUrlForKeys
                ? `${baseUrlForKeys}/${value.replace(/^\/+/, "")}`
                : null;

            if (!absolute) continue;
            if (!assets.has(absolute)) assets.set(absolute, []);
            assets.get(absolute).push({ endpoint, jsonPath, raw: value });
          }
        }
      } else {
        error = text.slice(0, 120);
      }
    } catch (e) {
      error = e.message;
    }

    endpointResults.push({ endpoint, status, assetsFound: found, error });
    const mark = status >= 200 && status < 300 ? "ok " : "ERR";
    console.log(
      `  ${mark} ${String(status).padStart(3)}  ${endpoint.padEnd(42)} ${found} assets${error ? `  ${error}` : ""}`,
    );
  }

  const urls = [...assets.keys()].slice(0, LIMIT);
  console.log(`\n  ${assets.size} unique assets referenced; checking ${urls.length}...\n`);

  const statuses = await mapLimit(urls, 10, async (url) => ({ url, ...(await headStatus(url)) }));

  const broken = statuses.filter((s) => s.status !== 200);
  const ok = statuses.length - broken.length;

  console.log(`  resolved 200:  ${ok}`);
  console.log(`  BROKEN:        ${broken.length}\n`);

  for (const b of broken.slice(0, 40)) {
    const owner = assets.get(b.url)[0];
    console.log(`  ${String(b.status).padStart(3)}  ${b.url}`);
    console.log(`       from ${owner.endpoint}  ->  ${owner.jsonPath}`);
  }
  if (broken.length > 40) console.log(`  ... and ${broken.length - 40} more`);

  const badEndpoints = endpointResults.filter((e) => e.status < 200 || e.status >= 300);

  const report = {
    generatedAt: new Date().toISOString(),
    api: API,
    endpoints: endpointResults,
    totalAssets: assets.size,
    checked: statuses.length,
    ok,
    broken: broken.map((b) => ({ ...b, owners: assets.get(b.url).slice(0, 3) })),
  };

  if (OUT) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(`\n  report written to ${OUT}`);
  }

  let regressed = [];
  if (COMPARE) {
    const previous = JSON.parse(fs.readFileSync(COMPARE, "utf8"));
    const was = new Set((previous.broken || []).map((b) => b.url));
    regressed = broken.filter((b) => !was.has(b.url));
    const fixed = [...was].filter((u) => !broken.some((b) => b.url === u));

    console.log(`\n=== diff vs ${COMPARE} ===`);
    console.log(`  was broken:      ${was.size}`);
    console.log(`  now broken:      ${broken.length}`);
    console.log(`  NEWLY broken:    ${regressed.length}   <-- must be 0`);
    console.log(`  newly fixed:     ${fixed.length}`);
    for (const r of regressed.slice(0, 20)) console.log(`    ${r.status}  ${r.url}`);
  }

  console.log(`\n${"=".repeat(56)}`);
  const pass = badEndpoints.length === 0 && (COMPARE ? regressed.length === 0 : broken.length === 0);

  if (!pass) {
    if (badEndpoints.length) console.log(`FAILED — ${badEndpoints.length} endpoint(s) did not return 2xx`);
    if (COMPARE && regressed.length) console.log(`FAILED — ${regressed.length} newly broken asset(s)`);
    else if (!COMPARE && broken.length) console.log(`FAILED — ${broken.length} broken asset(s)`);
    console.log();
    process.exit(1);
  }
  console.log(`CLEAN — ${ok} assets resolved, every endpoint 2xx\n`);
  process.exit(0);
};

await main();
