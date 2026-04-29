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
import { getSeoBlogMetaBySlug } from "./helper/seo/seoOnpageBlogHelper.js";
import { getSeoPageContentMetaService } from "./helper/seo/seoPageContentHelper.js";
import { findBusinessesByCategory } from "./helper/businessList/businessListHelper.js";
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
const formatDisplayDate = (value) => {
  if (!value) return "";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
const sanitizeHtmlFragment = (value = "") => String(value)
  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  .replace(/\son\w+="[^"]*"/gi, "")
  .replace(/\son\w+='[^']*'/gi, "");
const demoteH1Tags = (value = "") => String(value)
  .replace(/<h1(\s[^>]*)?>/gi, "<h2>")
  .replace(/<\/h1>/gi, "</h2>");
const buildBreadcrumbSchema = (items = []) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.item
  }))
});

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
  res.send(`User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=no
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Google-Extended
Disallow: /

Sitemap: https://massclick.in/sitemap.xml`);
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

// Static page slug → { pageType, fallback title, fallback description, fallback keywords }
const STATIC_PAGES = {
  aboutus:      { pageType: "about",        title: "About Us | Massclick",                    description: "Learn about Massclick - India's trusted local business search platform.",         keywords: "massclick, about us, local business platform" },
  testimonials: { pageType: "testimonial",  title: "Testimonials | Massclick",                description: "See what customers say about businesses listed on Massclick.",                    keywords: "massclick, testimonials, customer reviews" },
  feedbacks:    { pageType: "feedback",     title: "Feedback | Massclick",                    description: "Share your feedback and help us improve Massclick for everyone.",                  keywords: "massclick, feedback, user reviews" },
  customercare: { pageType: "customerCare", title: "Customer Care | Massclick",               description: "Contact Massclick customer support for help and assistance.",                      keywords: "massclick, customer care, support, help" },
  portfolio:    { pageType: "portfolio",    title: "Portfolio | Massclick",                   description: "Explore the portfolio and work samples at Massclick.",                             keywords: "massclick, portfolio, projects" },
  terms:        { pageType: "terms",        title: "Terms & Conditions | Massclick",          description: "Read the terms and conditions of using Massclick services.",                       keywords: "massclick, terms and conditions, usage policy" },
  privacy:      { pageType: "privacy",      title: "Privacy Policy | Massclick",              description: "Learn how Massclick protects your privacy and handles your personal data.",        keywords: "massclick, privacy policy, data protection" },
  refund:       { pageType: "refund",       title: "Refund Policy | Massclick",               description: "Understand Massclick's refund and cancellation policies.",                         keywords: "massclick, refund policy, cancellation" },
  enquiry:      { pageType: "enquiry",      title: "Contact Us | Massclick",                  description: "Get in touch with the Massclick team for any queries or support.",                 keywords: "massclick, contact, enquiry, support" },
  web:          { pageType: "web",          title: "Web Development Services | Massclick",    description: "Professional web development services to grow your business online.",              keywords: "massclick, web development, website design" },
  digital:      { pageType: "digital",      title: "Digital Marketing Services | Massclick",  description: "Result-driven digital marketing services for local businesses.",                   keywords: "massclick, digital marketing, online marketing, SEO" },
  graphic:      { pageType: "graphic",      title: "Graphic Design Services | Massclick",     description: "Creative graphic design services including logos, banners and branding.",          keywords: "massclick, graphic design, logo design, branding" },
  seo:          { pageType: "seo",          title: "SEO Services | Massclick",                description: "Improve your search engine rankings with Massclick's professional SEO services.",  keywords: "massclick, SEO services, search engine optimisation" },
};

// Routes that are client-only and should not have SSR meta overridden
const SKIP_SEO_ROUTES = new Set([
  "business", "dashboard", "admin", "write-review",
  "payment-status", "leads", "free-listing", "advertise",
  "user", "deleteaccount",
]);

app.get(/.*/, async (req, res) => {
  try {
    const indexPath = path.join(CLIENT_BUILD_PATH, "index.html");
    if (!fs.existsSync(indexPath)) {
      return res.status(404).send("Build not found");
    }

    let html = fs.readFileSync(indexPath, "utf8");
    const parts = req.path.split("/").filter(Boolean);

    const firstSegment  = parts[0] || "";
    const secondSegment = parts[1] || "";
    const thirdSegment  = parts[2] || "";

    let seo = null;
    let blogDoc = null;
    let categoryContent = null;
    let categoryBusinesses = [];
    let isCategoryPage = false;
    let isBlogPage = false;

    // Per-page fallback meta (used when DB has no record for this pageType)
    let fallbackTitle       = "Massclick - Local Business Search Platform";
    let fallbackDescription = "Find trusted local businesses, services, and professionals near you on Massclick.";
    let fallbackKeywords    = "massclick, local business search, business directory";

    if (!firstSegment) {
      // Home
      seo = await getSeoMeta({ pageType: "home" });
      fallbackTitle       = "Massclick - India's Leading Local Search Platform";
      fallbackDescription = "Find trusted local businesses, services, restaurants, hotels and professionals near you on Massclick.";
      fallbackKeywords    = "massclick, local search, business directory india";

    } else if (firstSegment === "blog" && secondSegment) {
      // Blog detail pages: /blog/:slug
      blogDoc = await getSeoBlogMetaBySlug(secondSegment);
      if (blogDoc) {
        seo = {
          title:       blogDoc.metaTitle,
          description: blogDoc.metaDescription,
          keywords:    blogDoc.metaKeywords,
          canonical:   `https://massclick.in/blog/${secondSegment}`,
        };
      }
      fallbackTitle       = "Massclick Blog - Local Business Guides & Tips";
      fallbackDescription = "Read expert guides, tips and local business information on the Massclick blog.";
      fallbackKeywords    = "massclick blog, local business tips, guides, how to";
      isBlogPage = true;

    } else if (STATIC_PAGES[firstSegment]) {
      // Static pages: /aboutus, /terms, /privacy, /web, /digital, etc.
      const pg = STATIC_PAGES[firstSegment];
      seo = await getSeoMeta({ pageType: pg.pageType });
      fallbackTitle       = pg.title;
      fallbackDescription = pg.description;
      fallbackKeywords    = pg.keywords;

    } else if (!SKIP_SEO_ROUTES.has(firstSegment) && secondSegment) {
      // Category/search pages: /:location/:category or /:location/:category/:subcategory
      seo = await getSeoMeta({
        pageType: "category",
        location: toText(firstSegment),
        category: toText(thirdSegment || secondSegment)
      });
      categoryContent = await getSeoPageContentMetaService({
        pageType: "category",
        location: toText(firstSegment),
        category: toText(thirdSegment || secondSegment)
      });
      categoryBusinesses = await findBusinessesByCategory(
        toText(thirdSegment || secondSegment),
        toText(firstSegment)
      );
      isCategoryPage = true;
    }
    // SKIP_SEO_ROUTES → seo stays null, page uses its own client-side meta

    const locationName = isCategoryPage ? toTitle(toText(firstSegment || "trichy")) : "";
    const categoryName = isCategoryPage ? toTitle(toText(thirdSegment || secondSegment || "Local Services")) : "";

    const title = escapeHtml(
      seo?.title ||
      (isCategoryPage ? `${categoryName} in ${locationName} | Massclick` : fallbackTitle)
    );
    const description = escapeHtml(
      seo?.description ||
      (isCategoryPage ? `Find the best ${categoryName} in ${locationName}. Verified listings, reviews, phone numbers, address and more on Massclick.` : fallbackDescription)
    );
    const keywords = escapeHtml(
      seo?.keywords ||
      (isCategoryPage ? `${categoryName}, ${locationName}, best ${categoryName} in ${locationName}` : fallbackKeywords)
    );
    const canonical = escapeHtml(seo?.canonical || `https://massclick.in${req.path}`);

    const h1 = isBlogPage
      ? (blogDoc?.heading || seo?.title || fallbackTitle)
      : isCategoryPage
        ? `${categoryName} in ${locationName}`
        : (seo?.title || fallbackTitle);

    const breadcrumbItems = isBlogPage
      ? [
        { name: "Home", item: "https://massclick.in/" },
        { name: "Blog", item: "https://massclick.in/blog" },
        { name: blogDoc?.heading || h1, item: canonical }
      ]
      : isCategoryPage
        ? [
          { name: "Home", item: "https://massclick.in/" },
          { name: locationName, item: `https://massclick.in/${firstSegment}` },
          { name: categoryName, item: canonical }
        ]
        : [
          { name: "Home", item: canonical }
        ];

    const basePublisher = {
      "@type": "Organization",
      name: "Massclick",
      url: "https://massclick.in"
    };

    const schemaObjects = [];

    if (!firstSegment) {
      schemaObjects.push(
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Massclick",
          url: "https://massclick.in",
          logo: "https://massclick.in/mi.png"
        },
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Massclick",
          url: "https://massclick.in/",
          publisher: basePublisher
        }
      );
    } else if (isBlogPage) {
      schemaObjects.push({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: blogDoc?.heading || h1,
        description,
        mainEntityOfPage: canonical,
        url: canonical,
        datePublished: blogDoc?.createdAt || undefined,
        dateModified: blogDoc?.updatedAt || blogDoc?.createdAt || undefined,
        author: {
          "@type": "Person",
          name: blogDoc?.author || "Massclick"
        },
        publisher: basePublisher
      });

      if (Array.isArray(blogDoc?.faq) && blogDoc.faq.length > 0) {
        schemaObjects.push({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: blogDoc.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer
            }
          }))
        });
      }
    } else if (isCategoryPage) {
      schemaObjects.push({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: h1,
        url: canonical,
        description,
        publisher: basePublisher
      });

      if (Array.isArray(categoryBusinesses) && categoryBusinesses.length > 0) {
        schemaObjects.push({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Best ${categoryName} in ${locationName}`,
          itemListElement: categoryBusinesses.slice(0, 10).map((business, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `https://massclick.in/business/${String(business.location || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")}/${String(business.businessName || "business").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")}/${business._id}`,
            item: {
              "@type": "LocalBusiness",
              name: business.businessName,
              address: business.street || business.location,
              telephone: business.contact || undefined,
              areaServed: business.location || locationName
            }
          }))
        });

        schemaObjects.push({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: `${categoryName} in ${locationName}`,
          areaServed: {
            "@type": "City",
            name: locationName
          },
          provider: basePublisher
        });
      }
    } else {
      schemaObjects.push({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: h1,
        url: canonical,
        description,
        publisher: basePublisher
      });
    }

    schemaObjects.push(buildBreadcrumbSchema(breadcrumbItems));

    const categoryIntroHtml = categoryContent
      ? `
        ${categoryContent.headerContent ? `<section>${sanitizeHtmlFragment(demoteH1Tags(categoryContent.headerContent))}</section>` : ""}
        ${categoryContent.pageContent ? `<article>${sanitizeHtmlFragment(demoteH1Tags(categoryContent.pageContent))}</article>` : ""}
      `
      : "";

    const blogFaqHtml = Array.isArray(blogDoc?.faq) && blogDoc.faq.length > 0
      ? `
        <section>
          <h2>Frequently Asked Questions</h2>
          ${blogDoc.faq.map((item) => `
            <div>
              <h3>${escapeHtml(item.question)}</h3>
              <p>${escapeHtml(item.answer)}</p>
            </div>
          `).join("")}
        </section>
      `
      : "";

    const blogContentHtml = blogDoc?.pageContent
      ? sanitizeHtmlFragment(demoteH1Tags(blogDoc.pageContent))
      : "";

    const serverContent = isBlogPage
      ? `
        <section style="padding:20px;font-family:Arial,sans-serif">
          <nav aria-label="Breadcrumb" style="margin-bottom:12px">
            <a href="https://massclick.in/">Home</a> &gt;
            <a href="https://massclick.in/blog"> Blog</a> &gt;
            <span>${escapeHtml(blogDoc?.heading || h1)}</span>
          </nav>
          <h1>${escapeHtml(blogDoc?.heading || h1)}</h1>
          <p>${description}</p>
          <div style="margin-bottom:16px;color:#555">
            ${blogDoc?.createdAt ? `<span>Published ${escapeHtml(formatDisplayDate(blogDoc.createdAt))}</span>` : ""}
            ${blogDoc?.updatedAt ? `<span style="margin-left:12px">Updated ${escapeHtml(formatDisplayDate(blogDoc.updatedAt))}</span>` : ""}
          </div>
          ${blogContentHtml}
          ${blogFaqHtml}
        </section>
      `
      : isCategoryPage
      ? `
        <section style="padding:20px;font-family:Arial,sans-serif">
          <nav aria-label="Breadcrumb" style="margin-bottom:12px">
            <a href="https://massclick.in/">Home</a> &gt;
            <a href="https://massclick.in/${firstSegment}"> ${escapeHtml(locationName)}</a> &gt;
            <span>${escapeHtml(categoryName)}</span>
          </nav>
          <h1>${escapeHtml(h1)}</h1>
          <p>${description}</p>
          <div>
            <h2>Top ${escapeHtml(categoryName)}</h2>
            <p>Explore verified businesses, ratings, contact details and addresses in ${escapeHtml(locationName)}.</p>
          </div>
          ${categoryIntroHtml}
        </section>
      `
      : `
        <section style="padding:20px;font-family:Arial,sans-serif">
          <h1>${escapeHtml(h1)}</h1>
          <p>${description}</p>
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
        if (nameVal === "twitter:card") return setContent("summary_large_image");
        if (nameVal === "twitter:title") return setContent(title);
        if (nameVal === "twitter:description") return setContent(description);
        if (propVal === "og:title") return setContent(title);
        if (propVal === "og:description") return setContent(description);
        if (propVal === "og:url") return setContent(canonical);
        if (propVal === "og:type") return setContent(isBlogPage ? "article" : "website");
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
    const schemaScripts = schemaObjects
      .map((schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`)
      .join("");
    html = html
      .replace("</head>", `<script>window.__SSR_SEO__=${ssrSeoJson}</script>${schemaScripts}</head>`)
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
