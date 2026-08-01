import { getDistrictUrlSlug, getDistrictDisplayName } from "../location/locationSlug.js";
import { ownNameOf } from "../location/locationResolver.js";

// Single source of the breadcrumb TRAIL for the district-prefixed URL scheme.
// Deliberately produces relative paths only ("/trichy/srirangam", never
// "https://massclick.in/trichy/srirangam") — the origin is applied exactly
// once, at the JSON-LD boundary in crumbsToJsonLd(). This is what structurally
// prevents the www/non-www split that existed before this migration
// (SearchResult.js's breadcrumb JSON-LD used to emit "https://www.massclick.in
// /${locationSlug}" for the middle crumb while its own canonical used the
// non-www form for the last one — a mismatch inside a single trail).
//
// MUST be kept identical to client/ui-app/src/utils/breadcrumbs.js. Duplicated
// by convention rather than shared as a package, matching how the segment
// classifier (helper/location/urlSegmentClassifier.js) is duplicated — the
// two run in different runtimes (server has DB docs, client has API
// responses) and the input shapes below are deliberately plain objects with
// the same field names on both sides so the logic can be copied verbatim.
// If you change one, change the other and re-run the shared fixture table
// (see the "Test coverage" section of the district URL restructure plan).

/**
 * @param {object} args
 * @param {object} args.districtDoc - resolved district doc: at minimum
 *   { district, urlAlias }. Required — every trail this function builds
 *   starts below the district level. Pages with no district context (the
 *   homepage, blog posts) don't call this at all; see buildBlogCrumbs below
 *   and the homepage's "decide away" note in the migration plan.
 * @param {object} [args.locationDoc] - resolved zone/ward/locality doc:
 *   { level, district, zone, ward, locality, publicLocationSlug }. Omit for
 *   a district-wide page (/trichy/hotels has no location crumb).
 * @param {{name:string, slug:string}} [args.category]
 * @param {{name:string, slug:string}} [args.subcategory] - only meaningful
 *   alongside `category`; a subcategory with no category is not a URL this
 *   scheme produces.
 * @param {{name:string}} [args.business] - business detail pages. No `slug`
 *   needed: the business crumb is always terminal (see the null-path note
 *   below) and the actual /business/... URL shape doesn't extend the
 *   category path the way subcategory does, so there is nothing meaningful
 *   to build a path from here.
 * @returns {Array<{name:string, path:string|null}>} `path` is site-relative
 *   ("/trichy/srirangam"), never absolute. The LAST crumb always has
 *   `path: null` — it represents the page currently being viewed, which a
 *   breadcrumb trail conventionally does not link to itself. The location
 *   crumb ALSO always has `path: null` even when not terminal — there is no
 *   /:district/:location landing page in this scheme, only
 *   /:district/:category (unambiguous by definition) and
 *   /:district/:location/:category (via the classifier), so a location-only
 *   URL is not a page this app can render.
 */
export const buildCrumbs = ({
  districtDoc,
  locationDoc,
  category,
  subcategory,
  business,
} = {}) => {
  if (!districtDoc) return [];

  const crumbs = [{ name: "Home", path: "/" }];

  const districtPath = `/${getDistrictUrlSlug(districtDoc)}`;
  crumbs.push({ name: getDistrictDisplayName(districtDoc), path: districtPath });

  let pathSoFar = districtPath;

  if (locationDoc) {
    pathSoFar = `${pathSoFar}/${locationDoc.publicLocationSlug}`;
    // No dedicated /:district/:location landing page exists in this URL
    // scheme — a bare two-segment path is DEFINED as /:district/:category
    // with no exception (that's what keeps it unambiguous; see the
    // classifier's design note on the 3-segment shape). Giving this crumb a
    // real href sends the user into that exact misinterpretation: clicking
    // it drops the category and the router treats the location slug as if
    // it were a category slug instead. Label only, no link — pathSoFar
    // still advances so the category crumb after it gets the correct full
    // path. Matches the pre-migration breadcrumb, which never linked its
    // middle "location" crumb either.
    crumbs.push({ name: ownNameOf(locationDoc), path: null });
  }

  if (category) {
    pathSoFar = `${pathSoFar}/${category.slug}`;
    crumbs.push({ name: category.name, path: pathSoFar });
  }

  if (subcategory) {
    pathSoFar = `${pathSoFar}/${subcategory.slug}`;
    crumbs.push({ name: subcategory.name, path: pathSoFar });
  }

  if (business) {
    // Not appended to pathSoFar: /business/:district/:location/:slug/:id is a
    // structurally different shape from the category/subcategory chain above
    // (it doesn't hang off the category listing path), and this crumb is
    // always terminal anyway (business pages never carry a subcategory), so
    // its path is nulled by the terminal-override below regardless of what's
    // written here.
    crumbs.push({ name: business.name, path: null });
  }

  // The current page never links to itself.
  crumbs[crumbs.length - 1].path = null;

  return crumbs;
};

// Blog posts are deliberately NOT folded into buildCrumbs/districted. The
// pre-migration code guessed a location for the blog crumb
// (`blog.location || "trichy"`) and built a 2-segment href from it — that
// guess has no relationship to a resolved masterlocation doc, was the only
// visible crumb in the whole app with a real href pointing at a bare
// location+category pair, and would need a district it has no reliable way
// to determine. Pointing it at /blog removes that broken-link class instead
// of migrating it.
export const buildBlogCrumbs = ({ title } = {}) => {
  if (!title) return [];
  return [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: title, path: null },
  ];
};

// Applies the origin exactly once. `currentPath` is the fallback URL for the
// terminal crumb (path: null) — schema.org allows omitting a URL on the last
// ListItem, but the pre-migration output always included one (see
// SearchResult.js's old generateBreadcrumbSchema calls), so this preserves
// that instead of changing already-indexed structured data shape.
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

// Matches the visible Breadcrumbs.js component's prop shape:
// items = [{ label, link? }]. `link` is omitted (not empty string) for the
// terminal crumb so the component renders it as plain non-clickable text,
// per its existing `item.link ? <Link>... : <span>...` branch.
export const crumbsToUiItems = (crumbs = []) =>
  crumbs.map((crumb) => ({
    label: crumb.name,
    ...(crumb.path ? { link: crumb.path } : {}),
  }));
