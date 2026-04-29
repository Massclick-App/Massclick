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
const LIMIT = 1000;

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
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.status(200).send(xml);
};

/* =========================================================
   DB FILTERS
========================================================= */
const activeFilter = { isActive: true, businessesLive: true };

/* =========================================================
   CATEGORY LOOKUP FROM DB
   Same logic as getAllUniqueCategoriesAction (/api/category/all):
   - queries categoryModel directly
   - uses categoriesData for parent-child mapping
   Builds: normalize(businessCategory) → { slug, parentSlug | null }
========================================================= */
let _categoryLookupCache = null;
let _categoryLookupBuiltAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// mirrors getAllUniqueCategoriesAction normalize helpers
const normalizeKey = (text = "") =>
  text.toLowerCase().trim().replace(/[-_\s]+/g, " ");

const cleanText = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/[-_\s]+/g, " ")
    .replace(/\bcontractors\b/g, "contractor")
    .replace(/\s+/g, " ");

const buildCategoryLookup = async () => {
  const now = Date.now();
  // if (_categoryLookupCache && now - _categoryLookupBuiltAt < CACHE_TTL_MS) {
  //   return _categoryLookupCache;
  // }

  const categories = await categoryModel.find({ isActive: true }).lean();

  // deduplicate — same as getAllUniqueCategoriesAction
  const uniqueMap = new Map();
  categories.forEach((item) => {
    const key = normalizeKey(item.category);
    if (!uniqueMap.has(key)) uniqueMap.set(key, item);
  });

  const dbMap = new Map(
    categories.map((cat) => [cleanText(cat.category), cat])
  );

  // set of category keys that are parents in categoriesData
  const parentKeys = new Set(
    Object.keys(categoriesData).map((k) => normalizeKey(k))
  );

  const lookup = new Map();

  // pass 1 — every DB category starts as a primary (no parent)
  for (const [, item] of uniqueMap) {
    const key = normalizeKey(item.category);
    lookup.set(key, {
      slug: item.slug || safeSlug(item.category),
      parentSlug: null,
    });
  }

  // pass 2 — re-map sub-categories with their real parent slug.
  // Runs after pass 1 so subs always override the null set above,
  // except for categories that are themselves a parent key in categoriesData.
  for (const [, parentItem] of uniqueMap) {
    const pKey = normalizeKey(parentItem.category);
    const parentSlug = parentItem.slug || safeSlug(parentItem.category);

    const matchedKey = Object.keys(categoriesData).find((key) => {
      const cur = normalizeKey(key);
      return cur === pKey || cur === pKey + "s" || cur + "s" === pKey;
    });

    if (!matchedKey) continue;

    for (const { name } of categoriesData[matchedKey]) {
      const subKey = normalizeKey(name);
      // keep primary URL if this sub is itself a parent (e.g. "hospitals" under hospitals)
      if (parentKeys.has(subKey)) continue;

      const foundSub = dbMap.get(cleanText(name));
      const subSlug = foundSub?.slug || safeSlug(name);
      lookup.set(subKey, { slug: subSlug, parentSlug });
    }
  }

  _categoryLookupCache = lookup;
  _categoryLookupBuiltAt = now;
  return lookup;
};

// Returns the URL path after the city: e.g. "hospitals/clinical-lab" or "clinical-lab"
const resolveCategoryPath = (category, lookup) => {
  const key = normalizeKey(category);
  const found = lookup.get(key);

  if (!found) return safeSlug(category) || "services";
  return found.parentSlug ? `${found.parentSlug}/${found.slug}` : found.slug;
};

/* =========================================================
   GET ALL ACTIVE CITY SLUGS (distinct, de-duped)
========================================================= */
// reject slugs that are pure numbers (pincodes, phone numbers, test data)
const isValidCitySlug = (slug) => slug.length >= 3 && !/^\d+$/.test(slug);

const getActiveCitySlugs = async () => {
  const locations = await businessListModel.distinct("location", {
    ...activeFilter,
    location: { $exists: true, $ne: "" },
  });

  const seen = new Set();
  const result = [];
  for (const loc of locations) {
    const slug = safeSlug(loc);
    if (slug && isValidCitySlug(slug) && !seen.has(slug)) {
      seen.add(slug);
      result.push({ raw: loc, slug });
    }
  }
  return result;
};

/* =========================================================
   SITEMAP INDEX  — /sitemap.xml
   Lists one sitemap-city-{slug}.xml per active city,
   paginated business sitemaps, and blog sitemap.
========================================================= */
router.get("/sitemap.xml", async (req, res) => {
  try {
    const [cities, totalBusinesses] = await Promise.all([
      getActiveCitySlugs(),
      businessListModel.countDocuments(activeFilter),
    ]);

    const links = cities.map((c) =>
      createSitemapNode(`${BASE_URL}/sitemap-city-${c.slug}.xml`)
    );

    const totalBusinessPages = Math.max(1, Math.ceil(totalBusinesses / LIMIT));
    for (let i = 1; i <= totalBusinessPages; i++) {
      links.push(createSitemapNode(`${BASE_URL}/sitemap-business-${i}.xml`));
    }

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

    const categoryLookup = await buildCategoryLookup();

    const nodes = [];

    // All categories for this city
    const today = new Date().toISOString();
    for (const [, { slug, parentSlug }] of categoryLookup) {
      const catPath = parentSlug ? `${parentSlug}/${slug}` : slug;
      nodes.push(
        createUrlNode({
          loc: `${BASE_URL}/${citySlug}/${catPath}`,
          lastmod: today,
          changefreq: "daily",
          priority: "0.9",
        })
      );
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
   BUSINESS SITEMAP  — /sitemap-business-{page}.xml
========================================================= */
router.get("/sitemap-business-:page.xml", async (req, res) => {
  try {
    const page = Math.max(Number(req.params.page) || 1, 1);
    const skip = (page - 1) * LIMIT;

    const businesses = await businessListModel
      .find(activeFilter, { _id: 1, businessName: 1, location: 1, updatedAt: 1 })
      .sort({ updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(LIMIT)
      .lean();

    const nodes = businesses.map((biz) => {
      const citySlug = safeSlug(biz.location);
      const businessSlug = safeSlug(biz.businessName || "business");
      return createUrlNode({
        loc: `${BASE_URL}/${citySlug}/${businessSlug}/${biz._id}`,
        lastmod: isoDate(biz.updatedAt),
        changefreq: "weekly",
        priority: "0.8",
      });
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${nodes.join("")}
</urlset>`;

    return sendXml(res, xml);
  } catch (error) {
    console.error("BUSINESS_SITEMAP_ERROR:", error);
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
