import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import compression from "compression";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import userRoutes from "./routes/userRoutes.js";
import userClientRoutes from "./routes/userClientRoute.js";
import locationRoutes from "./routes/locationRoute.js";
import fcmTokenRoutes from "./routes/fcmTokenRoutes.js";
import oauthRoutes from "./routes/oauthRoutes.js";
import categoryRoutes from "./routes/categoryRoute.js";
import businessListRoutes from "./routes/businessListRoute.js";
import rolesRoutes from "./routes/rolesRoutes.js";
import enquiryRoutes from "./routes/enquiryRoute.js";
import startYourProjectRoutes from "./routes/startYourProjectRoutes.js";
import otpRoutes from "./routes/msg91Routes.js";
import phonePayRoutes from "./routes/phonePayRoute.js";
import advertismentRoutes from "./routes/advertistmentRoute.js";
import leadsDataRoutes from "./routes/leadsDataRoutes.js";
import seoRoutes from "./routes/seoRoutes.js";
import mrpRoutes from "./routes/mrpRoutes.js";
import popularSearchRoutes from "./routes/popularSearchRoutes.js";
import sitemapRoutes from "./routes/sitemapRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import advertiseRoute from "./routes/advertiseRoute.js";
import versionRoutes from "./routes/versionRoutes.js";
import favoriteRoute from "./routes/favoriteRoute.js";
import fcmAdminRoutes from "./routes/fcmAdminRoutes.js";
import footerRoutes from "./routes/footerRoute.js";
import { startFCMScheduler } from "./scheduler/fcmScheduler.js";
import { getSeoMeta } from "./helper/seo/seoHelper.js";
import { register } from "./utils/metrics.js";
import { metricsMiddleware } from "./utils/metricsMiddleware.js";

dotenv.config();

const app = express();
app.set("trust proxy", true);

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URL;
const CLIENT_BUILD_PATH = process.env.REACT_BUILD_PATH;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

const slugToText = (value = "") => value.replace(/-/g, " ").trim();
const titleCase = (value = "") => value.replace(/\b\w/g, s => s.toUpperCase());

const toText = slugToText;
const toTitle = titleCase;

app.use((req, res, next) => {
  const host = req.headers.host || "";
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;

  if (!host.includes("localhost") && !host.includes("127.0.0.1")) {
    if (protocol !== "https") {
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
    if (host === "www.massclick.in") {
      return res.redirect(301, `https://massclick.in${req.originalUrl}`);
    }
  }
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

app.use(compression());

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(metricsMiddleware);

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *\nAllow: /\nSitemap: https://massclick.in/sitemap.xml`);
});

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, uptime: process.uptime() });
});

app.use("/", sitemapRoutes);
app.use("/", userRoutes);
app.use("/", fcmTokenRoutes);
app.use("/", oauthRoutes);
app.use("/", userClientRoutes);
app.use("/", locationRoutes);
app.use("/", categoryRoutes);
app.use("/", businessListRoutes);
app.use("/", rolesRoutes);
app.use("/", enquiryRoutes);
app.use("/", startYourProjectRoutes);
app.use("/", otpRoutes);
app.use("/", phonePayRoutes);
app.use("/", advertismentRoutes);
app.use("/", leadsDataRoutes);
app.use("/", seoRoutes);
app.use("/", mrpRoutes);
app.use("/", popularSearchRoutes);
app.use("/", reviewRoutes);
app.use("/", advertiseRoute);
app.use("/", versionRoutes);
app.use("/", footerRoutes);
app.use("/", favoriteRoute);
app.use("/", fcmAdminRoutes);

app.use(express.static(CLIENT_BUILD_PATH, {
  index: false,
  maxAge: "365d",
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-cache");
    } else {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  }
}));

app.get(/.*/, async (req, res) => {
  try {
    const indexPath = path.join(CLIENT_BUILD_PATH, "index.html");
    if (!fs.existsSync(indexPath)) {
      return res.status(404).send("Build not found");
    }

    let html = fs.readFileSync(indexPath, "utf8");
    const parts = req.path.split("/").filter(Boolean);

    const locationSlug = parts[0] || "";
    const categorySlug = parts[1] || "";
    const subcategorySlug = parts[2] || "";

    let seo = null;

    if (!locationSlug) {
      seo = await getSeoMeta({ pageType: "home" });
    } else if (locationSlug && categorySlug) {
      seo = await getSeoMeta({
        pageType: "category",
        location: toText(locationSlug),
        category: toText(subcategorySlug || categorySlug)
      });
    }

    const locationName = toTitle(toText(locationSlug || "trichy"));
    const categoryName = toTitle(toText(subcategorySlug || categorySlug || "Local Services"));

    const title = escapeHtml(seo?.title || `${categoryName} in ${locationName} | Massclick`);
    const description = escapeHtml(seo?.description || `Find the best ${categoryName} in ${locationName}. Verified listings, reviews, phone numbers, address and more on Massclick.`);
    const keywords = escapeHtml(seo?.keywords || `${categoryName}, ${locationName}, best ${categoryName} in ${locationName}`);
    const canonical = escapeHtml(seo?.canonical || `https://massclick.in${req.path}`);

    const h1 = `${categoryName} in ${locationName}`;

    const schema = {
      "@context": "https://schema.org",
      "@type": locationSlug ? "CollectionPage" : "WebSite",
      name: h1,
      url: canonical,
      description,
      publisher: {
        "@type": "Organization",
        name: "Massclick",
        url: "https://massclick.in"
      }
    };

    const serverContent = `
      <section style="padding:20px;font-family:Arial,sans-serif">
        <h1>${escapeHtml(h1)}</h1>
        <p>${description}</p>
        <div>
          <h2>Top ${escapeHtml(categoryName)}</h2>
          <p>Explore verified businesses, ratings, contact details and addresses in ${escapeHtml(locationName)}.</p>
        </div>
      </section>
    `;

    // Replace meta tag content values by processing each tag (robust against minified HTML)
    html = html
      .replace(/<title\b[^>]*>[^<]*<\/title>/i, `<title>${title}</title>`)
      .replace(/<meta\b[^>]*>/gi, (tag) => {
        const nameVal = (tag.match(/\bname\s*=\s*["']?([\w:.-]+)["']?/i) || [])[1]?.toLowerCase();
        const propVal = (tag.match(/\bproperty\s*=\s*["']?([\w:.-]+)["']?/i) || [])[1]?.toLowerCase();
        const setContent = (val) => tag.replace(/(\bcontent\s*=\s*["'])([^"']*)/, `$1${val}`);
        if (nameVal === "description") return setContent(description);
        if (nameVal === "keywords") return setContent(keywords);
        if (nameVal === "twitter:title") return setContent(title);
        if (nameVal === "twitter:description") return setContent(description);
        if (propVal === "og:title") return setContent(title);
        if (propVal === "og:description") return setContent(description);
        if (propVal === "og:url") return setContent(canonical);
        return tag;
      })
      .replace(/<link\b[^>]*>/gi, (tag) => {
        if (/\brel\s*=\s*["']?canonical["']?/i.test(tag))
          return tag.replace(/(\bhref\s*=\s*["'])([^"']*)/, `$1${canonical}`);
        return tag;
      });

    // Inject SEO data as a window variable — client reads this for instant correct hydration
    const ssrSeoJson = JSON.stringify({ title, description, keywords, canonical, robots: "index, follow" })
      .replace(/<\//g, "<\\/");
    html = html
      .replace("</head>", `<script>window.__SSR_SEO__=${ssrSeoJson}</script><script type="application/ld+json">${JSON.stringify(schema)}</script></head>`)
      .replace('<div id="root"></div>', `<div id="root">${serverContent}</div>`);

    res.setHeader("X-Robots-Tag", "index, follow");
    return res.status(200).send(html);
  } catch (error) {
    console.error("SSR Error:", error);
    return res.status(500).send("Server Error");
  }
});

mongoose.connect(MONGO_URI)
  .then(() => {
    startFCMScheduler();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => console.error(err));
