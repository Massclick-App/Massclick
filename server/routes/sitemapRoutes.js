import express from "express";
import businessListModel from "../model/businessList/businessListModel.js";
import { slugify } from "../slugify.js";

const router = express.Router();

const BASE_URL = "https://massclick.in";
const LIMIT = 1000;



router.get("/sitemap-category-city-:page.xml", async (req, res) => {
  try {
    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=86400");

    const page = Number(req.params.page) || 1;
    const skip = (page - 1) * LIMIT;

    const results = await businessListModel.aggregate([
      { $match: { isActive: true, businessesLive: true } },
      {
        $group: {
          _id: {
            location: "$location",
            category: "$category",
          },
          updatedAt: { $max: "$updatedAt" },
        },
      },
      { $skip: skip },
      { $limit: LIMIT },
    ]);

    const urls = results
      .map((item) => {
        const location = slugify(item._id.location);
        const category = slugify(item._id.category);
        const lastmod = item.updatedAt
          ? new Date(item.updatedAt).toISOString()
          : new Date().toISOString();

        return `
        <url>
          <loc>${BASE_URL}/${location}/${category}</loc>
          <lastmod>${lastmod}</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.9</priority>
        </url>`;
      })
      .join("");

    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
  } catch (error) {
    console.error("❌ Category-City Sitemap Error:", error);
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

    const uniqueCount = await businessListModel.aggregate([
      { $match: { isActive: true, businessesLive: true } },
      {
        $group: {
          _id: { location: "$location", category: "$category" },
        },
      },
      { $count: "total" },
    ]);

    const totalCategoryCity = uniqueCount[0]?.total || 0;
    const totalCategoryPages = Math.ceil(totalCategoryCity / LIMIT);

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
