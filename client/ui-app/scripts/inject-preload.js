/**
 * Post-build: loads local CSS without blocking first paint and preloads the
 * mobile hero's LCP background image using their final content-hashed URLs.
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

// CRA emits a render-blocking tag:
//   <link href="/static/css/xxx.css" rel="stylesheet">
//
// The document already contains the small critical shell needed for first
// paint, so fetch the complete stylesheet early as a preload and apply it once
// downloaded. Keep a normal stylesheet inside <noscript> for non-JS clients.
const stylesheetRe =
  /<link\s(?=[^>]*\brel="stylesheet")(?=[^>]*\bhref="(\/static\/css\/[^"]+)")[^>]*>/g;
let match;
let deferredStyles = 0;

while ((match = stylesheetRe.exec(html)) !== null) {
  const [fullTag, href] = match;
  const asyncStyleMarker = `data-async-css="${href}"`;

  // A second post-build run sees the stylesheet in the <noscript> fallback.
  // The marker makes the transform idempotent and prevents nested fallbacks.
  if (html.includes(asyncStyleMarker)) {
    continue;
  }

  // Remove the preload-only tag produced by older versions of this script.
  // Keeping it would duplicate the new async stylesheet preload.
  const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const legacyPreloadRe = new RegExp(
    `<link\\s(?=[^>]*\\brel="preload")(?=[^>]*\\bhref="${escapedHref}")(?=[^>]*\\bas="style")[^>]*>\\s*`,
    "g",
  );
  html = html.replace(legacyPreloadRe, "");

  const asyncStyleTag =
    `<link rel="preload" href="${href}" as="style" ${asyncStyleMarker} ` +
    `onload="this.onload=null;this.rel='stylesheet'">`;
  const noScriptFallback =
    `<noscript><link rel="stylesheet" href="${href}"></noscript>`;

  html = html.replace(
    fullTag,
    `${asyncStyleTag}\n  ${noScriptFallback}`,
  );
  deferredStyles++;
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
  `[inject-preload] Done - deferred ${deferredStyles} stylesheet(s) and ` +
    `${injectedImages} LCP image preload(s).`,
);
