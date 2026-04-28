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
    parent: "contractor",
    exact: ["contractor", "contractors"],
    keywords: [
      "painting contractor",
      "roofing contractors",
      "civil contractors",
      "plumbing contractor",
      "flooring contractors",
      "carpentry contractors",
      "interior contractors",
      "false ceiling contractors",
      "road construction contractors",
      "labour contractors",
      "fabrication contractors",
      "drainage contractors",
      "pipeline contractors",
      "waterproofing contractors",
      "tiling contractors",
      "welding contractors",
      "fire fighting contractors",
      "borewell contractors",
      "electrical contractor",
      "building contractors"
    ]
  },
  {
    parent: "education",
    exact: ["education"],
    keywords: [
      "Vocational Training",
      "schools",
      "play schools",
      "online education",
      "colleges",
      "kindergartens",
      "skill development institutes",
      "tutorials",
      "children schools",
      "coaching centers",
      "language training centers"
    ]
  },
  {
    parent: "hospitals",
    exact: ["hospital", "hospitals"],
    keywords: [
      "Dentist",
      "ayurvedic hospitals",
      "orthopedic hospitals",
      "public hospitals",
      "neurological hospitals",
      "multispeciality hospitals",
      "public veterinary hospitals",
      "eye hospitals",
      "children hospitals",
      "cancer hospitals",
      "swine flu testing centres",
      "veterinary hospitals",
      "nursing homes",
      "private hospitals",
      "kidney hospitals",
      "maternity hospitals",
      "diabetic centres",
      "cardiac hospitals",
      "tuberculosis hospitals"
    ]
  },
  {
    parent: "rent-and-hire",
    exact: ["rent-and-hire"],
    keywords: [
      "car rental",
      "cranes on rent",
      "mini trucks on rent",
      "costumes on rent",
      "bike on rent",
      "chairs on rent",
      "mini bus on rent",
      "cooks on rent",
      "passenger van on rent",
      "ac on rent",
      "cameras on rent",
      "projectors on rent",
      "furnitures on rent",
      "dj equipments on rent",
      "rooms on rent",
      "air coolers on rent",
      "Dead Body Freezer Box On Rent",
      "sound systems on rent",
      "bridal wear on rent",
      "farm house on rent",
      "tempo travellers on rent",
      "bungalows on rent",
      "generators on rent",
      "trucks on rent",
      "bus on rent",
      "laptops on rent",
      "vans on rent"
    ]
  },
  {
    parent: "packers-and-movers",
    exact: ["packers-and-movers"],
    keywords: [
      "packers and movers outside india",
      "packers and movers within city",
      "Packers And Movers For Commercial",
      "packers and movers all india"
    ]
  }
];

const getCategoryHierarchy = (category = "") => {
  const slug = safeSlug(category);

  for (const group of categoryGroups) {
    // parent direct match
    if (group.exact.includes(slug)) {
      return { parent: group.parent, child: null };
    }

    // child exact slug match
    for (const item of group.keywords) {
      const childSlug = safeSlug(item);

      if (slug === childSlug) {
        return {
          parent: group.parent,
          child: childSlug,
        };
      }
    }
  }

  return null;
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

    const result = getCategoryHierarchy(category);

    if (!result) continue;

    const { parent, child } = result;
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

    if (child) {
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