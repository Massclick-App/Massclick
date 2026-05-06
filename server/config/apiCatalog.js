export const SITE_ORIGIN = "https://massclick.in";
export const API_CATALOG_PROFILE = "https://www.rfc-editor.org/info/rfc9727";
export const API_CATALOG_PATH = "/.well-known/api-catalog";
export const API_DOCS_PATH = "/docs/api";

export const discoveryLinks = [
  `</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"; profile="${API_CATALOG_PROFILE}"`,
  `</docs/api>; rel="service-doc"; type="text/html"`,
];

export const publicApiCatalog = [
  { href: `${SITE_ORIGIN}/health`, title: "Service health", type: "application/json" },
  { href: `${SITE_ORIGIN}/api/app/version`, title: "App version", type: "application/json" },
  { href: `${SITE_ORIGIN}/api/businesslist/search`, title: "Business search", type: "application/json" },
  { href: `${SITE_ORIGIN}/api/businesslist/suggestions`, title: "Search suggestions", type: "application/json" },
  { href: `${SITE_ORIGIN}/api/category/home`, title: "Homepage categories", type: "application/json" },
  { href: `${SITE_ORIGIN}/api/category/popular`, title: "Popular categories", type: "application/json" },
  { href: `${SITE_ORIGIN}/api/seo/meta`, title: "SEO metadata lookup", type: "application/json" },
  { href: `${SITE_ORIGIN}/api/seopagecontent/meta`, title: "SEO page content metadata", type: "application/json" },
  { href: `${SITE_ORIGIN}/api/seopagecontentblog/blog/:slug`, title: "Blog content by slug", type: "application/json" },
  { href: `${SITE_ORIGIN}/api/business/:businessId/reviews`, title: "Business reviews", type: "application/json" },
];

export const appendDiscoveryLinkHeaders = (res) => {
  discoveryLinks.forEach((value) => res.append("Link", value));
};
