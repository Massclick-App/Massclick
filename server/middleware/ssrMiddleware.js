import path from "path";
import fs from "fs";
import { getSeoMeta } from "../helper/seo/seoHelper.js";
import { getSeoBlogMetaBySlug } from "../helper/seo/seoOnpageBlogHelper.js";
import { getSeoPageContentMetaService } from "../helper/seo/seoPageContentHelper.js";
import { findBusinessesByCategory } from "../helper/businessList/businessListHelper.js";
import { appendDiscoveryLinkHeaders } from "../config/apiCatalog.js";
import { STATIC_PAGES, SKIP_SEO_ROUTES } from "../config/ssrConfig.js";
import {
  escapeHtml,
  slugToText,
  titleCase,
  formatDisplayDate,
  sanitizeHtmlFragment,
  demoteH1Tags,
  buildBreadcrumbSchema,
} from "../utils/htmlUtils.js";

const CLIENT_BUILD_PATH = process.env.REACT_BUILD_PATH;

export async function ssrMiddleware(req, res) {
  try {
    const indexPath = path.join(CLIENT_BUILD_PATH, "index.html");
    if (!fs.existsSync(indexPath)) {
      return res.status(404).send("Build not found");
    }

    let html = fs.readFileSync(indexPath, "utf8");
    const parts = req.path.split("/").filter(Boolean);

    const firstSegment = parts[0] || "";
    const secondSegment = parts[1] || "";
    const thirdSegment = parts[2] || "";

    let seo = null;
    let blogDoc = null;
    let categoryContent = null;
    let categoryBusinesses = [];
    let isCategoryPage = false;
    let isBlogPage = false;

    let fallbackTitle = "Massclick - Local Business Search Platform";
    let fallbackDescription = "Find trusted local businesses, services, and professionals near you on Massclick.";
    let fallbackKeywords = "massclick, local business search, business directory";

    if (!firstSegment) {
      seo = await getSeoMeta({ pageType: "home" });
      fallbackTitle = "Massclick - India's Leading Local Search Platform";
      fallbackDescription = "Find trusted local businesses, services, restaurants, hotels and professionals near you on Massclick.";
      fallbackKeywords = "massclick, local search, business directory india";

    } else if (firstSegment === "blog" && secondSegment) {
      blogDoc = await getSeoBlogMetaBySlug(secondSegment);
      if (blogDoc) {
        seo = {
          title: blogDoc.metaTitle,
          description: blogDoc.metaDescription,
          keywords: blogDoc.metaKeywords,
          canonical: `https://massclick.in/blog/${secondSegment}`,
        };
      }
      fallbackTitle = "Massclick Blog - Local Business Guides & Tips";
      fallbackDescription = "Read expert guides, tips and local business information on the Massclick blog.";
      fallbackKeywords = "massclick blog, local business tips, guides, how to";
      isBlogPage = true;

    } else if (STATIC_PAGES[firstSegment]) {
      const pg = STATIC_PAGES[firstSegment];
      seo = await getSeoMeta({ pageType: pg.pageType });
      fallbackTitle = pg.title;
      fallbackDescription = pg.description;
      fallbackKeywords = pg.keywords;

    } else if (!SKIP_SEO_ROUTES.has(firstSegment) && secondSegment) {
      seo = await getSeoMeta({
        pageType: "category",
        location: slugToText(firstSegment),
        category: slugToText(thirdSegment || secondSegment)
      });
      categoryContent = await getSeoPageContentMetaService({
        pageType: "category",
        location: slugToText(firstSegment),
        category: slugToText(thirdSegment || secondSegment)
      });
      categoryBusinesses = await findBusinessesByCategory(
        slugToText(thirdSegment || secondSegment),
        slugToText(firstSegment)
      );
      isCategoryPage = true;
    }

    const locationName = isCategoryPage ? titleCase(slugToText(firstSegment || "trichy")) : "";
    const categoryName = isCategoryPage ? titleCase(slugToText(thirdSegment || secondSegment || "Local Services")) : "";

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
            acceptedAnswer: { "@type": "Answer", text: item.answer }
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
          areaServed: { "@type": "City", name: locationName },
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

    const ssrSeoJson = JSON.stringify({ title, description, keywords, canonical, robots: "index, follow" })
      .replace(/<\//g, "<\\/");
    const schemaScripts = schemaObjects
      .map((schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`)
      .join("");
    html = html
      .replace("</head>", `<script>window.__SSR_SEO__=${ssrSeoJson}</script>${schemaScripts}</head>`)
      .replace('<div id="root"></div>', `<div id="root">${serverContent}</div>`);

    if (!firstSegment) {
      appendDiscoveryLinkHeaders(res);
    }

    const acceptsMarkdown = (req.headers["accept"] || "").includes("text/markdown");
    if (acceptsMarkdown) {
      const mdLines = [];

      mdLines.push(`_${breadcrumbItems.map((b) => b.name).join(" > ")}_`, "");
      mdLines.push(`# ${h1}`, "", description, "");

      if (isBlogPage && blogDoc) {
        if (blogDoc.createdAt) {
          const dateParts = [`Published: ${formatDisplayDate(blogDoc.createdAt)}`];
          if (blogDoc.updatedAt) dateParts.push(`Updated: ${formatDisplayDate(blogDoc.updatedAt)}`);
          mdLines.push(dateParts.join(" · "), "");
        }
        if (blogDoc.pageContent) {
          const plainContent = blogDoc.pageContent
            .replace(/<h[1-6][^>]*>/gi, "\n\n## ").replace(/<\/h[1-6]>/gi, "\n\n")
            .replace(/<p[^>]*>/gi, "\n").replace(/<\/p>/gi, "\n")
            .replace(/<li[^>]*>/gi, "\n- ").replace(/<\/li>/gi, "")
            .replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .replace(/\n{3,}/g, "\n\n").trim();
          mdLines.push(plainContent, "");
        }
        if (Array.isArray(blogDoc.faq) && blogDoc.faq.length > 0) {
          mdLines.push("## Frequently Asked Questions", "");
          for (const item of blogDoc.faq) {
            mdLines.push(`### ${item.question}`, "", item.answer, "");
          }
        }
      } else if (isCategoryPage) {
        if (categoryContent?.headerContent) {
          const plain = categoryContent.headerContent
            .replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
          if (plain) mdLines.push(plain, "");
        }
        if (Array.isArray(categoryBusinesses) && categoryBusinesses.length > 0) {
          mdLines.push(`## Top ${categoryName} in ${locationName}`, "");
          categoryBusinesses.slice(0, 10).forEach((biz, i) => {
            const bizSlug = `${String(biz.location || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")}/${String(biz.businessName || "business").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")}/${biz._id}`;
            mdLines.push(`${i + 1}. **[${biz.businessName}](https://massclick.in/business/${bizSlug})**`);
            if (biz.street || biz.location) mdLines.push(`   - Address: ${biz.street || biz.location}`);
            if (biz.contact) mdLines.push(`   - Phone: ${biz.contact}`);
            mdLines.push("");
          });
        }
        if (categoryContent?.pageContent) {
          const plain = categoryContent.pageContent
            .replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
          if (plain) mdLines.push(plain, "");
        }
      }

      mdLines.push("---", `Source: ${canonical}`);

      const md = mdLines.join("\n");
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("x-markdown-tokens", String(Math.ceil(md.length / 4)));
      res.setHeader("X-Robots-Tag", "index, follow");
      return res.status(200).send(md);
    }

    res.setHeader("X-Robots-Tag", "index, follow");
    return res.status(200).send(html);
  } catch (error) {
    console.error("SSR Error:", error);
    return res.status(500).send("Server Error");
  }
}
