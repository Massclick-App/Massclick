import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildBusinessRouteShellMeta, renderBusinessRouteShell } from "./businessRouteShell.mjs";

test("business shell renders the hero photo as a high-priority image", () => {
  const html = renderBusinessRouteShell({
    name: "SR Micro Lab",
    imageUrl: "https://example-bucket.s3.ap-southeast-2.amazonaws.com/businesses/abc/banner/01",
    meta: "★ 4.5 · Diagnostic Centers · Trichy",
  });

  assert.match(html, /data-business-route-shell/);
  assert.match(html, /<img class="biz-route-shell__image" src="https:\/\/example-bucket\.s3\.ap-southeast-2\.amazonaws\.com\/businesses\/abc\/banner\/01"[^>]*fetchpriority="high"/);
  assert.match(html, /<p class="biz-route-shell__name">SR Micro Lab<\/p>/);
  assert.match(html, /<p class="biz-route-shell__meta">★ 4\.5 · Diagnostic Centers · Trichy<\/p>/);
});

test("business shell escapes business-controlled text and URLs", () => {
  const html = renderBusinessRouteShell({
    name: `<script>alert("x")</script> & Sons`,
    imageUrl: `https://cdn.example.com/a.jpg" onerror="alert(1)`,
    meta: `<b>meta</b>`,
  });

  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /onerror="/);
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; Sons/);
});

test("business shell omits the image and meta line when there is nothing to show", () => {
  const html = renderBusinessRouteShell({ name: "No Photo Traders" });

  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /biz-route-shell__meta/);
  assert.match(html, /<div class="biz-route-shell__media"><\/div>/);
});

test("meta line skips unrated businesses and title-cases the category", () => {
  assert.equal(
    buildBusinessRouteShellMeta({ rating: 4.25, category: "diagnostic centers", area: "Trichy" }),
    "★ 4.3 · Diagnostic Centers · Trichy",
  );
  assert.equal(buildBusinessRouteShellMeta({ rating: 0, category: "hotels", area: "Salem" }), "Hotels · Salem");
  assert.equal(buildBusinessRouteShellMeta({}), "");
});

test("SSR middleware delivers the business shell and its LCP preload", () => {
  const source = fs.readFileSync(new URL("../middleware/ssrMiddleware.js", import.meta.url), "utf8");

  assert.match(source, /renderBusinessRouteShell\(businessShell\)/);
  assert.match(source, /window\.__SSR_BUSINESS__=/);
  assert.match(source, /businessShell\?\.imageUrl/);
});
