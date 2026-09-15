import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildOrganizationSchema,
  buildWebsiteSchema,
} from "../helper/seo/organizationSchema.js";

test("site identity schema carries answer-engine context", () => {
  const organization = buildOrganizationSchema();
  const website = buildWebsiteSchema();

  assert.equal(organization["@id"], "https://massclick.in/#organization");
  assert.equal(organization.legalName, "MassClick Technologies Private Limited");
  assert.ok(organization.alternateName.includes("massclick.in"));
  assert.ok(organization.knowsAbout.includes("Local business discovery"));
  assert.ok(organization.makesOffer.some((offer) =>
    offer.itemOffered?.name === "Local business search"
  ));

  assert.equal(website["@id"], "https://massclick.in/#website");
  assert.deepEqual(website.publisher, { "@id": organization["@id"] });
  assert.ok(website.about.some((item) => item.name === "Verified business listings"));
  assert.ok(website.inLanguage.includes("en-IN"));
});

test("SSR response preserves AI discovery link headers", () => {
  const middlewarePath = new URL("../middleware/ssrMiddleware.js", import.meta.url);
  const source = fs.readFileSync(middlewarePath, "utf8");

  assert.match(source, /appendDiscoveryLinkHeaders\(res\)/);
  assert.match(source, /res\.append\("Link", `<\$\{canonical\}>; rel="alternate"; type="text\/markdown"`\)/);
});

test("llms output includes AI usage and category-theme guidance", () => {
  const sitemapPath = new URL("../routes/sitemapRoutes.js", import.meta.url);
  const source = fs.readFileSync(sitemapPath, "utf8");

  assert.match(source, /## AI Usage Notes/);
  assert.match(source, /Top Category Themes/);
  assert.match(source, /Accept: text\/markdown/);
  assert.match(source, /Complete AI page index/);
});
