# SEO Tracker — Massclick

Last updated: 2026-07-02

---

## Schema.org / Structured Data

All schemas injected server-side in [`server/middleware/ssrMiddleware.js`](server/middleware/ssrMiddleware.js).

| Schema | Page type | Status | Notes |
|--------|-----------|--------|-------|
| `Organization` | All pages | ✅ Done | Line 181 — name, url, logo, contactPoint, sameAs (social links), foundingDate, address |
| `WebSite` + `SearchAction` | All pages | ✅ Done | Line 223 — site-wide search action |
| `BreadcrumbList` | Category, blog, business pages | ✅ Done | Injected per page type |
| `BlogPosting` | Blog pages | ✅ Done | Line 232 — headline, author (slug, jobTitle, shortBio, linkedin), datePublished, dateModified, image |
| `FAQPage` | Blog pages | ✅ Done | Line 263 — built from blog `faq` field |
| `CollectionPage` | Category pages | ✅ Done | Line 274 — name, description, speakable |
| `FAQPage` | Category pages | ✅ Done | Line 288 — category-level FAQ |
| `ItemList` + `LocalBusiness` | Category pages | ✅ Done | Lines 300-309 — up to 10 businesses per list |
| `Speakable` | Category + blog pages | ✅ Done | Lines 254, 279 — cssSelector targeting title + description |

**Client-side schemas** (React, in [`client/ui-app/src/utils/seoSchemaGenerators.js`](client/ui-app/src/utils/seoSchemaGenerators.js)):
- `SearchResult.js` emits: `Organization`, `WebSite`, `BreadcrumbList`, `FAQPage` — **duplicates SSR schemas on category pages** (see TODO 1C)

---

## Sitemap

All routes in [`server/routes/sitemapRoutes.js`](server/routes/sitemapRoutes.js).

| Route | Status | Notes |
|-------|--------|-------|
| `/sitemap.xml` | ✅ Done | Sitemap index listing one city sitemap per active city + paginated business sitemaps + blog sitemap |
| `/sitemap-city-{slug}.xml` | ✅ Done | Per-city: all category paths using real DB slugs from `categoryModel`. `lastmod` from `MAX(updatedAt)` aggregation |
| `/sitemap-business-{page}.xml` | ✅ Done | Paginated at 1000/page, sorted by `updatedAt` desc, real `lastmod` per business |
| `/sitemap-blog.xml` | ✅ Done | All active blog slugs with real `updatedAt` |
| `/sitemap` (HTML) | ✅ Done | Human-readable HTML sitemap with city + blog links |

---

## AI Crawlers & Discoverability

| Feature | Route/File | Status | Notes |
|---------|-----------|--------|-------|
| `robots.txt` | [`server/routes/wellKnownRoutes.js`](server/routes/wellKnownRoutes.js) | ✅ Done | Explicitly allows: Googlebot, GPTBot, ClaudeBot, PerplexityBot, Applebot, bingbot, cohere-ai, YouBot, Bytespider, OAI-SearchBot, anthropic-ai + others. Disallows `/admin` and `/api/` |
| `llms.txt` | [`server/routes/sitemapRoutes.js:411`](server/routes/sitemapRoutes.js) | ✅ Done | AI discovery file — site description, key pages, content types, business data fields, cities covered, company info |
| Markdown alternate header | [`server/middleware/ssrMiddleware.js:531`](server/middleware/ssrMiddleware.js) | ✅ Done | `Link: <canonical>; rel="alternate"; type="text/markdown"` on all SSR responses |

---

## On-Page Content (SSR)

| Feature | Status | Notes |
|---------|--------|-------|
| `quickSummary` rendered as "Quick Answer" block | ✅ Done | [`ssrMiddleware.js:384`](server/middleware/ssrMiddleware.js) — shown before article body on blog pages |
| Business listings HTML in `serverContent` | ✅ Done | Category pages render top 10 businesses as HTML for crawler visibility |
| FAQ content rendered in `serverContent` | ✅ Done | Blog + category FAQ rendered server-side |

---

## Client-Side SEO Fixes

| Feature | File | Status | Notes |
|---------|------|--------|-------|
| FAQ field fix (`seoContent?.faqs` → `seoContent?.faq`) | [`SearchResult.js`](client/ui-app/src/Internals/clientComponent/SearchResult/SearchResult.js) | ✅ Done | Was using wrong field name; FAQs now render correctly |
| `/:location` single-segment routes → redirect home | [`App.js`](client/ui-app/src/App.js) | ✅ Done | `<Route path="/:location" element={<Navigate to="/" replace />} />` — prevents blank page on non-city single-segment URLs |

---

## GSC Analytics Dashboard

| Component | File | Status |
|-----------|------|--------|
| Backend helper (8 GSC functions, Redis cache 4h) | [`server/helper/gsc/gscHelper.js`](server/helper/gsc/gscHelper.js) | ✅ Done |
| Controller (8 endpoints) | [`server/controller/gscController.js`](server/controller/gscController.js) | ✅ Done |
| Routes (`/api/gsc/*`, `oauthAuthentication` protected) | [`server/routes/gscRoutes.js`](server/routes/gscRoutes.js) | ✅ Done |
| Redux action types | [`client/.../gscActionTypes.js`](client/ui-app/src/redux/actions/gscActionTypes.js) | ✅ Done |
| Redux actions (thunks) | [`client/.../gscAction.js`](client/ui-app/src/redux/actions/gscAction.js) | ✅ Done |
| Redux reducer | [`client/.../gscReducer.js`](client/ui-app/src/redux/reducers/gscReducer.js) | ✅ Done |
| Dashboard UI (6 tabs + keyword tracking) | [`client/.../gscAnalytics.js`](client/ui-app/src/Internals/gscAnalytics/gscAnalytics.js) | ✅ Done |
| Sidebar menu entry | [`client/.../MenuContent.js`](client/ui-app/src/components/MenuContent.js) | ✅ Done |
| Lazy route in App.js | [`client/.../App.js`](client/ui-app/src/App.js) | ✅ Done |

**Dashboard tabs:** Overview (stat cards + delta vs previous period), Queries, Pages, Devices (pie chart), Countries (bar chart), Opportunities (quick wins + low CTR + keyword gaps cross-referenced with MongoDB `seoPageContent`)

**GSC property:** `sc-domain:massclick.in`
**Auth:** Service account JSON at `GSC_KEY_PATH` env var (never committed)

---

## TODOs / Remaining Work

### High Priority

| # | Task | Why it matters |
|---|------|---------------|
| 1B | Fix `SearchAction` URL template: `/{search_term_string}` → `/search?q={search_term_string}` | Current template uses path segment, Google expects query param format for this site |
| 1C | Deduplicate `Organization` + `WebSite` schemas — SSR and client React both emit them on category pages | Duplicate JSON-LD can confuse parsers; only SSR version needed |
| 1D | 301 redirect `trichy` → `tiruchirappalli` (or vice versa) at the URL level | Currently both work via DB query aliases but no canonical redirect; creates duplicate content |
| 4A | Remove `metaseoData.json` from client bundle (468 KB) | Bloats initial JS payload; data should come from API |

### Medium Priority

| # | Task | Why it matters |
|---|------|---------------|
| 2C | Verify blog author schema has `url` + `image` fields populated for all authors | Rich results require author URL for author pages |
| 2D | Business detail page canonical tag from DB field instead of URL params | Prevents duplicate canonicals when same business accessible via different slugs |
| 3A | City hub pages (`/:city`) with real content instead of redirect | Currently redirects to home — missed SEO opportunity for city-level landing pages |

---

## Environment Variables (server)

```
GSC_KEY_PATH=C:/Users/USER/Downloads/massclick-dc8f6-4ac3adcfe0be.json
GSC_SITE=sc-domain:massclick.in
```
