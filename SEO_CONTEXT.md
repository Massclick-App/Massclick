# Massclick SEO Context

Last updated: 2026-06-22

## Goal

This note captures the current SEO architecture across the frontend and backend so future SEO work can start from shared context instead of re-discovery.

## App shape

- Frontend: `D:\dev_abishek\massclick\client\ui-app`
- Backend: `D:\dev_abishek\massclick\server`
- Frontend is a React 18 SPA using `react-router-dom`, Redux, and `react-helmet-async`.
- Backend is an Express 5 app with MongoDB, Redis caching, sitemap routes, and a catch-all SSR middleware.

## Public route map

Primary public routes are declared in `D:\dev_abishek\massclick\client\ui-app\src\App.js`.

- Home: `/`
- Static marketing/support pages: `/aboutus`, `/testimonials`, `/feedbacks`, `/customercare`, `/portfolio`, `/terms`, `/privacy`, `/refund`, `/enquiry`, `/web`, `/digital`, `/graphic`, `/seo`, `/knowledgebase`
- Category hub/listing: `/:location/:category`
- Search result / subcategory: `/:location/:category/:subcategory`
- Business detail: `/business/:location/:businessSlug/:id`
- Blog detail: `/blog/:slug`
- Events: `/events`, `/events/:eventSlug/:id`

## SEO data sources

### 1. SEO metadata

- Model: `D:\dev_abishek\massclick\server\model\seoModel\seoModel.js`
- Helper: `D:\dev_abishek\massclick\server\helper\seo\seoHelper.js`
- API: `GET /api/seo/meta`
- Admin UI: `D:\dev_abishek\massclick\client\ui-app\src\Internals\seoData\seoData.js`

Purpose:

- Stores page-level title, description, keywords, canonical, robots.
- Used for home, static pages, and category/location combinations.

### 2. SEO page content

- Model: `D:\dev_abishek\massclick\server\model\seoModel\seoPageContentModel.js`
- Helper: `D:\dev_abishek\massclick\server\helper\seo\seoPageContentHelper.js`
- API: `GET /api/seopagecontent/meta`
- Admin UI: `D:\dev_abishek\massclick\client\ui-app\src\Internals\seoData\seoPageContent\seoPageContent.js`

Purpose:

- Stores long-form category/location content such as `headerContent`, `pageContent`, and FAQ blocks.
- Search/category pages render this content below listings.

### 3. SEO blog content

- Model: `D:\dev_abishek\massclick\server\model\seoModel\seoPageContentBlogModel.js`
- Schema: `D:\dev_abishek\massclick\server\schema\seoSchema\seoPageContentBlogSchema.js`
- Helper: `D:\dev_abishek\massclick\server\helper\seo\seoOnpageBlogHelper.js`
- API: `GET /api/seopagecontentblog/blog/:slug`
- Admin UI: `D:\dev_abishek\massclick\client\ui-app\src\Internals\seoData\seoPageContentBlog\seoPageContentBlog.js`

Purpose:

- Stores blog meta, body content, FAQ, OG image, author info, inline content blocks, and referenced businesses.

## Frontend SEO implementation

### Shared meta component

- `D:\dev_abishek\massclick\client\ui-app\src\Internals\clientComponent\seo\seoMeta.js`

What it does:

- Renders `<title>`, meta description, keywords, robots, canonical, Open Graph, and Twitter tags.
- Uses server/admin SEO data when available, with page-specific fallback objects.

### Structured data generators

- `D:\dev_abishek\massclick\client\ui-app\src\utils\seoSchemaGenerators.js`

Current schema coverage:

- `Organization`
- `WebSite`
- `BreadcrumbList`
- `LocalBusiness`
- `ItemList`
- `SearchResultsPage`
- `FAQPage`
- `Service`
- `AboutPage`
- `ContactPage`
- `BlogPosting`

### Main public pages using SEO

- Home: `D:\dev_abishek\massclick\client\ui-app\src\Internals\clientComponent\home.js`
- Search results: `D:\dev_abishek\massclick\client\ui-app\src\Internals\clientComponent\SearchResult\SearchResult.js`
- Business detail: `D:\dev_abishek\massclick\client\ui-app\src\Internals\clientComponent\cards\cardDetails.js`
- Blog detail: `D:\dev_abishek\massclick\client\ui-app\src\Internals\clientComponent\relatedBlogs\blogDetails\blogDetails.js`
- Static/footer pages: under `D:\dev_abishek\massclick\client\ui-app\src\Internals\clientComponent\footer\`

## Backend SEO implementation

### SSR middleware

- `D:\dev_abishek\massclick\server\middleware\ssrMiddleware.js`

What it currently does:

- Serves built React app HTML for all public routes after API/static handling.
- Injects title, description, keywords, canonical, OG/Twitter values into `index.html`.
- Injects JSON-LD for home, category, blog, and breadcrumb schema.
- Inserts server-rendered HTML blocks for home/category/blog so crawlers see useful page content.
- Caches SEO, blog, category content, and business lists in Redis.

### Sitemaps

- `D:\dev_abishek\massclick\server\routes\sitemapRoutes.js`

Current sitemap shape:

- `/sitemap.xml` sitemap index
- `/sitemap-city-{slug}.xml` city/category URLs
- `/sitemap-business-{page}.xml` business URLs
- `/sitemap-blog.xml` blog URLs
- `/sitemap` HTML sitemap

### Robots

- `D:\dev_abishek\massclick\client\ui-app\public\robots.txt`

Current behavior:

- Allows major crawlers.
- References `https://massclick.in/sitemap.xml`.
- Explicitly disallows `Google-Extended`.

## Request flow for a typical SEO page

### Category page

1. User or crawler requests `/:location/:category` or `/:location/:category/:subcategory`
2. Express serves static assets first, then hits `ssrMiddleware`
3. `ssrMiddleware` loads SEO meta via `getSeoMeta()`
4. `ssrMiddleware` loads long-form content via `getSeoPageContentMetaService()`
5. `ssrMiddleware` loads matching businesses via `findBusinessesByCategory()`
6. Server injects meta tags, JSON-LD, breadcrumbs, and content into HTML
7. React hydrates on the client
8. Search page also fetches client-side SEO meta/content again via Redux

### Blog page

1. Request hits `/blog/:slug`
2. `ssrMiddleware` loads blog metadata via `getSeoBlogMetaBySlug()`
3. Server injects article meta, FAQ schema, breadcrumb schema, and body HTML
4. React blog page fetches full blog content and enhances the experience on hydration

### Business detail page

1. Request hits `/business/:location/:businessSlug/:id`
2. React business detail page fetches business data by ID or slug
3. Frontend renders `LocalBusiness` and breadcrumb schema
4. There is currently no equivalent dedicated server-side meta enrichment for business detail pages

## Important observations

### Strengths already in place

- Real SSR-like HTML injection exists on the backend, not only client-side Helmet.
- SEO content is editable through admin panels instead of hardcoded files.
- JSON-LD coverage is broader than average for a local directory product.
- Sitemap generation is dynamic from MongoDB, not static hand-maintained XML.
- Redis caching is already wired into the SEO path.

### Gaps and risks found in code

1. Business sitemap URLs do not match the actual business route.
   - React route expects `/business/:location/:businessSlug/:id`
   - Sitemap emits `/${citySlug}/${businessSlug}/${id}`
   - Files:
     - `D:\dev_abishek\massclick\client\ui-app\src\App.js`
     - `D:\dev_abishek\massclick\server\routes\sitemapRoutes.js`

2. Business detail pages do not currently set page-specific title, description, canonical, OG, or Twitter tags.
   - They only emit JSON-LD and breadcrumb schema.
   - File:
     - `D:\dev_abishek\massclick\client\ui-app\src\Internals\clientComponent\cards\cardDetails.js`

3. Blog schema default canonical is incorrect in the database layer.
   - Blog schema auto-fills `canonicalUrl` as `https://massclick.in/{location}/{category}`
   - Live blog route is `/blog/:slug`
   - File:
     - `D:\dev_abishek\massclick\server\schema\seoSchema\seoPageContentBlogSchema.js`

4. Blog structured data uses `blog.ogImageKey` instead of the signed/public image URL.
   - That can produce invalid `image` values in `BlogPosting` schema.
   - File:
     - `D:\dev_abishek\massclick\client\ui-app\src\Internals\clientComponent\relatedBlogs\blogDetails\blogDetails.js`

5. Several static-page fallback canonicals appear to differ from real routes.
   - Examples found:
     - about page fallback canonical uses `/about` while route is `/aboutus`
     - testimonials fallback canonical uses `/testimonial` while route is `/testimonials`
     - customer care fallback canonical uses mixed-case `/customerCare` while route is `/customercare`
   - Files:
     - `D:\dev_abishek\massclick\client\ui-app\src\Internals\clientComponent\footer\aboutUs\aboutUsPage.js`
     - `D:\dev_abishek\massclick\client\ui-app\src\Internals\clientComponent\footer\testimonials\testimonials.js`
     - `D:\dev_abishek\massclick\client\ui-app\src\Internals\clientComponent\footer\customerCare\customerCare.js`

6. Sitemap coverage is incomplete for some strong indexable pages.
   - Static pages like `/aboutus`, `/privacy`, `/terms`, `/web`, `/digital`, `/graphic`, `/seo`, `/knowledgebase` are not part of the XML sitemap.
   - Events pages also do not appear in sitemap output.

## Best next SEO ideas

### 1. Fix indexation blockers first

- Correct business URLs in `sitemap-business-*.xml`
- Add missing metadata for business detail pages
- Normalize all canonical paths to match real routes

Why this is first:

- These are foundational issues that can waste crawl budget or point Google at the wrong URLs.

### 2. Make business detail pages a first-class SEO surface

- Add page-specific title, meta description, canonical, OG, and Twitter tags
- Generate richer `LocalBusiness` schema including reviews, geo, opening hours, area served, and photos
- Consider backend SSR enrichment for business detail routes similar to category/blog pages

Why this matters:

- Business pages are the highest-intent pages in the product and should be the strongest organic landing pages.

### 3. Build a canonical contract across frontend, backend, and database

- One helper should define canonical URLs for home, static pages, categories, businesses, blogs, and events
- Use the same helper in React fallbacks, SSR middleware, sitemap generation, and blog schema defaults

Why this matters:

- It prevents drift between route definitions, sitemap URLs, admin-entered canonicals, and rendered meta tags.

### 4. Expand sitemap and crawl discovery

- Add static pages to sitemap index or a dedicated static sitemap
- Add event URLs if they are meant to rank
- Add city landing pages where useful
- Ensure sitemap priority/changefreq logic matches business value

Why this matters:

- Discovery becomes cleaner and Google gets a complete picture of the indexable surface.

### 5. Turn category pages into stronger topical hubs

- Standardize category SEO content blocks: intro, trust signals, FAQ, related categories, top areas, and featured businesses
- Add internal links from blogs to category pages and from category pages to top businesses
- Add “related categories in {city}” and “nearby categories” modules

Why this matters:

- Category pages can become durable location-service landing pages instead of thin search result shells.

### 6. Improve blog-to-commercial intent flow

- Fix blog canonical/schema/image handling
- Add stronger internal links from blogs to matching category and business pages
- Add “top businesses mentioned in this article” blocks with crawlable links
- Add author and freshness signals consistently

Why this matters:

- Blogs can feed discovery and topical authority instead of remaining isolated content.

### 7. Add an SEO QA checklist and crawl-safe tooling

- Validate title/description/canonical/schema output per route type
- Verify sitemap URLs resolve and return expected meta
- Check SSR HTML for indexable content before hydration

Suggested future automation:

- small script or test suite that samples URLs and validates route-to-canonical consistency

## Recommended execution order

1. Route and canonical cleanup
2. Business page metadata and SSR uplift
3. Sitemap completeness
4. Blog canonical/schema cleanup
5. Internal linking improvements
6. Content expansion for category hubs

## Most likely high-impact wins

- Business detail metadata + correct sitemap URLs
- Canonical normalization across all static and blog pages
- Better internal linking from blogs and category pages to businesses
- Richer, consistent category-page content templates by city + service
