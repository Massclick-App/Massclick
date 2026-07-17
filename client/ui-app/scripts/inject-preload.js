/**
 * Post-build: injects preload hints for local CSS and the mobile hero's LCP
 * background image using their final content-hashed build URLs.
 *
 * Runs automatically via the "postbuild" npm script.
 */

const fs = require("fs");
const path = require("path");

const htmlPath = path.resolve(__dirname, "../build/index.html");
const manifestPath = path.resolve(__dirname, "../build/asset-manifest.json");

if (!fs.existsSync(htmlPath)) {
  console.error("[inject-preload] build/index.html not found - skipping.");
  process.exit(0);
}

let html = fs.readFileSync(htmlPath, "utf8");

// Match every local CSS <link> tag regardless of attribute order.
// CRA emits: <link href="/static/css/xxx.css" rel="stylesheet">
const stylesheetRe =
  /<link\s(?=[^>]*\brel="stylesheet")(?=[^>]*\bhref="(\/static\/css\/[^"]+)")[^>]*>/g;
let match;
let injectedStyles = 0;

while ((match = stylesheetRe.exec(html)) !== null) {
  const [fullTag, href] = match;
  const preloadTag = `<link rel="preload" href="${href}" as="style">`;

  if (!html.includes(preloadTag)) {
    html = html.replace(fullTag, `${preloadTag}\n  ${fullTag}`);
    injectedStyles++;
  }
}

let injectedImages = 0;

if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const mobileHeroHref =
    manifest.files?.["static/media/search-background.webp"];

  if (mobileHeroHref) {
    const preloadTag =
      `<link rel="preload" href="${mobileHeroHref}" as="image" ` +
      'fetchpriority="high" media="(max-width: 1199px)">';

    if (!html.includes(preloadTag)) {
      html = html.replace("</head>", `  ${preloadTag}\n</head>`);
      injectedImages++;
    }
  }
}

fs.writeFileSync(htmlPath, html, "utf8");
console.log(
  `[inject-preload] Done - injected ${injectedStyles} style preload(s) and ` +
    `${injectedImages} LCP image preload(s).`,
);
