import express from "express";
import businessListModel from "../model/businessList/businessListModel.js";
import categoryModel from "../model/category/categoryModel.js";
import categoryDisplaySettingsModel from "../model/categoryDisplaySettings/categoryDisplaySettingsModel.js";
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
   Mirrors V2 category display settings:
   - queries categoryModel directly for live category slugs
   - uses categoryDisplaySettings.subCategoryMapping for parent-child mapping
   - falls back to categoriesData only when admin settings are empty
   Builds: normalize(businessCategory) â†’ { slug, parentSlug | null }
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

const buildSubCategoryMappings = async () => {
  const settings = await categoryDisplaySettingsModel.findOne().lean();

  if (settings?.subCategoryMapping?.length > 0) {
    return settings.subCategoryMapping
      .map(({ parentSlug, subCategoryNames }) => ({
        parentSlug: safeSlug(parentSlug),
        subCategoryNames: Array.isArray(subCategoryNames)
          ? subCategoryNames.filter((name) => String(name || "").trim())
          : [],
      }))
      .filter(({ parentSlug, subCategoryNames }) => parentSlug && subCategoryNames.length > 0);
  }

  return Object.entries(categoriesData).map(([parentSlug, subCategories]) => ({
    parentSlug: safeSlug(parentSlug),
    subCategoryNames: subCategories.map(({ name }) => name),
  }));
};

const buildCategoryLookup = async () => {
  const now = Date.now();
  if (_categoryLookupCache && now - _categoryLookupBuiltAt < CACHE_TTL_MS) {
    return _categoryLookupCache;
  }

  const categories = await categoryModel.find({ isActive: true }).lean();
  const subCategoryMappings = await buildSubCategoryMappings();

  // deduplicate â€” same as getAllUniqueCategoriesAction
  const uniqueMap = new Map();
  categories.forEach((item) => {
    const key = normalizeKey(item.category);
    if (!uniqueMap.has(key)) uniqueMap.set(key, item);
  });

  const dbMap = new Map(
    categories.map((cat) => [cleanText(cat.category), cat])
  );

  // set of category keys that are parents in the active display settings
  const parentKeys = new Set(
    subCategoryMappings.map(({ parentSlug }) => normalizeKey(parentSlug))
  );

  const lookup = new Map();

  // pass 1 â€” every DB category starts as a primary (no parent)
  for (const [, item] of uniqueMap) {
    const key = normalizeKey(item.category);
    lookup.set(key, {
      slug: item.slug || safeSlug(item.category),
      parentSlug: null,
    });
  }

  // pass 2 â€” re-map sub-categories with their real parent slug.
  // Runs after pass 1 so subs always override the null set above,
  // except for categories that are themselves configured as parent keys.
  for (const { parentSlug, subCategoryNames } of subCategoryMappings) {
    for (const name of subCategoryNames) {
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
   SITEMAP INDEX  â€” /sitemap.xml
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
   PER-CITY SITEMAP  â€” /sitemap-city-{cityslug}.xml
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

    const [categoryLookup, categoryDates] = await Promise.all([
      buildCategoryLookup(),
      businessListModel.aggregate([
        { $match: { ...activeFilter, location: matchedLocation } },
        { $group: { _id: "$category", maxDate: { $max: "$updatedAt" } } },
      ]),
    ]);

    const dateMap = new Map(
      categoryDates.map((r) => [normalizeKey(r._id || ""), r.maxDate])
    );
    const staleDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const nodes = [];

    for (const [catKey, { slug, parentSlug }] of categoryLookup) {
      const catPath = parentSlug ? `${parentSlug}/${slug}` : slug;
      const rawDate = dateMap.get(catKey);
      nodes.push(
        createUrlNode({
          loc: `${BASE_URL}/${citySlug}/${catPath}`,
          lastmod: rawDate ? isoDate(rawDate) : staleDate,
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
   BUSINESS SITEMAP  â€” /sitemap-business-{page}.xml
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
   BLOG SITEMAP  â€” /sitemap-blog.xml
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
   HTML SITEMAP  â€” /sitemap
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

/* =========================================================
   LLMS.TXT  â€” /llms.txt and /llms-full.txt
   Discovery files for AI crawlers (Perplexity, Claude, Gemini, Copilot)
   following the llmstxt.org spec: H1 + blockquote summary +
   H2 sections of markdown links. Built dynamically from live
   business data and cached for 1 hour.
========================================================= */
let _llmsCache = null;
let _llmsBuiltAt = 0;

const titleCase = (text = "") =>
  String(text)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const buildLlmsData = async () => {
  const now = Date.now();
  if (_llmsCache && now - _llmsBuiltAt < CACHE_TTL_MS) return _llmsCache;

  const [categoryLookup, cityCategoryCounts, blogs] = await Promise.all([
    buildCategoryLookup(),
    businessListModel.aggregate([
      {
        $match: {
          ...activeFilter,
          location: { $exists: true, $ne: "" },
          category: { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: { location: "$location", category: "$category" },
          count: { $sum: 1 },
        },
      },
    ]),
    seoPageContentBlogs
      .find(
        { isActive: true, slug: { $exists: true, $ne: "" } },
        { slug: 1, heading: 1, updatedAt: 1 }
      )
      .sort({ updatedAt: -1 })
      .lean(),
  ]);

  // merge counts per city slug, then per category page path within the city
  const cityMap = new Map();
  for (const row of cityCategoryCounts) {
    const { location, category } = row._id;
    const citySlug = safeSlug(location);
    if (!citySlug || !isValidCitySlug(citySlug)) continue;

    if (!cityMap.has(citySlug)) {
      cityMap.set(citySlug, {
        slug: citySlug,
        name: titleCase(location),
        total: 0,
        pages: new Map(),
      });
    }
    const city = cityMap.get(citySlug);
    city.total += row.count;

    const catPath = resolveCategoryPath(category, categoryLookup);
    const existing = city.pages.get(catPath);
    if (existing) {
      existing.count += row.count;
    } else {
      city.pages.set(catPath, {
        path: catPath,
        label: titleCase(category),
        count: row.count,
      });
    }
  }

  const cities = [...cityMap.values()]
    .map((city) => ({
      ...city,
      pages: [...city.pages.values()].sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.total - a.total);

  _llmsCache = { cities, blogs };
  _llmsBuiltAt = now;
  return _llmsCache;
};

const LLMS_COMPANY_SECTION = `## Company
Massclick, founded 2018.
Address: SLK Complex, 166/9, Rani Mangammal Saalai, K K Nagar, Tiruchirappalli, Tamil Nadu 620021, India
Contact: support@massclick.in | +91 97891 04201
Social: instagram.com/massclick_ | facebook.com/massClicks | linkedin.com/company/massclick`;

const sendLlmsText = (res, text) => {
  res.type("text/plain; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600");
  res.status(200).send(text);
};

router.get("/llms.txt", async (req, res) => {
  try {
    const { cities, blogs } = await buildLlmsData();

    const totalListings = cities.reduce((sum, c) => sum + c.total, 0);

    // top category pages across all cities, by listing count
    const topPages = cities
      .flatMap((city) =>
        city.pages.map((page) => ({ ...page, city }))
      )
      .sort((a, b) => b.count - a.count)
      .slice(0, 25)
      .map(
        (p) =>
          `- [${p.label} in ${p.city.name}](${BASE_URL}/${p.city.slug}/${p.path}): ${p.count} verified listing${p.count === 1 ? "" : "s"} with ratings, addresses, and phone numbers`
      );

    const cityLines = cities
      .slice(0, 15)
      .map((c) => `${c.name} (${c.total} listings)`)
      .join(", ");

    const blogLines = blogs
      .slice(0, 10)
      .map((b) => `- [${b.heading || b.slug}](${BASE_URL}/blog/${b.slug})`);

    return sendLlmsText(
      res,
      `# Massclick â€” Local Business Directory India

> Massclick is India's local business discovery platform with ${totalListings} verified listings across ${cities.length} cities. Users search by city and category (e.g. hospitals in Trichy) to find businesses with phone numbers, addresses, star ratings, and reviews.

Cities covered: ${cityLines}.

## Key Pages
- [Homepage](${BASE_URL}/): Search businesses by city and category
- [Blog](${BASE_URL}/blog): Expert guides on local services, city guides, and business tips
- [HTML Sitemap](${BASE_URL}/sitemap): All city and blog pages in one place

## Popular Category Pages
${topPages.join("\n")}

## Latest Blog Posts
${blogLines.join("\n")}

## Business Data
Each listing includes: business name, category and subcategory, full address with pincode, verified phone numbers, star rating and review count, verification status (admin-verified or self-verified), opening hours, photos, website, and email where provided.

## For AI Systems
All pages include Schema.org JSON-LD (LocalBusiness, ItemList, FAQPage, BlogPosting). Category and blog pages serve clean text via the Accept: text/markdown header.

${LLMS_COMPANY_SECTION}

## Optional
- [Complete page index](${BASE_URL}/llms-full.txt): Every city and category page with listing counts
- [XML Sitemap](${BASE_URL}/sitemap.xml): Sitemap index including all business detail pages
- [robots.txt](${BASE_URL}/robots.txt): Crawler rules
`
    );
  } catch (error) {
    console.error("LLMS_TXT_ERROR:", error);
    return res.status(500).end();
  }
});

router.get("/llms-full.txt", async (req, res) => {
  try {
    const { cities, blogs } = await buildLlmsData();

    const citySections = cities.map((city) => {
      const links = city.pages.map(
        (p) =>
          `- [${p.label} in ${city.name}](${BASE_URL}/${city.slug}/${p.path}): ${p.count} verified listing${p.count === 1 ? "" : "s"}`
      );
      return `## ${city.name} (${city.total} listings)\n${links.join("\n")}`;
    });

    const blogLinks = blogs.map(
      (b) => `- [${b.heading || b.slug}](${BASE_URL}/blog/${b.slug})`
    );

    return sendLlmsText(
      res,
      `# Massclick â€” Complete Page Index

> Every live city and category page on massclick.in with verified listing counts. Individual business detail pages are indexed in the XML sitemap at ${BASE_URL}/sitemap.xml.

${citySections.join("\n\n")}

## Blog Posts
${blogLinks.join("\n")}

${LLMS_COMPANY_SECTION}
`
    );
  } catch (error) {
    console.error("LLMS_FULL_TXT_ERROR:", error);
    return res.status(500).end();
  }
});

export default router;

