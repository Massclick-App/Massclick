import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  getHomeRoutePreloadTags,
  renderHomeRouteShell,
} from "./homeRouteShell.mjs";

test("home route shell exposes the final hero LCP text without a blank skeleton", () => {
  const html = renderHomeRouteShell();

  assert.match(html, /data-home-route-shell/);
  assert.match(html, /Explore\. Connect\./);
  assert.match(html, /Succeed Local\./);
  assert.match(html, /Find trusted businesses and services near you\./);
  assert.doesNotMatch(html, /ssr-skeleton/);
});

test("home route preload tags use the hashed home CSS and JavaScript assets", () => {
  const buildPath = fs.mkdtempSync(path.join(os.tmpdir(), "massclick-home-shell-"));
  const manifest = {
    files: {
      "home.css": "/static/css/home.abc123.chunk.css",
      "home.js": "/static/js/home.def456.chunk.js",
    },
  };

  fs.writeFileSync(
    path.join(buildPath, "asset-manifest.json"),
    JSON.stringify(manifest),
    "utf8",
  );

  const tags = getHomeRoutePreloadTags(buildPath);

  assert.match(
    tags,
    /href="\/static\/css\/home\.abc123\.chunk\.css" as="style"/,
  );
  assert.match(
    tags,
    /href="\/static\/js\/home\.def456\.chunk\.js" as="script"/,
  );
});

test("home route preload lookup fails open when a build manifest is unavailable", () => {
  const buildPath = fs.mkdtempSync(path.join(os.tmpdir(), "massclick-no-manifest-"));

  assert.equal(getHomeRoutePreloadTags(buildPath), "");
  assert.equal(getHomeRoutePreloadTags(""), "");
});

test("SSR middleware keeps the home shell and route preloads in the delivery path", () => {
  const middlewarePath = new URL("../middleware/ssrMiddleware.js", import.meta.url);
  const source = fs.readFileSync(middlewarePath, "utf8");

  assert.match(source, /getHomeRoutePreloadTags\(CLIENT_BUILD_PATH\)/);
  assert.match(source, /renderHomeRouteShell\(\)/);
  assert.match(source, /rootBootstrapHtml/);
});
