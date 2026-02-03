import express from "express";
import businessListModel from "../model/businessList/businessListModel.js";

const router = express.Router();


const SITEMAP_BASE = "https://api.massclick.in";   
const SITE_BASE = "https://massclick.in";          


const LIMIT = 1000;

const slugify = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

router.get("/sitemap-category-city-:page.xml", async (req, res) => {
  try {
    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=86400");

    const page = Number(req.params.page) || 1;
    const skip = (page - 1) * LIMIT;

    const businesses = await businessListModel
      .find(
        { isActive: true, businessesLive: true },
        { location: 1, category: 1 }
      )
      .lean();

    const uniquePaths = new Set();

    businesses.forEach((b) => {
      if (b.location && b.category) {
        uniquePaths.add(
          `${slugify(b.location)}/${slugify(b.category)}`
        );
      }
    });

    const urls = Array.from(uniquePaths)
      .slice(skip, skip + LIMIT)
      .map(
        (path) => `
        <url>
          <loc>${SITE_BASE}/${path}</loc>
          <changefreq>daily</changefreq>
          <priority>0.9</priority>
        </url>
      `
      )
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
  res.set("Content-Type", "application/xml");

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

  const urls = businesses.map(b => `
    <url>
      <loc>${SITE_BASE}/${slugify(b.location)}/${slugify(b.businessName)}/${b._id}</loc>
      <lastmod>${new Date(b.updatedAt).toISOString()}</lastmod>
      <priority>0.8</priority>
    </url>
  `).join("");

  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
});

router.get("/sitemap.xml", async (req, res) => {
  try {
    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=86400");

    const totalBusinesses = await businessListModel.countDocuments({
      isActive: true,
      businessesLive: true,
    });

    const totalPages = Math.ceil(totalBusinesses / LIMIT);

    let links = "";

    for (let i = 1; i <= totalPages; i++) {
      links += `
  <sitemap>
    <loc>${SITEMAP_BASE}/sitemap-category-city-${i}.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${SITEMAP_BASE}/sitemap-business-${i}.xml</loc>
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
