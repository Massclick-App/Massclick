import path from "path";
import fs from "fs";
import { getSeoMeta } from "../helper/seo/seoHelper.js";
import {
  ORGANIZATION_REF,
  WEBSITE_REF,
  buildOrganizationSchema,
  buildWebsiteSchema,
} from "../helper/seo/organizationSchema.js";
import { getSeoBlogMetaBySlug } from "../helper/seo/seoOnpageBlogHelper.js";
import { getSeoPageContentMetaService } from "../helper/seo/seoPageContentHelper.js";
import { findBusinessesByCategory } from "../helper/businessList/businessListHelper.js";
import {
  getBusinessUrlSlug,
  buildBusinessPath as buildCanonicalBusinessPath,
} from "../helper/businessList/businessUrl.js";
import { appendDiscoveryLinkHeaders } from "../config/apiCatalog.js";
import { STATIC_PAGES, SKIP_SEO_ROUTES } from "../config/ssrConfig.js";
import { isServableUrlSegment } from "../utils/urlSegment.js";
import { getCache, setCache } from "../utils/redisClient.js";
import { slugify } from "../slugify.js";
import { classifyMiddleSegment } from "../helper/location/urlSegmentClassifier.js";
import { resolveDistrictBySlug } from "../helper/location/locationResolver.js";
import {
  getDistrictDisplayName,
  getDistrictUrlSlug,
  getLocationDisplayName,
  getLocationUrlPath,
} from "../helper/location/locationSlug.js";
import {
  buildCanonicalLocationCategoryPath,
  buildLocationCategoryPath,
  buildLocationPath,
} from "../helper/location/locationUrl.js";
import {
  escapeHtml,
  slugToText,
  titleCase,
  formatDisplayDate,
  sanitizeHtmlFragment,
  demoteH1Tags,
} from "../utils/htmlUtils.js";
import {
  getHomeRoutePreloadTags,
  renderHomeRouteShell,
} from "../utils/homeRouteShell.mjs";
import {
  buildBlogCrumbs,
  buildCrumbs,
  crumbsToJsonLd,
} from "../helper/seo/breadcrumbBuilder.js";

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

const buildCategoryPath = ({
  districtDoc = null,
  districtSlug = "",
  locationSlug = "",
  locationPath = "",
  locationDoc = null,
  categorySlug = "",
  subcategorySlug = "",
} = {}) => {
  if (districtSlug || districtDoc) {
    if (!categorySlug && !subcategorySlug) {
      return buildLocationPath({ districtDoc, districtSlug, locationDoc });
    }
    return buildLocationCategoryPath({
      districtDoc,
      districtSlug,
      locationDoc,
      locationPath,
      locationSlug,
      categorySlug,
      subcategorySlug,
    });
  }

  // slugify() each segment rather than echoing the raw URL text back out. This
  // is the legacy (no-district) shape, and it is what fed the crawl loop: a raw
  // "%20" arriving in the path was emitted verbatim into this page's own
  // canonical, then re-slugified into "-20" by the next hop. Canonicalising here
  // makes the emitted URL a fixed point — the same input can no longer produce a
  // longer output on each round-trip.
  const segments = [slugify(locationSlug), slugify(subcategorySlug || categorySlug)];
  return `/${segments.filter(Boolean).join("/")}`;
};

const buildTemplateLocation = ({ locationName = "", districtName = "", hasSpecificLocation = false } = {}) => {
  const locationLabel = String(locationName || "").trim();
  const districtLabel = String(districtName || "").trim();
  if (!locationLabel) return districtLabel;
  if (!hasSpecificLocation || !districtLabel) return locationLabel;
  if (slugify(locationLabel) === slugify(districtLabel)) return locationLabel;
  return `${locationLabel}, ${districtLabel}`;
};

// districtSlug here comes from getDistrictUrlSlug (alias-aware), so these
// links are already in the canonical form the redirect middleware expects.
// Falls back to the pre-Phase-B shape when the business has no publicId yet,
// which is the only shape that can still be resolved in that state.
const buildBusinessPath = ({ districtSlug = "", business = {} } = {}) => {
  const canonical = buildCanonicalBusinessPath({ districtSlug, business });
  if (canonical) return canonical;

  const locationSlug = slugify(business.location || "business");
  const businessSlug = getBusinessUrlSlug(business);
  const segments = districtSlug
    ? ["business", districtSlug, locationSlug, businessSlug, business._id]
    : ["business", locationSlug, businessSlug, business._id];
  return `/${segments.filter(Boolean).join("/")}`;
};

export const resolveCategoryRouteContext = async (parts = []) => {
  const [firstSegment, secondSegment, thirdSegment, fourthSegment] = parts;
  if (!firstSegment || !secondSegment) return null;

  const districtDoc = await resolveDistrictBySlug(firstSegment).catch(() => null);

  if (districtDoc) {
    const districtSlug = getDistrictUrlSlug(districtDoc);
    const districtName = getDistrictDisplayName(districtDoc);
    let locationDoc = null;
    let locationSlug = "";
    let locationPath = "";
    let categorySlug = "";
    let subcategorySlug = "";
    let isLocationLanding = false;

    const classification = await classifyMiddleSegment({
      districtDoc,
      p2: secondSegment,
      p3: thirdSegment,
      p4: fourthSegment,
    }).catch(() => ({ type: "unknown" }));

    if (classification.type === "location") {
      locationDoc = classification.locationDoc;
      locationSlug = locationDoc?.publicLocationSlug || "";
      locationPath = locationDoc ? getLocationUrlPath(locationDoc) : "";
      categorySlug = classification.categorySlug || "";
    } else if (classification.type === "locationLanding") {
      locationDoc = classification.locationDoc;
      locationSlug = locationDoc?.publicLocationSlug || "";
      locationPath = locationDoc ? getLocationUrlPath(locationDoc) : "";
      isLocationLanding = true;
    } else if (classification.type === "districtCategory") {
      categorySlug = classification.subcategorySlug || classification.categorySlug || secondSegment;
      subcategorySlug = "";
    } else if (classification.type === "unresolvedLocation") {
      categorySlug = classification.categorySlug;
      subcategorySlug = "";
    } else {
      categorySlug = secondSegment;
      subcategorySlug = "";
    }

    const searchCategorySlug = subcategorySlug || categorySlug;
    if (!searchCategorySlug && !isLocationLanding) return null;

    const locationName = locationDoc
      ? getLocationDisplayName(locationDoc, districtName) || slugToText(locationDoc.publicLocationSlug || "")
      : locationSlug
        ? titleCase(slugToText(locationSlug))
        : districtName;

    const canonicalPath = (!isLocationLanding
      ? await buildCanonicalLocationCategoryPath({
          districtDoc,
          districtSlug,
          locationDoc,
          locationSlug,
          locationPath,
          categorySlug,
          subcategorySlug,
        })
      : buildCategoryPath({
          districtDoc,
          districtSlug,
          locationDoc,
          locationSlug,
          locationPath,
          categorySlug,
          subcategorySlug,
        })) || (isLocationLanding
      ? buildLocationPath({ districtDoc, districtSlug, locationDoc })
      : "/");

    const routeContextCacheKey = [
      "district",
      districtSlug,
      locationPath || locationSlug || "all",
      isLocationLanding ? "landing" : categorySlug,
      subcategorySlug,
    ].filter(Boolean).join(":");

    return {
      districtDoc,
      districtSlug,
      districtName,
      locationDoc,
      locationSlug,
      locationPath,
      locationName,
      categorySlug,
      subcategorySlug,
      searchCategorySlug,
      categoryName: titleCase(slugToText(searchCategorySlug)),
      categoryText: slugToText(searchCategorySlug),
      isLocationLanding,
      canonicalPath,
      canonicalUrl: `https://massclick.in${canonicalPath}`,
      cacheKey: routeContextCacheKey,
      businessLocationContext: {
        districtSlug,
        ...(locationSlug ? { locationSlug } : {}),
      },
    };
  }

  const locationSlug = firstSegment;
  const categorySlug = secondSegment;
  const subcategorySlug = thirdSegment || "";
  const searchCategorySlug = subcategorySlug || categorySlug;
  const locationName = titleCase(slugToText(locationSlug));
  const canonicalPath = buildCategoryPath({
    locationSlug,
    categorySlug,
    subcategorySlug,
  });

  return {
    districtDoc: null,
    districtSlug: "",
    districtName: "",
    locationDoc: null,
    locationSlug,
    locationName,
    categorySlug,
    subcategorySlug,
    searchCategorySlug,
    categoryName: titleCase(slugToText(searchCategorySlug)),
    categoryText: slugToText(searchCategorySlug),
    canonicalPath,
    canonicalUrl: `https://massclick.in${canonicalPath}`,
    cacheKey: `${slugToText(locationSlug)}:${slugToText(searchCategorySlug)}`,
    businessLocationContext: { locationText: locationName },
  };
};

const buildCategoryBreadcrumbCrumbs = (route) => {
  if (!route) return [];

  if (route.districtDoc) {
    const crumbs = buildCrumbs({
      districtDoc: route.districtDoc,
      locationDoc: route.locationDoc,
      category: route.categorySlug
        ? {
            name: route.subcategorySlug
              ? titleCase(slugToText(route.categorySlug))
              : route.categoryName,
            slug: route.categorySlug,
          }
        : null,
      subcategory: route.subcategorySlug
        ? {
            name: route.categoryName,
            slug: route.subcategorySlug,
          }
        : null,
    });
    return crumbs;
  }

  return [
    { name: "Home", path: "/" },
    // slugify() the emitted href for the same reason as buildCategoryPath above:
    // this breadcrumb is a real crawlable <a>, so echoing the raw segment here is
    // what handed Googlebot the next, longer URL in the loop.
    ...(route.locationSlug
      ? [{ name: route.locationName, path: `/${slugify(route.locationSlug)}` }]
      : []),
    ...(route.subcategorySlug && route.categorySlug
      ? [{
          name: titleCase(slugToText(route.categorySlug)),
          path: buildCategoryPath({
            locationSlug: route.locationSlug,
            categorySlug: route.categorySlug,
          }),
        }]
      : []),
    { name: route.categoryName, path: null },
  ];
};

const absoluteCrumbUrl = (crumbPath = "/") =>
  `https://massclick.in${crumbPath === "/" ? "/" : crumbPath}`;

const renderBreadcrumbNavHtml = (crumbs = []) =>
  `<nav aria-label="Breadcrumb" style="margin-bottom:12px">
            ${crumbs.map((crumb) => (
              crumb.path
                ? `<a href="${escapeHtml(absoluteCrumbUrl(crumb.path))}">${escapeHtml(crumb.name)}</a>`
                : `<span>${escapeHtml(crumb.name)}</span>`
            )).join(" &gt;\n            ")}
          </nav>`;

const renderMarkdownBreadcrumb = (crumbs = []) =>
  crumbs.map((crumb) => (
    crumb.path
      ? `[${crumb.name}](${absoluteCrumbUrl(crumb.path)})`
      : crumb.name
  )).join(" > ");

let cachedIndexHtml = null;
let cachedIndexMtimeMs = null;

function readIndexHtmlCached(indexPath) {
  let stat;
  try {
    stat = fs.statSync(indexPath);
  } catch {
    return null;
  }
  if (cachedIndexHtml === null || cachedIndexMtimeMs !== stat.mtimeMs) {
    cachedIndexHtml = fs.readFileSync(indexPath, "utf8");
    cachedIndexMtimeMs = stat.mtimeMs;
  }
  return cachedIndexHtml;
}

export async function ssrMiddleware(req, res) {
  try {
    const indexPath = path.join(CLIENT_BUILD_PATH, "index.html");
    const cachedHtml = readIndexHtmlCached(indexPath);
    if (cachedHtml === null) {
      return res.status(404).send("Build not found");
    }

    let html = cachedHtml;
    const parts = req.path.split("/").filter(Boolean);

    const firstSegment = parts[0] || "";
    const secondSegment = parts[1] || "";

    // Hard-404 malformed category-shaped URLs before any DB work happens.
    //
    // These can only be crawler-invented (see isServableUrlSegment): nothing we
    // render links to them. Returning 200 with a generic shell is a soft 404 —
    // it is precisely what convinced Googlebot this URL space was legitimate and
    // worth crawling deeper, at one full businesslists collection scan each.
    //
    // The SPA shell is still sent as the body so a human who lands here gets a
    // usable page; only the status changes. Routes with their own handling
    // (business pages, dashboard, blog, static pages) are excluded — their
    // segments carry ObjectIds and other non-slug shapes by design.
    // Single-segment junk is included: the longest URL observed in the crawl
    // (949 chars of repeated "20") had no second segment, and would otherwise
    // still self-canonicalise below.
    const isSeoRoute =
      Boolean(firstSegment) &&
      !SKIP_SEO_ROUTES.has(firstSegment) &&
      !STATIC_PAGES[firstSegment] &&
      firstSegment !== "blog";

    if (isSeoRoute && !parts.every(isServableUrlSegment)) {
      return res.status(404).send(html);
    }

    let seo = null;
    let blogDoc = null;
    let categoryContent = null;
    let categoryBusinesses = [];
    let isCategoryPage = false;
    let isBlogPage = false;
    let categoryRoute = null;

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
      categoryRoute = await resolveCategoryRouteContext(parts);
      const location = categoryRoute?.locationName || "";
      const category = categoryRoute?.categoryText || "";
      const isLocationLandingPage = Boolean(categoryRoute?.isLocationLanding);
      const seoLocation = categoryRoute?.districtSlug && !categoryRoute?.locationSlug
        ? ""
        : categoryRoute?.locationSlug || location;
      const cacheKeyPrefix = categoryRoute ? `category:${categoryRoute.cacheKey}` : "";
      const contentCacheKey = cacheKeyPrefix ? `${cacheKeyPrefix}:content:v2` : "";
      const businessesCacheKey = `${cacheKeyPrefix}:businesses:v2`;

      // Parallel cache lookups for better performance
      const [cachedSeo, cachedContent, cachedBusinesses] = await Promise.all([
        cacheKeyPrefix ? getCache(`${cacheKeyPrefix}:seo`) : null,
        contentCacheKey ? getCache(contentCacheKey) : null,
        cacheKeyPrefix ? getCache(businessesCacheKey) : null
      ]);

      // Use cached data or fetch from database
      seo = cachedSeo || (categoryRoute && !isLocationLandingPage ? await getSeoMeta({
        pageType: "category",
        category,
        ...(seoLocation ? { location: seoLocation } : {}),
        ...(categoryRoute.locationPath ? { locationPath: categoryRoute.locationPath } : {}),
        ...(categoryRoute.canonicalPath ? { canonicalPath: categoryRoute.canonicalPath } : {}),
        ...(categoryRoute.districtSlug ? { district: categoryRoute.districtSlug } : {}),
      }) : null);

      categoryContent = cachedContent || (categoryRoute && !isLocationLandingPage ? await getSeoPageContentMetaService({
        pageType: "category",
        location: location,
        category: category,
        displayLocation: buildTemplateLocation({
          locationName: location,
          districtName: categoryRoute.districtName,
          hasSpecificLocation: Boolean(categoryRoute.locationSlug || categoryRoute.locationPath),
        }),
        ...(categoryRoute.districtSlug ? { district: categoryRoute.districtSlug } : {}),
      }) : null);

      categoryBusinesses = cachedBusinesses || (categoryRoute && !isLocationLandingPage ? await findBusinessesByCategory(
        category,
        categoryRoute.businessLocationContext
      ) : []);

      // Set cache for fetched data
      if (cacheKeyPrefix && seo && !cachedSeo) {
        await setCache(`${cacheKeyPrefix}:seo`, seo, CACHE_TTL.SEO_META);
      }
      if (contentCacheKey && categoryContent && !cachedContent) {
        await setCache(contentCacheKey, categoryContent, CACHE_TTL.PAGE_CONTENT);
      }
      if (cacheKeyPrefix && categoryBusinesses && !cachedBusinesses) {
        await setCache(businessesCacheKey, categoryBusinesses, CACHE_TTL.BUSINESSES);
      }
      isCategoryPage = Boolean(categoryRoute);
    }

    const locationName = isCategoryPage ? categoryRoute.locationName : "";
    const categoryName = isCategoryPage ? categoryRoute.categoryName : "";
    const isLocationLandingPage = Boolean(categoryRoute?.isLocationLanding);

    const title = escapeHtml(
      seo?.title ||
      (isCategoryPage
        ? isLocationLandingPage
          ? `Local Businesses in ${locationName} | Massclick`
          : `${categoryName} in ${locationName} | Massclick`
        : fallbackTitle)
    );
    const description = escapeHtml(
      seo?.description ||
      (isCategoryPage
        ? isLocationLandingPage
          ? `Discover trusted businesses, services, and professionals in ${locationName} on Massclick.`
          : `Find the best ${categoryName} in ${locationName}. Verified listings, reviews, phone numbers, address and more on Massclick.`
        : fallbackDescription)
    );
    const keywords = escapeHtml(
      seo?.keywords ||
      (isCategoryPage
        ? isLocationLandingPage
          ? `businesses in ${locationName}, ${locationName} local services, Massclick ${locationName}`
          : `${categoryName}, ${locationName}, best ${categoryName} in ${locationName}`
        : fallbackKeywords)
    );
    // Canonicalise the self-referential fallback rather than echoing req.path
    // verbatim: req.path is not percent-decoded, so a crawler-invented path with
    // literal "%20" in it would otherwise emit itself as its own canonical and
    // assert that the junk URL is the authoritative one.
    const canonicalPathFromRequest = `/${parts.map(slugify).filter(Boolean).join("/")}`;
    const canonical = escapeHtml(
      isCategoryPage
        ? categoryRoute.canonicalUrl
        : seo?.canonical || `https://massclick.in${canonicalPathFromRequest}`
    );

    const h1 = isBlogPage
      ? (blogDoc?.heading || seo?.title || fallbackTitle)
      : isCategoryPage
        ? isLocationLandingPage
          ? `Local Businesses in ${locationName}`
          : `${categoryName} in ${locationName}`
        : (seo?.title || fallbackTitle);

    const breadcrumbCrumbs = isBlogPage
      ? buildBlogCrumbs({ title: blogDoc?.heading || h1 })
      : isCategoryPage
        ? buildCategoryBreadcrumbCrumbs(categoryRoute)
        : [{ name: "Home", path: null }];
    const breadcrumbCurrentPath = isBlogPage
      ? `/blog/${secondSegment}`
      : isCategoryPage
        ? categoryRoute.canonicalPath
        : req.path || "/";

    // Reference the canonical Organization node instead of redefining an
    // anonymous one — see helper/seo/organizationSchema.js.
    const basePublisher = ORGANIZATION_REF;

    const schemaObjects = [];

    // Site-wide identity goes on EVERY page, not just the homepage: category and
    // location pages carry most of the crawl budget, and the publisher/mainEntity
    // @id references elsewhere only resolve if the node is present on that page.
    schemaObjects.push(buildOrganizationSchema(), buildWebsiteSchema());

    if (!firstSegment) {
      // Homepage needs nothing beyond the site-wide identity above.
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
            const bizUrl = `https://massclick.in${buildBusinessPath({
              districtSlug: categoryRoute?.districtSlug,
              business: biz,
            })}`;
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
        isPartOf: WEBSITE_REF,
        publisher: basePublisher
      });
    }

    schemaObjects.push(crumbsToJsonLd(breadcrumbCrumbs, "https://massclick.in", breadcrumbCurrentPath));

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
          ${renderBreadcrumbNavHtml(breadcrumbCrumbs)}
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
          ${renderBreadcrumbNavHtml(breadcrumbCrumbs)}
          <h1>${escapeHtml(h1)}</h1>
          <p>${description}</p>
          ${categoryIntroHtml}
          ${categoryFaqHtml}
          ${Array.isArray(categoryBusinesses) && categoryBusinesses.length > 0 ? `
          <section class="top-businesses">
            <h2>Top ${escapeHtml(categoryName)} in ${escapeHtml(locationName)}</h2>
            <ul style="list-style:none;padding:0;margin:0">
              ${categoryBusinesses.slice(0, 10).map((biz) => {
                const bizUrl = buildBusinessPath({
                  districtSlug: categoryRoute?.districtSlug,
                  business: biz,
                });
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
    const lcpImageHref =
      isCategoryPage && categoryBusinesses.length > 0
        ? categoryBusinesses[0]?.bannerImage || "/header.png"
        : null;
    const lcpImagePreload = lcpImageHref
      ? `<link rel="preload" as="image" href="${escapeHtml(lcpImageHref)}" fetchpriority="high">`
      : "";

    const skeletonHtml = `
      <div class="ssr-skeleton" aria-hidden="true">
        <div class="ssr-skeleton-bar shimmer" style="width:40%;height:28px;margin-bottom:16px;"></div>
        <div class="ssr-skeleton-bar shimmer" style="width:90%;height:14px;margin-bottom:10px;"></div>
        <div class="ssr-skeleton-bar shimmer" style="width:75%;height:14px;margin-bottom:24px;"></div>
        <div class="ssr-skeleton-bar shimmer" style="width:100%;height:120px;"></div>
      </div>
    `;
    const isHomePage = !firstSegment;
    const homeRoutePreloadTags = isHomePage
      ? getHomeRoutePreloadTags(CLIENT_BUILD_PATH)
      : "";
    const rootBootstrapHtml = isHomePage
      ? renderHomeRouteShell()
      : `${skeletonHtml}<div class="ssr-seo-content">${serverContent}</div>`;

    html = html
      .replace(
        "</head>",
        `${homeRoutePreloadTags}${lcpImagePreload}<script>window.__SSR_SEO__=${ssrSeoJson}</script>${schemaScripts}</head>`
      )
      .replace('<div id="root"></div>', `<div id="root">${rootBootstrapHtml}</div>`);

    if (!firstSegment) {
      appendDiscoveryLinkHeaders(res);
    }

    const acceptsMarkdown = (req.headers["accept"] || "").includes("text/markdown");
    if (acceptsMarkdown) {
      const mdLines = [];

      mdLines.push(`_${renderMarkdownBreadcrumb(breadcrumbCrumbs)}_`, "");
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
            const bizUrl = `https://massclick.in${buildBusinessPath({
              districtSlug: categoryRoute?.districtSlug,
              business: biz,
            })}`;
            mdLines.push(`${i + 1}. **[${biz.businessName}](${bizUrl})**`);
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
