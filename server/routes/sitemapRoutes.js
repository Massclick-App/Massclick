import express from "express";
import businessListModel from "../model/businessList/businessListModel.js";
import { slugify } from "../slugify.js";

const router = express.Router();

const BASE_URL = "https://massclick.in";
const LIMIT = 1000;

/* ==================================================
   LOCATION NORMALIZER
================================================== */
const normalizeLocation = (value = "") => {
  const slug = slugify(String(value).trim());

  const aliases = {
    trichy: "tiruchirappalli",
    tiruchi: "tiruchirappalli",
    tiruchy: "tiruchirappalli",
    tiruchirapalli: "tiruchirappalli",
    tiruchirappalli: "tiruchirappalli",

    pudukottai: "pudukkottai",
    pudukkottai: "pudukkottai",

    "gudalur-the-nilgiris": "gudalur",
    gudalur: "gudalur",

    madras: "chennai",
    bombay: "mumbai",
    bengaluru: "bangalore"
  };

  return aliases[slug] || slug;
};

/* ==================================================
   XML ESCAPE
================================================== */
const escapeXml = (value = "") => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

/* ==================================================
   CATEGORY GROUPS
================================================== */
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
      "electrical"
    ]
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
      "kindergarten"
    ]
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
      "medical"
    ]
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
      "bakery"
    ]
  },
  {
    parent: "beauty-and-spa",
    exact: ["salon", "salons"],
    keywords: [
      "salon",
      "beauty",
      "spa",
      "hair",
      "makeup"
    ]
  },
  {
    parent: "electronics",
    exact: ["electronics"],
    keywords: [
      "cctv",
      "camera",
      "computer",
      "laptop",
      "printer",
      "mobile"
    ]
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
      "generator"
    ]
  }
];

/* ==================================================
   CATEGORY + SUBCATEGORY
================================================== */
const getCategoryHierarchy = (category = "") => {
  const slug = slugify(String(category).trim());

  for (const group of categoryGroups) {
    if (group.exact.includes(slug)) {
      return {
        parent: group.parent,
        child: null
      };
    }

    const matched = group.keywords.some((word) =>
      slug.includes(word)
    );

    if (matched) {
      return {
        parent: group.parent,
        child: slug
      };
    }
  }

  return {
    parent: slug,
    child: null
  };
};

/* ==================================================
   XML URL BLOCK
================================================== */
const createUrl = ({
  loc,
  lastmod,
  changefreq = "daily",
  priority = "0.8"
}) => {
  return `
  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
};

/* ==================================================
   CATEGORY SITEMAP
================================================== */
router.get("/sitemap-category-city-:page.xml", async (req, res) => {
  try {
    res.type("application/xml");
    res.set("Cache-Control", "public, max-age=86400");

    const page = Number(req.params.page) || 1;
    const skip = (page - 1) * LIMIT;

    const categoryData = await businessListModel.aggregate([
      {
        $match: {
          isActive: true,
          businessesLive: true,
          location: { $exists: true, $ne: "" },
          category: { $exists: true, $ne: "" }
        }
      },
      {
        $group: {
          _id: {
            location: "$location",
            category: "$category"
          },
          updatedAt: { $max: "$updatedAt" }
        }
      },
      {
        $sort: {
          "_id.location": 1,
          "_id.category": 1
        }
      }
    ]);

    const uniqueUrls = new Set();
    const allUrls = [];

    for (const item of categoryData) {
      const location = slugify(item._id.location);

      const { parent, child } = getCategoryHierarchy(
        item._id.category
      );

      const lastmod = item.updatedAt
        ? new Date(item.updatedAt).toISOString()
        : new Date().toISOString();

      const parentUrl =
        `${BASE_URL}/${location}/${parent}`;

      if (!uniqueUrls.has(parentUrl)) {
        uniqueUrls.add(parentUrl);

        allUrls.push(
          createUrl({
            loc: parentUrl,
            lastmod,
            priority: "0.8"
          })
        );
      }

      if (child && child !== parent) {
        const childUrl =
          `${BASE_URL}/${location}/${parent}/${child}`;

        if (!uniqueUrls.has(childUrl)) {
          uniqueUrls.add(childUrl);

          allUrls.push(
            createUrl({
              loc: childUrl,
              lastmod,
              priority: "0.9"
            })
          );
        }
      }
    }

    const paginated = allUrls
      .slice(skip, skip + LIMIT)
      .join("");

    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paginated}
</urlset>`);

  } catch (error) {
    console.error("Category Sitemap Error:", error);
    res.status(500).end();
  }
});

/* ==================================================
   BUSINESS SITEMAP
================================================== */
router.get("/sitemap-business-:page.xml", async (req, res) => {
  try {
    res.type("application/xml");
    res.set("Cache-Control", "public, max-age=86400");

    const page = Number(req.params.page) || 1;
    const skip = (page - 1) * LIMIT;

    const businesses = await businessListModel
      .find(
        {
          isActive: true,
          businessesLive: true
        },
        {
          businessName: 1,
          location: 1,
          updatedAt: 1
        }
      )
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(LIMIT)
      .lean();

    const urls = businesses.map((item) => {
     const location = slugify(item.location);

      const businessSlug =
        slugify(item.businessName || "business");

      const lastmod = item.updatedAt
        ? new Date(item.updatedAt).toISOString()
        : new Date().toISOString();

      return createUrl({
        loc: `${BASE_URL}/${location}/${businessSlug}/${item._id}`,
        lastmod,
        changefreq: "weekly",
        priority: "0.8"
      });
    }).join("");

    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);

  } catch (error) {
    console.error("Business Sitemap Error:", error);
    res.status(500).end();
  }
});

/* ==================================================
   MAIN SITEMAP INDEX
================================================== */
router.get("/sitemap.xml", async (req, res) => {
  try {
    res.type("application/xml");
    res.set("Cache-Control", "public, max-age=86400");

    const totalBusinesses =
      await businessListModel.countDocuments({
        isActive: true,
        businessesLive: true
      });

    const totalBusinessPages =
      Math.ceil(totalBusinesses / LIMIT);

    const categoryCount =
      await businessListModel.aggregate([
        {
          $match: {
            isActive: true,
            businessesLive: true,
            location: { $exists: true, $ne: "" },
            category: { $exists: true, $ne: "" }
          }
        },
        {
          $group: {
            _id: {
              location: "$location",
              category: "$category"
            }
          }
        },
        {
          $count: "total"
        }
      ]);

    const totalCategories =
      categoryCount[0]?.total || 0;

    const totalCategoryPages =
      Math.ceil(totalCategories / LIMIT);

    let links = "";

    for (let i = 1; i <= totalCategoryPages; i++) {
      links += `
  <sitemap>
    <loc>${BASE_URL}/sitemap-category-city-${i}.xml</loc>
  </sitemap>`;
    }

    for (let i = 1; i <= totalBusinessPages; i++) {
      links += `
  <sitemap>
    <loc>${BASE_URL}/sitemap-business-${i}.xml</loc>
  </sitemap>`;
    }

    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${links}
</sitemapindex>`);

  } catch (error) {
    console.error("Sitemap Index Error:", error);
    res.status(500).end();
  }
});

export default router;