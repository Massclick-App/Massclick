/**
 * Post-build: injects <link rel="preload" as="style"> for every local CSS
 * stylesheet CRA writes into build/index.html.
 *
 * Runs automatically via the "postbuild" npm script.
 */

const fs = require("fs");
const path = require("path");

const htmlPath = path.resolve(__dirname, "../build/index.html");

if (!fs.existsSync(htmlPath)) {
  console.error("[inject-preload] build/index.html not found — skipping.");
  process.exit(0);
}

let html = fs.readFileSync(htmlPath, "utf8");

// Match every local CSS <link> tag regardless of attribute order
// CRA emits: <link href="/static/css/xxx.css" rel="stylesheet">
const stylesheetRe = /<link\s(?=[^>]*\brel="stylesheet")(?=[^>]*\bhref="(\/static\/css\/[^"]+)")[^>]*>/g;
let match;
let injected = 0;

while ((match = stylesheetRe.exec(html)) !== null) {
  const [fullTag, href] = match;
  const preloadTag = `<link rel="preload" href="${href}" as="style">`;

  // Only add if not already present
  if (!html.includes(preloadTag)) {
    html = html.replace(fullTag, `${preloadTag}\n  ${fullTag}`);
    injected++;
  }
}

fs.writeFileSync(htmlPath, html, "utf8");
console.log(`[inject-preload] Done — injected ${injected} preload hint(s).`);
