import express from "express";
import businessListModel from "../model/businessList/businessListModel.js";
import { slugify } from "../slugify.js";

const router = express.Router();

const BASE_URL = "https://massclick.in";
const LIMIT = 1000;


const normalizeWord = (word = "") => {
  return word.replace(/s$/, "");
};


const getCategoryHierarchy = (category = "") => {
  const slug = slugify(category);

  const groups = [
    {
      parent: "contractors",
      exact: ["contractor", "contractors"],
      keywords: ["contractor", "builder", "construction"]
    },
    {
      parent: "education",
      exact: ["education"],
      keywords: [
        "school",
        "schools",
        "college",
        "colleges",
        "play-school",
        "play-schools",
        "kindergarten",
        "tutorial",
        "coaching",
        "training",
        "institute",
        "tuition",
        "vocational"
      ]
    },
    {
      parent: "rent-and-hire",
      exact: ["rent-and-hire", "rent and hire"],
      keywords: [
        "rent",
        "rental",
        "hire",
        "car-rental",
        "truck",
        "mini-bus",
        "bus",
        "van",
        "tempo",
        "generator",
        "chairs",
        "projector",
        "rooms"
      ]
    },
    {
      parent: "hospitals",
      exact: ["hospital", "hospitals"],
      keywords: [
        "hospital",
        "hospitals",
        "clinic",
        "dentist",
        "dentists",
        "eye",
        "ent",
        "cardiac",
        "kidney",
        "maternity",
        "nursing",
        "veterinary",
        "diabetic",
        "cancer"
      ]
    },
    {
      parent: "packers-and-movers",
      exact: ["packers-and-movers", "packers and movers"],
      keywords: [
        "packer",
        "packers",
        "mover",
        "movers",
        "transporter",
        "transporters",
        "relocation",
        "shifting"
      ]
    }
  ];

  for (const group of groups) {
    if (group.exact.includes(slug)) {
      return {
        parent: group.parent,
        child: null
      };
    }

    const matched = group.keywords.some(word =>
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


router.get("/sitemap-category-city-:page.xml", async (req, res) => {
  try {
    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=86400");

    const page = Number(req.params.page) || 1;
    const skip = (page - 1) * LIMIT;

    const categoryData = await businessListModel.aggregate([
      { $match: { isActive: true, businessesLive: true } },
      {
        $group: {
          _id: {
            location: {
              $toLower: {
                $trim: { input: "$location" }
              }
            },
            category: {
              $toLower: {
                $trim: { input: "$category" }
              }
            }
          },
          updatedAt: { $max: "$updatedAt" },
        },
      },
    ]);

    let allUrls = [];
    const uniqueUrls = new Set();

    categoryData.forEach((item) => {
      const location = slugify(item._id.location);
      const { parent, child } = getCategoryHierarchy(item._id.category);

      const lastmod = item.updatedAt
        ? new Date(item.updatedAt).toISOString()
        : new Date().toISOString();

      // ✅ Parent URL
      const parentUrl = `${BASE_URL}/${location}/${parent}`;

      if (!uniqueUrls.has(parentUrl)) {
        uniqueUrls.add(parentUrl);

        allUrls.push(`
        <url>
          <loc>${parentUrl}</loc>
          <lastmod>${lastmod}</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.8</priority>
        </url>`);
      }

      if (
        child &&
        normalizeWord(child) !== normalizeWord(parent) &&
        child !== parent
      ) {
        const childUrl = `${BASE_URL}/${location}/${parent}/${child}`;

        if (!uniqueUrls.has(childUrl)) {
          uniqueUrls.add(childUrl);

          allUrls.push(`
          <url>
            <loc>${childUrl}</loc>
            <lastmod>${lastmod}</lastmod>
            <changefreq>daily</changefreq>
            <priority>0.9</priority>
          </url>`);
        }
      }
    });

    const paginated = allUrls.slice(skip, skip + LIMIT).join("");

    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paginated}
</urlset>`);
  } catch (error) {
    console.error("❌ Category Sitemap Error:", error);
    res.status(500).end();
  }
});

router.get("/sitemap-business-:page.xml", async (req, res) => {
  try {
    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=86400");

    const page = Number(req.params.page) || 1;
    const skip = (page - 1) * LIMIT;

    const businesses = await businessListModel
      .find(
        { isActive: true, businessesLive: true },
        { businessName: 1, location: 1, updatedAt: 1 }
      )
      .skip(skip)
      .limit(LIMIT)
      .lean();

    const urls = businesses
      .map((b) => {
        const location = slugify(b.location);
        const business = slugify(b.businessName);

        const lastmod = b.updatedAt
          ? new Date(b.updatedAt).toISOString()
          : new Date().toISOString();

        return `
        <url>
          <loc>${BASE_URL}/${location}/${business}/${b._id}</loc>
          <lastmod>${lastmod}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>`;
      })
      .join("");

    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
  } catch (error) {
    console.error("❌ Business Sitemap Error:", error);
    res.status(500).end();
  }
});

router.get("/sitemap.xml", async (req, res) => {
  try {
    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=86400");

    const totalBusinesses = await businessListModel.countDocuments({
      isActive: true,
      businessesLive: true,
    });

    const totalBusinessPages = Math.ceil(totalBusinesses / LIMIT);

    const totalCategoryData = await businessListModel.aggregate([
      { $match: { isActive: true, businessesLive: true } },
      {
        $group: {
          _id: {
            location: "$location",
            category: "$category",
          },
        },
      },
      { $count: "total" },
    ]);

    const totalCategory = totalCategoryData[0]?.total || 0;
    const totalCategoryPages = Math.ceil(totalCategory / LIMIT);

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
    console.error("❌ Sitemap Index Error:", error);
    res.status(500).end();
  }
});

export default router;