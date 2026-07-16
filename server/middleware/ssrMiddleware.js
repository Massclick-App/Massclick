import path from "path";
import fs from "fs";
import { getSeoMeta } from "../helper/seo/seoHelper.js";
import { getSeoBlogMetaBySlug } from "../helper/seo/seoOnpageBlogHelper.js";
import { getSeoPageContentMetaService } from "../helper/seo/seoPageContentHelper.js";
import { findBusinessesByCategory } from "../helper/businessList/businessListHelper.js";
import { appendDiscoveryLinkHeaders } from "../config/apiCatalog.js";
import { STATIC_PAGES, SKIP_SEO_ROUTES } from "../config/ssrConfig.js";
import { getCache, setCache } from "../utils/redisClient.js";
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

// Cache TTLs (in seconds)
const CACHE_TTL = {
  SEO_META: 3600,          // 1 hour
  BLOG: 14400,             // 4 hours
  PAGE_CONTENT: 7200,      // 2 hours
  BUSINESSES: 1800,        // 30 minutes
  STATIC_PAGE: 3600,       // 1 hour
};

const isSafeFaqUrl = (url = "") =>
  /^(https?:\/\/|\/(?!\/)|mailto:|tel:)/i.test(String(url).trim());

const renderFaqAnswerHtmlWithLinks = (answer = "", links = []) => {
  if (!answer) return "";

  const validLinks = (links || [])
    .filter((link) => link?.linkText && link?.url && isSafeFaqUrl(link.url))
    .sort((a, b) => b.linkText.length - a.linkText.length);

  if (validLinks.length === 0) {
    return escapeHtml(answer);
  }

  let segments = [answer];

  validLinks.forEach((link) => {
    const escapedText = link.linkText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b(${escapedText})\\b`, "gi");
    const nextSegments = [];

    segments.forEach((segment) => {
      if (typeof segment !== "string") {
        nextSegments.push(segment);
        return;
      }

      const parts = segment.split(pattern);
      parts.forEach((part, partIndex) => {
        if (!part) return;

        if (partIndex % 2 === 1) {
          nextSegments.push(
            `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(part)}</a>`
          );
          return;
        }

        nextSegments.push(escapeHtml(part));
      });
    });

    segments = nextSegments;
  });

  return segments.join("");
};

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
      // Home page - cache SEO metadata
      const cacheKey = "seo:home";
      seo = await getCache(cacheKey) || await getSeoMeta({ pageType: "home" });
      if (seo && !await getCache(cacheKey)) {
        await setCache(cacheKey, seo, CACHE_TTL.SEO_META);
      }
      fallbackTitle = "Massclick - India's Leading Local Search Platform";
      fallbackDescription = "Find trusted local businesses, services, restaurants, hotels and professionals near you on Massclick.";
      fallbackKeywords = "massclick, local search, business directory india";

    } else if (firstSegment === "blog" && secondSegment) {
      // Blog page - cache blog metadata
      const cacheKey = `blog:${secondSegment}`;
      blogDoc = await getCache(cacheKey) || await getSeoBlogMetaBySlug(secondSegment);
      if (blogDoc && !await getCache(cacheKey)) {
        await setCache(cacheKey, blogDoc, CACHE_TTL.BLOG);
      }
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
      const cacheKey = `seo:static:${firstSegment}`;
      seo = await getCache(cacheKey) || await getSeoMeta({ pageType: pg.pageType });
      if (seo && !await getCache(cacheKey)) {
        await setCache(cacheKey, seo, CACHE_TTL.STATIC_PAGE);
      }
      fallbackTitle = pg.title;
      fallbackDescription = pg.description;
      fallbackKeywords = pg.keywords;

    } else if (!SKIP_SEO_ROUTES.has(firstSegment) && secondSegment) {
      const location = slugToText(firstSegment);
      const category = slugToText(thirdSegment || secondSegment);
      const cacheKeyPrefix = `category:${location}:${category}`;

      // Parallel cache lookups for better performance
      const [cachedSeo, cachedContent, cachedBusinesses] = await Promise.all([
        getCache(`${cacheKeyPrefix}:seo`),
        getCache(`${cacheKeyPrefix}:content`),
        getCache(`${cacheKeyPrefix}:businesses`)
      ]);

      // Use cached data or fetch from database
      seo = cachedSeo || await getSeoMeta({
        pageType: "category",
        location: location,
        category: category
      });

      categoryContent = cachedContent || await getSeoPageContentMetaService({
        pageType: "category",
        location: location,
        category: category
      });

      categoryBusinesses = cachedBusinesses || await findBusinessesByCategory(
        category,
        location
      );

      // Set cache for fetched data
      if (seo && !cachedSeo) {
        await setCache(`${cacheKeyPrefix}:seo`, seo, CACHE_TTL.SEO_META);
      }
      if (categoryContent && !cachedContent) {
        await setCache(`${cacheKeyPrefix}:content`, categoryContent, CACHE_TTL.PAGE_CONTENT);
      }
      if (categoryBusinesses && !cachedBusinesses) {
        await setCache(`${cacheKeyPrefix}:businesses`, categoryBusinesses, CACHE_TTL.BUSINESSES);
      }
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
          "@id": "https://massclick.in/#organization",
          name: "Massclick",
          url: "https://massclick.in",
          logo: "https://massclick.in/apple-touch-icon.png",
          foundingDate: "2018",
          address: {
            "@type": "PostalAddress",
            streetAddress: "SLK Complex, 166/9, Rani Mangammal Saalai, Renga Nagar, Krishna Moorthy Nagar, K K Nagar",
            addressLocality: "Tiruchirappalli",
            addressRegion: "Tamil Nadu",
            postalCode: "620021",
            addressCountry: "IN",
          },
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+919789104201",
            contactType: "Customer Service",
            email: "support@massclick.in",
            areaServed: "IN",
            availableLanguage: ["English", "Tamil"],
          },
          sameAs: [
            "https://www.instagram.com/massclick.in",
            "https://www.facebook.com/massClicks",
            "https://www.linkedin.com/company/massclick/",
            "https://www.youtube.com/@Mass360Business",
          ],
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
        author: blogDoc?.authorMeta
          ? {
              "@type": "Person",
              name: blogDoc.authorMeta.name || blogDoc.author || "Massclick",
              ...(blogDoc.authorMeta.slug && { url: `https://massclick.in/author/${blogDoc.authorMeta.slug}` }),
              ...(blogDoc.authorMeta.title && { jobTitle: blogDoc.authorMeta.title }),
              ...(blogDoc.authorMeta.shortBio && { description: blogDoc.authorMeta.shortBio }),
              ...(blogDoc.authorMeta.expertCategory && { knowsAbout: blogDoc.authorMeta.expertCategory }),
              ...(blogDoc.authorMeta.linkedin && { sameAs: [blogDoc.authorMeta.linkedin] }),
            }
          : {
              "@type": "Person",
              name: blogDoc?.author || "Massclick",
            },
        publisher: basePublisher,
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: ["h1"],
        },
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
        publisher: basePublisher,
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: ["h1", ".top-businesses"],
        },
      });

      if (Array.isArray(categoryContent?.faq) && categoryContent.faq.length > 0) {
        schemaObjects.push({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: categoryContent.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        });
      }

      if (Array.isArray(categoryBusinesses) && categoryBusinesses.length > 0) {
        schemaObjects.push({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: h1,
          description,
          numberOfItems: Math.min(categoryBusinesses.length, 10),
          itemListElement: categoryBusinesses.slice(0, 10).map((biz, i) => {
            const bizLocationSlug = String(biz.location || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
            const bizNameSlug = String(biz.businessName || "business").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
            const bizUrl = `https://massclick.in/business/${bizLocationSlug}/${bizNameSlug}/${biz._id}`;
            const itemObj = {
              "@type": "LocalBusiness",
              name: biz.businessName,
              url: bizUrl,
            };
            if (biz.bannerImage) itemObj.image = biz.bannerImage;
            if (biz.street || biz.location) {
              itemObj.address = {
                "@type": "PostalAddress",
                streetAddress: biz.street || "",
                addressLocality: biz.location || "",
                ...(biz.pincode && { postalCode: biz.pincode }),
                addressCountry: "IN",
              };
            }
            if (biz.contact) itemObj.telephone = String(biz.contact);
            if (biz.averageRating && Number(biz.totalReviews) > 0) {
              itemObj.aggregateRating = {
                "@type": "AggregateRating",
                ratingValue: Math.round(Number(biz.averageRating) * 10) / 10,
                reviewCount: Number(biz.totalReviews),
                bestRating: 5,
                worstRating: 1,
              };
            }
            return { "@type": "ListItem", position: i + 1, item: itemObj };
          }),
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

    const categoryFaqHtml = Array.isArray(categoryContent?.faq) && categoryContent.faq.length > 0
      ? `
        <section>
          <h2>Frequently Asked Questions</h2>
          ${categoryContent.faq.map((item) => `
            <div>
              <h3>${escapeHtml(item.question)}</h3>
              <p>${renderFaqAnswerHtmlWithLinks(item.answer, item.links)}</p>
            </div>
          `).join("")}
        </section>
      `
      : "";

    const blogFaqHtml = Array.isArray(blogDoc?.faq) && blogDoc.faq.length > 0
      ? `
        <section>
          <h2>Frequently Asked Questions</h2>
          ${blogDoc.faq.map((item) => `
            <div>
              <h3>${escapeHtml(item.question)}</h3>
              <p>${renderFaqAnswerHtmlWithLinks(item.answer, item.links)}</p>
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
          ${blogDoc?.quickSummary ? `<div class="quick-answer"><strong>Quick Answer:</strong> ${escapeHtml(blogDoc.quickSummary)}</div>` : ""}
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
          ${categoryIntroHtml}
          ${categoryFaqHtml}
          ${Array.isArray(categoryBusinesses) && categoryBusinesses.length > 0 ? `
          <section class="top-businesses">
            <h2>Top ${escapeHtml(categoryName)} in ${escapeHtml(locationName)}</h2>
            <ul style="list-style:none;padding:0;margin:0">
              ${categoryBusinesses.slice(0, 10).map((biz) => {
                const bizLocationSlug = String(biz.location || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
                const bizNameSlug = String(biz.businessName || "business").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
                const bizUrl = `/business/${bizLocationSlug}/${bizNameSlug}/${biz._id}`;
                const address = [biz.street, biz.location].filter(Boolean).join(", ");
                const rating = biz.averageRating ? `&#9733; ${Number(biz.averageRating).toFixed(1)}` : "";
                return `<li style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #eee">
                  <h3 style="margin:0 0 4px"><a href="${escapeHtml(bizUrl)}" style="color:inherit;text-decoration:none">${escapeHtml(biz.businessName || "")}</a></h3>
                  ${address ? `<p style="margin:2px 0;font-size:14px;color:#555">${escapeHtml(address)}</p>` : ""}
                  ${biz.contact ? `<p style="margin:2px 0;font-size:14px">Tel: ${escapeHtml(String(biz.contact))}</p>` : ""}
                  ${rating ? `<p style="margin:2px 0;font-size:13px;color:#b45309">${rating}</p>` : ""}
                </li>`;
              }).join("")}
            </ul>
          </section>` : ""}
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

    const skeletonHtml = `
      <div class="ssr-skeleton" aria-hidden="true">
        <div class="ssr-skeleton-bar shimmer" style="width:40%;height:28px;margin-bottom:16px;"></div>
        <div class="ssr-skeleton-bar shimmer" style="width:90%;height:14px;margin-bottom:10px;"></div>
        <div class="ssr-skeleton-bar shimmer" style="width:75%;height:14px;margin-bottom:24px;"></div>
        <div class="ssr-skeleton-bar shimmer" style="width:100%;height:120px;"></div>
      </div>
    `;

    html = html
      .replace("</head>", `<script>window.__SSR_SEO__=${ssrSeoJson}</script>${schemaScripts}</head>`)
      .replace('<div id="root"></div>', `<div id="root">${skeletonHtml}<div class="ssr-seo-content">${serverContent}</div></div>`);

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
            if (Array.isArray(item.links) && item.links.length > 0) {
              const linkLines = item.links
                .filter((link) => link?.linkText && link?.url && isSafeFaqUrl(link.url))
                .map((link) => `- [${link.linkText}](${link.url})`);
              if (linkLines.length > 0) {
                mdLines.push(...linkLines, "");
              }
            }
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
        if (Array.isArray(categoryContent?.faq) && categoryContent.faq.length > 0) {
          mdLines.push("## Frequently Asked Questions", "");
          for (const item of categoryContent.faq) {
            mdLines.push(`### ${item.question}`, "", item.answer, "");
            if (Array.isArray(item.links) && item.links.length > 0) {
              const linkLines = item.links
                .filter((link) => link?.linkText && link?.url && isSafeFaqUrl(link.url))
                .map((link) => `- [${link.linkText}](${link.url})`);
              if (linkLines.length > 0) {
                mdLines.push(...linkLines, "");
              }
            }
          }
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
    res.setHeader("Link", `<${canonical}>; rel="alternate"; type="text/markdown"`);
    return res.status(200).send(html);
  } catch (error) {
    console.error("SSR Error:", error);
    return res.status(500).send("Server Error");
  }
}
