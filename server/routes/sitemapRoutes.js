import express from "express";
import businessListModel from "../model/businessList/businessListModel.js";
import categoryModel from "../model/category/categoryModel.js";
import { slugify } from "../slugify.js";
import seoPageContentBlogs from "../model/seoModel/seoPageContentBlogModel.js";
import { categoriesData } from "../utils/sub-categoriesData.js";

const router = express.Router();

/* =========================================================
   CONFIG
========================================================= */
const BASE_URL = process.env.PUBLIC_BASE_URL || "https://massclick.in";

/* =========================================================
   HELPERS
========================================================= */
const xmlEscape = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const isoDate = (value) => {
  try {
    return value ? new Date(value).toISOString() : new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
};

const safeSlug = (value = "") => slugify(String(value).trim());

const normalize = (text = "") =>
  text.toLowerCase().trim().replace(/[-_\s]+/g, " ");

const createUrlNode = ({
  loc,
  lastmod,
  changefreq = "daily",
  priority = "0.8",
}) =>
  `
  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

const createSitemapNode = (loc) =>
  `
  <sitemap>
    <loc>${xmlEscape(loc)}</loc>
  </sitemap>`;

const sendXml = (res, xml) => {
  res.type("application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  res.status(200).send(xml);
};

/* =========================================================
   DB FILTERS
========================================================= */
const activeFilter = { isActive: true, businessesLive: true };

/* =========================================================
   CATEGORY LOOKUP FROM DB
   Builds a map: normalize(categoryName) → { slug, parentSlug | null }
   Uses categoryModel (same source as /api/category/all) + categoriesData
   for parent-child relationships — no hardcoded keyword matching.
========================================================= */
let _categoryLookupCache = null;
let _categoryLookupBuiltAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const buildCategoryLookup = async () => {
  const now = Date.now();
  if (_categoryLookupCache && now - _categoryLookupBuiltAt < CACHE_TTL_MS) {
    return _categoryLookupCache;
  }

  const categories = await categoryModel.find({ isActive: true }).lean();

  // parentSlug lookup: normalize(subCategoryName) → parentSlug
  const subToParent = new Map();

  for (const [parentKey, subs] of Object.entries(categoriesData)) {
    // find the real slug for this parent from DB
    const parentCat = categories.find((c) => {
      const n = normalize(c.category);
      const p = normalize(parentKey);
      return n === p || n === p + "s" || n + "s" === p;
    });
    const parentSlug = parentCat?.slug || safeSlug(parentKey);

    for (const { name } of subs) {
      subToParent.set(normalize(name), parentSlug);
    }
  }

  // final lookup: normalize(businessCategory) → { slug, parentSlug }
  const lookup = new Map();
  for (const cat of categories) {
    const key = normalize(cat.category);
    const isPrimary = cat.categoryType === "Primary Category";
    lookup.set(key, {
      slug: cat.slug || safeSlug(cat.category),
      parentSlug: isPrimary ? null : (subToParent.get(key) || null),
    });
  }

  _categoryLookupCache = lookup;
  _categoryLookupBuiltAt = now;
  return lookup;
};

// Returns the URL path after the city: e.g. "hospitals/clinical-lab" or "clinical-lab"
const resolveCategoryPath = (category, lookup) => {
  const key = normalize(category);
  const found = lookup.get(key);

  if (!found) return safeSlug(category) || "services";
  return found.parentSlug ? `${found.parentSlug}/${found.slug}` : found.slug;
};

/* =========================================================
   GET ALL ACTIVE CITY SLUGS (distinct, de-duped)
========================================================= */
const getActiveCitySlugs = async () => {
  const locations = await businessListModel.distinct("location", {
    ...activeFilter,
    location: { $exists: true, $ne: "" },
  });

  const seen = new Set();
  const result = [];
  for (const loc of locations) {
    const slug = safeSlug(loc);
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      result.push({ raw: loc, slug });
    }
  }
  return result;
};

/* =========================================================
   SITEMAP INDEX  — /sitemap.xml
   Lists one sitemap-city-{slug}.xml per active city + blog sitemap.
========================================================= */
router.get("/sitemap.xml", async (req, res) => {
  try {
    const cities = await getActiveCitySlugs();

    const links = cities.map((c) =>
      createSitemapNode(`${BASE_URL}/sitemap-city-${c.slug}.xml`)
    );

    links.push(createSitemapNode(`${BASE_URL}/sitemap-blog.xml`));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${links.join("")}
</sitemapindex>`;

    return sendXml(res, xml);
  } catch (error) {
    console.error("SITEMAP_INDEX_ERROR:", error);
    return res.status(500).end();
  }
});

/* =========================================================
   PER-CITY SITEMAP  — /sitemap-city-{cityslug}.xml
   Contains all category pages + all business pages for that city.
   Category URLs use real slugs from categoryModel (no hardcoded mapping).
========================================================= */
router.get("/sitemap-city-:cityslug.xml", async (req, res) => {
  try {
    const citySlug = req.params.cityslug;

    // Resolve the raw DB location string that matches this slug
    const locations = await businessListModel.distinct("location", {
      ...activeFilter,
      location: { $exists: true, $ne: "" },
    });

    const matchedLocation = locations.find(
      (loc) => safeSlug(loc) === citySlug
    );

    if (!matchedLocation) return res.status(404).end();

    const [businesses, categoryLookup] = await Promise.all([
      businessListModel
        .find(
          { ...activeFilter, location: matchedLocation },
          { _id: 1, businessName: 1, category: 1, updatedAt: 1 }
        )
        .lean(),
      buildCategoryLookup(),
    ]);

    const nodes = [];
    const seenCategoryUrls = new Set();

    for (const biz of businesses) {
      // individual business page
      const businessSlug = safeSlug(biz.businessName || "business");
      nodes.push(
        createUrlNode({
          loc: `${BASE_URL}/${citySlug}/${businessSlug}/${biz._id}`,
          lastmod: isoDate(biz.updatedAt),
          changefreq: "weekly",
          priority: "0.8",
        })
      );

      // category page for this city (de-duped)
      if (biz.category) {
        const catPath = resolveCategoryPath(biz.category, categoryLookup);
        const catUrl = `${BASE_URL}/${citySlug}/${catPath}`;

        if (!seenCategoryUrls.has(catUrl)) {
          seenCategoryUrls.add(catUrl);
          nodes.push(
            createUrlNode({
              loc: catUrl,
              lastmod: isoDate(biz.updatedAt),
              changefreq: "daily",
              priority: "0.9",
            })
          );
        }
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${nodes.join("")}
</urlset>`;

    return sendXml(res, xml);
  } catch (error) {
    console.error("CITY_SITEMAP_ERROR:", error);
    return res.status(500).end();
  }
});

/* =========================================================
   BLOG SITEMAP  — /sitemap-blog.xml
========================================================= */
router.get("/sitemap-blog.xml", async (req, res) => {
  try {
    const blogs = await seoPageContentBlogs
      .find(
        { isActive: true, slug: { $exists: true, $ne: "" } },
        { slug: 1, updatedAt: 1 }
      )
      .lean();

    const nodes = blogs
      .filter((b) => b.slug?.trim())
      .map((b) =>
        createUrlNode({
          loc: `${BASE_URL}/blog/${b.slug}`,
          lastmod: isoDate(b.updatedAt),
          changefreq: "weekly",
          priority: "0.9",
        })
      );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${nodes.join("")}
</urlset>`;

    return sendXml(res, xml);
  } catch (error) {
    console.error("BLOG_SITEMAP_ERROR:", error);
    return res.status(500).end();
  }
});

/* =========================================================
   HTML SITEMAP  — /sitemap
========================================================= */
router.get("/sitemap", async (req, res) => {
  try {
    const [cities, blogs] = await Promise.all([
      getActiveCitySlugs(),
      seoPageContentBlogs
        .find(
          { isActive: true, slug: { $exists: true, $ne: "" } },
          { slug: 1, heading: 1 }
        )
        .sort({ heading: 1 })
        .lean(),
    ]);

    const cityLinks = cities.map(
      (c) =>
        `<li><a href="${BASE_URL}/sitemap-city-${c.slug}.xml">${xmlEscape(c.raw)}</a></li>`
    );

    const blogLinks = blogs.map(
      (b) =>
        `<li><a href="${BASE_URL}/blog/${b.slug}">${xmlEscape(b.heading || b.slug)}</a></li>`
    );

    res.type("text/html; charset=utf-8");
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HTML Sitemap | Massclick</title>
  <meta name="description" content="Browse the Massclick HTML sitemap for city listings and blog posts." />
</head>
<body style="font-family: Arial, sans-serif; padding: 24px; line-height: 1.6;">
  <h1>Massclick HTML Sitemap</h1>
  <h2>City Sitemaps</h2>
  <ul>${cityLinks.join("")}</ul>
  <h2>Blog Pages</h2>
  <ul>${blogLinks.join("")}</ul>
</body>
</html>`);
  } catch (error) {
    console.error("HTML_SITEMAP_ERROR:", error);
    return res.status(500).end();
  }
});

export default router;
