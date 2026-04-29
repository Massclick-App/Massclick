import express from "express";
import businessListModel from "../model/businessList/businessListModel.js";
import { slugify } from "../slugify.js";
import seoPageContentBlogs from "../model/seoModel/seoPageContentBlogModel.js";

const router = express.Router();

/* =========================================================
   CONFIG
========================================================= */
const BASE_URL = "https://massclick.in";
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
}) => {
  return `
  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
};

const createSitemapNode = (loc) => {
  return `
  <sitemap>
    <loc>${xmlEscape(loc)}</loc>
  </sitemap>`;
};

const sendXml = (res, xml) => {
  res.type("application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  res.status(200).send(xml);
};

/* =========================================================
   CATEGORY MAPPING
========================================================= */
const categoryGroups = [
  {
    parent: "contractors",
    exact: ["contractor", "contractors"],
    keywords: [
      "contractor",
      "builder",
      "construction",
      "roofing",
      "interior",
      "fabrication",
      "civil",
      "tiles",
      "painting",
      "plumbing",
      "electrical",
    ],
  },
  {
    parent: "education",
    exact: ["education"],
    keywords: [
      "school",
      "schools",
      "college",
      "colleges",
      "academy",
      "coaching",
      "tuition",
      "training",
      "institute",
      "play-school",
      "kindergarten",
    ],
  },
  {
    parent: "hospitals",
    exact: ["hospital", "hospitals"],
    keywords: [
      "hospital",
      "hospitals",
      "clinic",
      "hearing",
      "dental",
      "dentist",
      "ayurvedic",
      "homeopathic",
      "herbal",
      "medical",
    ],
  },
  {
    parent: "restaurants",
    exact: ["restaurant", "restaurants"],
    keywords: [
      "restaurant",
      "restaurants",
      "hotel",
      "veg",
      "non-veg",
      "food",
      "cafe",
      "biryani",
      "bakery",
    ],
  },
  {
    parent: "beauty-and-spa",
    exact: ["salon", "salons"],
    keywords: ["salon", "beauty", "spa", "hair", "makeup"],
  },
  {
    parent: "electronics",
    exact: ["electronics"],
    keywords: [
      "electronics",
      "cctv",
      "camera",
      "computer",
      "laptop",
      "printer",
      "mobile",
    ],
  },
  {
    parent: "rent-and-hire",
    exact: ["rent-and-hire"],
    keywords: [
      "rent",
      "rental",
      "hire",
      "car-rental",
      "van",
      "bus",
      "generator",
    ],
  },
];

const getCategoryHierarchy = (category = "") => {
  const slug = safeSlug(category);

  for (const group of categoryGroups) {
    if (group.exact.includes(slug)) {
      return { parent: group.parent, child: null };
    }

    const matched = group.keywords.some((word) => slug.includes(word));

    if (matched) {
      return { parent: group.parent, child: slug };
    }
  }

  return { parent: slug || "services", child: null };
};

/* =========================================================
   DB FILTERS
========================================================= */
const activeFilter = {
  isActive: true,
  businessesLive: true,
};

/* =========================================================
   DB FETCHERS
========================================================= */
const getCategoryRows = async () => {
  return businessListModel.aggregate([
    {
      $match: {
        ...activeFilter,
        location: { $exists: true, $ne: "" },
        category: { $exists: true, $ne: "" },
      },
    },
    {
      $group: {
        _id: {
          location: "$location",
          category: "$category",
        },
        updatedAt: { $max: "$updatedAt" },
      },
    },
    {
      $sort: {
        "_id.location": 1,
        "_id.category": 1,
      },
    },
  ]);
};

const getBusinessCount = async () => {
  return businessListModel.countDocuments(activeFilter);
};

/* =========================================================
   URL BUILDERS
========================================================= */
const buildCategoryUrlRecords = async () => {
  const rows = await getCategoryRows();
  const map = new Map();

  for (const row of rows) {
    const location = safeSlug(row?._id?.location);
    const category = row?._id?.category || "";

    if (!location || !category) continue;

    const { parent, child } = getCategoryHierarchy(category);
    const lastmod = isoDate(row.updatedAt);

    const parentUrl = `${BASE_URL}/${location}/${parent}`;

    if (!map.has(parentUrl)) {
      map.set(
        parentUrl,
        createUrlNode({
          loc: parentUrl,
          lastmod,
          priority: "0.8",
          changefreq: "daily",
        })
      );
    }

    if (child && child !== parent) {
      const childUrl = `${BASE_URL}/${location}/${parent}/${child}`;

      if (!map.has(childUrl)) {
        map.set(
          childUrl,
          createUrlNode({
            loc: childUrl,
            lastmod,
            priority: "0.9",
            changefreq: "daily",
          })
        );
      }
    }
  }

  return Array.from(map.values());
};

/* =========================================================
   HTML SITEMAP
========================================================= */
router.get("/sitemap", async (req, res) => {
  try {
    const [categoryUrlNodes, blogs] = await Promise.all([
      buildCategoryUrlRecords(),
      seoPageContentBlogs
        .find(
          {
            isActive: true,
            slug: { $exists: true, $ne: "" },
          },
          {
            slug: 1,
            heading: 1,
          }
        )
        .sort({ heading: 1 })
        .lean()
    ]);

    const categoryLinks = categoryUrlNodes
      .map((node) => (node.match(/<loc>(.*?)<\/loc>/i) || [])[1])
      .filter(Boolean)
      .slice(0, 200);

    const blogLinks = blogs.map((blog) => ({
      href: `${BASE_URL}/blog/${blog.slug}`,
      label: blog.heading || blog.slug,
    }));

    res.type("text/html; charset=utf-8");
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HTML Sitemap | Massclick</title>
  <meta name="description" content="Browse the Massclick HTML sitemap for blog posts and category listing pages." />
</head>
<body style="font-family: Arial, sans-serif; padding: 24px; line-height: 1.6;">
  <h1>Massclick HTML Sitemap</h1>
  <p>Browse important Massclick pages including category listings and blog posts.</p>
  <h2>Category Pages</h2>
  <ul>
    ${categoryLinks.map((href) => `<li><a href="${href}">${href}</a></li>`).join("")}
  </ul>
  <h2>Blog Pages</h2>
  <ul>
    ${blogLinks.map((item) => `<li><a href="${item.href}">${xmlEscape(item.label)}</a></li>`).join("")}
  </ul>
</body>
</html>`);
  } catch (error) {
    console.error("HTML_SITEMAP_ERROR:", error);
    return res.status(500).end();
  }
});

/* =========================================================
   CATEGORY SITEMAP
========================================================= */
router.get("/sitemap-category-city-:page.xml", async (req, res) => {
  try {
    const page = Math.max(Number(req.params.page) || 1, 1);
    const start = (page - 1) * LIMIT;
    const end = start + LIMIT;

    const urls = await buildCategoryUrlRecords();
    const sliced = urls.slice(start, end);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sliced.join("")}
</urlset>`;

    return sendXml(res, xml);
  } catch (error) {
    console.error("CATEGORY_SITEMAP_ERROR:", error);
    return res.status(500).end();
  }
});

/* =========================================================
   BUSINESS SITEMAP
========================================================= */
router.get("/sitemap-business-:page.xml", async (req, res) => {
  try {
    const page = Math.max(Number(req.params.page) || 1, 1);
    const skip = (page - 1) * LIMIT;

    const businesses = await businessListModel
      .find(
        activeFilter,
        {
          _id: 1,
          businessName: 1,
          location: 1,
          updatedAt: 1,
        }
      )
      .sort({ updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(LIMIT)
      .lean();

    const nodes = businesses.map((item) => {
      const location = safeSlug(item.location);
      const businessSlug = safeSlug(item.businessName || "business");

      return createUrlNode({
        loc: `${BASE_URL}/${location}/${businessSlug}/${item._id}`,
        lastmod: isoDate(item.updatedAt),
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
   BLOG SITEMAP
========================================================= */
router.get("/sitemap-blog.xml", async (req, res) => {
  try {
    const blogs = await seoPageContentBlogs
      .find(
        {
          isActive: true,
          slug: { $exists: true, $ne: "" },
        },
        {
          slug: 1,
          updatedAt: 1,
        }
      )
      .lean();

    const validBlogs = blogs.filter(
      (blog) => blog.slug && blog.slug.trim() !== ""
    );

    const nodes = validBlogs.map((blog) =>
      createUrlNode({
        loc: `${BASE_URL}/blog/${blog.slug}`,
        lastmod: isoDate(blog.updatedAt),
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
   MAIN SITEMAP INDEX
========================================================= */
router.get("/sitemap.xml", async (req, res) => {
  try {
    const [categoryUrls, totalBusinesses] = await Promise.all([
      buildCategoryUrlRecords(),
      getBusinessCount(),
    ]);

    const totalCategoryPages = Math.max(
      1,
      Math.ceil(categoryUrls.length / LIMIT)
    );

    const totalBusinessPages = Math.max(
      1,
      Math.ceil(totalBusinesses / LIMIT)
    );

    const links = [];

    for (let i = 1; i <= totalCategoryPages; i++) {
      links.push(
        createSitemapNode(
          `${BASE_URL}/sitemap-category-city-${i}.xml`
        )
      );
    }

    for (let i = 1; i <= totalBusinessPages; i++) {
      links.push(
        createSitemapNode(
          `${BASE_URL}/sitemap-business-${i}.xml`
        )
      );
    }

    links.push(
      createSitemapNode(`${BASE_URL}/sitemap-blog.xml`)
    );

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

export default router;
