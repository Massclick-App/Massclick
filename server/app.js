import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
// import prerender from "prerender-node";
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
import seoModel from "./model/seoModel/seoModel.js";
import footerRoutes from "./routes/footerRoute.js";

dotenv.config();

const app = express();
app.set("trust proxy", true);
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URL;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_BUILD_PATH =
  "/var/www/massclickQA/client/ui-app/build";

// const CLIENT_BUILD_PATH = path.join(
//   __dirname,
//   "../client/ui-app/build"
// );

// app.use((req, res, next) => {

//   const host = req.headers.host || "";

//   if (
//     host.includes("localhost") ||
//     host.includes("127.0.0.1")
//   ) {
//     return next();
//   }

//   const protocol =
//     req.headers["x-forwarded-proto"] || req.protocol;

//   // ✅ FIX: only redirect when REALLY needed
//   if (protocol !== "https") {
//     return res.redirect(301, `https://${host}${req.originalUrl}`);
//   }

//   // ✅ FIX: avoid loop
//   if (host === "www.massclick.in") {
//     return res.redirect(
//       301,
//       `https://massclick.in${req.originalUrl}`
//     );
//   }

//   next();

// });

const slugify = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(compression());


const allowedOrigins = [
  "https://massclick.in",
  "https://www.massclick.in",
  "https://dev.massclick.in",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4000"
];

// app.use(
//   cors({
//     origin: function (origin, callback) {

//       if (!origin) return callback(null, true);

//       if (allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       }

//       return callback(null, false);
//     },
//     credentials: true,
//   })
// );

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({
  extended: true,
  limit: "50mb"
}));

app.get("/robots.txt", (req, res) => {

  res.type("text/plain");

  res.send(`
User-agent: *
Allow: /

Sitemap: https://massclick.in/sitemap.xml
`);

});

app.get("/health", (req, res) => {
  const now = new Date();
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    uptime: process.uptime(),
    timestamp: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    isoTime: now.toISOString() 
  });
});

// routes
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

app.use(
  express.static(CLIENT_BUILD_PATH, {
    maxAge: "365d",
    etag: true,
    lastModified: true,

    setHeaders: (res, filePath) => {

      if (filePath.endsWith(".html")) {

        res.setHeader(
          "Cache-Control",
          "no-cache"
        );

      } else {

        res.setHeader(
          "Cache-Control",
          "public, max-age=31536000, immutable"
        );

      }

    },
  })
);

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

    if (locationSlug && categorySlug) {

      let finalCategory = categorySlug;

      if (subcategorySlug) {
        finalCategory = slugify(subcategorySlug);
      } else {
        finalCategory = slugify(categorySlug);
      }

      seo = await seoModel.findOne({
        pageType: "category",
        isActive: true,
        location: new RegExp(`^${locationSlug}$`, "i"),
        category: new RegExp(`^${finalCategory}$`, "i"),
      }).lean();
    }

    if (seo) {

      const title = seo.title;
      const description = seo.description;
      const keywords = seo.keywords;
      const canonical = seo.canonical;

      html = html.replace(
        /<title>.*<\/title>/,
        `<title>${title}</title>`
      );

      html = html.replace(
        /<meta name="description".*?>/,
        `<meta name="description" content="${description}" />`
      );

      html = html.replace(
        /<meta name="keywords".*?>/,
        `<meta name="keywords" content="${keywords}" />`
      );

      html = html.replace(
        /<link rel="canonical".*?>/,
        `<link rel="canonical" href="${canonical}" />`
      );

      html = html.replace(
        /<meta property="og:title".*?>/,
        `<meta property="og:title" content="${title}" />`
      );

      html = html.replace(
        /<meta property="og:description".*?>/,
        `<meta property="og:description" content="${description}" />`
      );

      html = html.replace(
        /<meta property="og:url".*?>/,
        `<meta property="og:url" content="${canonical}" />`
      );

      html = html.replace(
        /<meta name="twitter:title".*?>/,
        `<meta name="twitter:title" content="${title}" />`
      );

      html = html.replace(
        /<meta name="twitter:description".*?>/,
        `<meta name="twitter:description" content="${description}" />`
      );
    }

    res.send(html);

  } catch (err) {

    console.error("SEO ERROR:", err);
    res.status(500).send("Server error");

  }

});

mongoose.connect(MONGO_URI)
  .then(() => {

    console.log("MongoDB Connected");

    app.listen(PORT, () => {

      console.log(
        `Server running on port ${PORT}`
      );

    });

  })
  .catch(console.error);
