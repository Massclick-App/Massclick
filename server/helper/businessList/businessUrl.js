/**
 * Single server-side authority for the business-detail URL's own slug segment.
 *
 * `businesslists.slug` is NOT a business slug. It holds category or SEO title
 * text — "hotels", "Best CCTV Camera Installation and Dealers Near Me" — and
 * never the business's own name (verified against massClick_dev: of 9,525
 * populated `slug` values, 0 match their `businessName` and 2,978 are exactly
 * the `category` string). Every emitter used to read it first, so the business
 * name appeared in no business URL at all and 119 Trichy hotels produced URLs
 * that differed only by ObjectId.
 *
 * Build the slug from `businessName` here and nowhere else. `slug` stays
 * untouched in the DB — it's SEO title data and other code may still read it.
 *
 * The client has a deliberate parallel implementation in
 * client/ui-app/src/utils/searchResultNavigation.js (`createBusinessSlug`),
 * because that app cannot import server code. The two MUST produce
 * byte-identical output: the canonical redirect in
 * legacyUrlRedirectMiddleware.js compares a request's slug segment against
 * this function, so any divergence would 301 the links the app itself emits.
 * If you change the length cap, the fallback, or the truncation rule here,
 * change it there too.
 */
import { slugify } from "../../slugify.js";

// Long enough for real business names, short enough to keep the URL readable.
// The longest name in the data is 116 chars ("AIMAN COLLEGE OF ARTS AND
// SCIENCE FOR WOMEN, Accredited with 'A' Grade by NAAC..."), which would
// otherwise become a 110-char path segment.
export const MAX_BUSINESS_SLUG_LENGTH = 80;

// Used when a name has no latin alphanumerics at all and slugifies to "" (7
// such businesses in dev). The page still resolves — routing is id-backed —
// so this only needs to be stable, not meaningful.
export const BUSINESS_SLUG_FALLBACK = "business";

const truncateAtWordBoundary = (slug = "") => {
  if (slug.length <= MAX_BUSINESS_SLUG_LENGTH) return slug;
  const cut = slug.slice(0, MAX_BUSINESS_SLUG_LENGTH);
  const lastBoundary = cut.lastIndexOf("-");
  return (lastBoundary > 0 ? cut.slice(0, lastBoundary) : cut).replace(/-+$/, "");
};

/**
 * The canonical business-slug segment for a business.
 *
 * @param {Object} business - a businesslists doc (or any object carrying
 *   `businessName`/`name`). The schema's pre("validate") hook keeps those two
 *   fields mirrored, so either is sufficient.
 * @returns {string} a non-empty slug, never "".
 */
export const getBusinessUrlSlug = (business = {}) =>
  truncateAtWordBoundary(slugify(business.businessName || business.name || "")) ||
  BUSINESS_SLUG_FALLBACK;

export default getBusinessUrlSlug;
