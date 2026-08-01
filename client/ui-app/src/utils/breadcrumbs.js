// Client mirror of server/helper/seo/breadcrumbBuilder.js — same crumb
// SEQUENCING and rules (district-alias-preferred name, terminal crumb never
// links to itself, blog trail kept separate and un-districted), but a
// necessarily different INPUT SHAPE: the server builds crumbs from raw
// Mongoose docs it queried itself; the client has no DB access and only ever
// has whatever a search/business-detail API response already resolved. So
// this version takes flat, already-slugged fields instead of doc objects —
// matching the params buildCategoryPath()/buildBusinessPath() in
// searchResultNavigation.js take, since that's what actually flows through
// this app (a resolved location context object, not a mongoose doc).
//
// The part that MUST stay identical between the two files is the sequencing
// logic itself — which crumb appears at which position, when a crumb is
// terminal, the district-name-prefers-alias rule — not the function
// signature. If you change the ORDER or RULES here, change them in
// breadcrumbBuilder.js too, and vice versa.

const toTitleCase = (value = "") =>
  String(value)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * @param {object} args
 * @param {string} args.districtSlug - required; every trail here starts
 *   below the district level. Pages with no district context (home, blog)
 *   don't call this — see buildBlogCrumbs and the homepage's "decide away"
 *   note in the migration plan.
 * @param {string} [args.districtName] - falls back to title-cased
 *   districtSlug when omitted, matching the server's alias-preferred rule
 *   (the slug IS the alias when one exists).
 * @param {string} [args.locationSlug]
 * @param {string} [args.locationName]
 * @param {string} [args.categorySlug]
 * @param {string} [args.categoryName]
 * @param {string} [args.subcategorySlug] - only meaningful alongside
 *   category; a subcategory with no category is not a URL this scheme
 *   produces.
 * @param {string} [args.subcategoryName]
 * @param {string} [args.businessName] - business detail pages. No slug
 *   needed: the business crumb is always terminal (see the null-path note
 *   below) and /business/... is a structurally different path shape from
 *   the category chain, so there's nothing meaningful to build a path from
 *   here.
 * @returns {Array<{name:string, path:string|null}>} `path` is site-relative,
 *   never absolute. The LAST crumb always has `path: null` — it represents
 *   the page currently being viewed. The location crumb ALSO always has
 *   `path: null` even when not terminal — there is no /:district/:location
 *   landing page in this scheme, only /:district/:category (unambiguous by
 *   definition) and /:district/:location/:category (via the classifier), so
 *   a location-only URL is not a page this app can render.
 */
export const buildCrumbs = ({
  districtSlug,
  districtName,
  locationSlug,
  locationName,
  categorySlug,
  categoryName,
  subcategorySlug,
  subcategoryName,
  businessName,
} = {}) => {
  if (!districtSlug) return [];

  const crumbs = [{ name: "Home", path: "/" }];

  const districtPath = `/${districtSlug}`;
  crumbs.push({ name: districtName || toTitleCase(districtSlug), path: districtPath });

  let pathSoFar = districtPath;

  if (locationSlug) {
    pathSoFar = `${pathSoFar}/${locationSlug}`;
    // No dedicated /:district/:location landing page exists in this URL
    // scheme — a bare two-segment path is DEFINED as /:district/:category
    // with no exception (that's what keeps it unambiguous). Giving this
    // crumb a real href sends the user into that exact misinterpretation:
    // clicking it drops the category and the router treats the location
    // slug as if it were a category slug instead. Label only, no link —
    // pathSoFar still advances so the category crumb after it gets the
    // correct full path. Matches the pre-migration breadcrumb, which never
    // linked its middle "location" crumb either.
    crumbs.push({ name: locationName || toTitleCase(locationSlug), path: null });
  }

  if (categorySlug) {
    pathSoFar = `${pathSoFar}/${categorySlug}`;
    crumbs.push({ name: categoryName || toTitleCase(categorySlug), path: pathSoFar });
  }

  if (subcategorySlug) {
    pathSoFar = `${pathSoFar}/${subcategorySlug}`;
    crumbs.push({ name: subcategoryName || toTitleCase(subcategorySlug), path: pathSoFar });
  }

  if (businessName) {
    // Not appended to pathSoFar — see the JSDoc note above. Always terminal
    // in practice (business pages never carry a subcategory), and the
    // terminal-override below nulls it regardless.
    crumbs.push({ name: businessName, path: null });
  }

  // The current page never links to itself.
  crumbs[crumbs.length - 1].path = null;

  return crumbs;
};

// Blog posts are deliberately NOT districted. The pre-migration code guessed
// a location for the blog crumb (`blog.location || "trichy"`) and built a
// 2-segment href from it — that guess has no relationship to a resolved
// masterlocation and would need a district it has no reliable way to
// determine. Pointing it at /blog removes that broken-link class instead of
// migrating it.
export const buildBlogCrumbs = ({ title } = {}) => {
  if (!title) return [];
  return [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: title, path: null },
  ];
};

// Applies the origin exactly once — this is what structurally prevents the
// www/non-www split that existed before this migration (the old
// generateBreadcrumbSchema calls in SearchResult.js built the middle crumb
// with "https://www.massclick.in/..." while the trail's own canonical used
// the non-www form). `currentPath` is the fallback URL for the terminal
// crumb (path: null); schema.org allows omitting a URL on the last
// ListItem, but the pre-migration output always included one, so this
// preserves that instead of changing already-indexed structured data shape.
export const crumbsToJsonLd = (crumbs = [], origin = "https://massclick.in", currentPath = "") => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: `${origin}${crumb.path ?? currentPath}`,
  })),
});

// Matches Breadcrumbs.js's prop shape: items = [{ label, link? }]. `link` is
// omitted (not empty string) for the terminal crumb so the component renders
// it as plain non-clickable text, per its existing
// `item.link ? <Link>... : <span>...` branch.
export const crumbsToUiItems = (crumbs = []) =>
  crumbs.map((crumb) => ({
    label: crumb.name,
    ...(crumb.path ? { link: crumb.path } : {}),
  }));
