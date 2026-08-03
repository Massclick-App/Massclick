import { slugify } from "../../slugify.js";
import { getBusinessUrlSlug, getBusinessUrlSegment } from "./businessUrl.js";

export const getPublicBaseUrl = () =>
  String(process.env.PUBLIC_BASE_URL || "https://massclick.in").replace(/\/+$/, "");

export const getBusinessId = (business = {}) =>
  business?._id?.toString?.() || business?._id || business?.id || "";

export const getBusinessSlug = (business = {}) => getBusinessUrlSlug(business);

/**
 * The business-slug segment as it was built BEFORE the businessName fix: read
 * `businesslists.slug` first, which holds category or SEO title text rather
 * than the business's own name (see businessUrl.js). Nothing mints URLs this
 * way any more; kept only for isAcceptedBusinessDetailsUrl below.
 */
const getSupersededBusinessSlug = (business = {}) =>
  slugify(business.slug || business.businessName || business.name || "profile") ||
  "profile";

export const getLegacyBusinessLocationSlug = (business = {}) =>
  slugify(business.location || business.masterLocation?.district || "business") ||
  "business";

export const getDistrictBusinessLocationSlug = (business = {}) =>
  slugify(
    business.masterLocation?.locality ||
      business.masterLocation?.ward ||
      business.masterLocation?.zone ||
      business.location ||
      business.masterLocation?.district ||
      "business",
  ) || "business";

/**
 * The district URL segment, from the district NAME alone.
 *
 * This helper is called from synchronous template/QR code paths that have no
 * district document on hand, so it cannot consult `urlAlias` — a district with
 * an alias (Tiruchirappalli -> "trichy") therefore comes out as
 * "tiruchirappalli" here while emitters that DO have the doc use
 * getDistrictUrlSlug and emit "trichy".
 *
 * That difference is deliberately tolerated rather than plumbed through:
 * legacyUrlRedirectMiddleware canonicalizes the whole business path, so a URL
 * minted here 301s to the aliased form on first request instead of persisting
 * as a duplicate. Making these call sites async to resolve a district doc
 * would push a DB lookup into email and certificate rendering for no gain.
 */
const getDistrictUrlSegment = (business = {}) =>
  slugify(business.masterLocation?.district || "");

/* =========================================================
   Current shape:  /business/:district/:slug-:publicId
========================================================= */

export const buildBusinessDetailsPath = (business = {}) => {
  const districtSlug = getDistrictUrlSegment(business);
  const segment = getBusinessUrlSegment(business);

  // No publicId yet (a document created before the backfill, or the backfill
  // not yet run in this environment) means the new shape cannot be built OR
  // resolved. Fall back to the pre-Phase-B shape, which still redirects.
  if (!districtSlug || !segment) return buildSupersededBusinessDetailsPath(business);

  return `/business/${districtSlug}/${segment}`;
};

export const buildBusinessDetailsUrl = (business = {}) =>
  `${getPublicBaseUrl()}${buildBusinessDetailsPath(business)}`;

/* =========================================================
   Superseded shapes — only for accepting already-issued URLs
========================================================= */

const legacyPathWithSlug = (business = {}, businessSlug = "") =>
  `/business/${getLegacyBusinessLocationSlug(business)}/${businessSlug}/${getBusinessId(business)}`;

const districtPathWithSlug = (business = {}, businessSlug = "") => {
  const districtSlug = getDistrictUrlSegment(business);
  if (!districtSlug) return legacyPathWithSlug(business, businessSlug);

  return `/business/${districtSlug}/${getDistrictBusinessLocationSlug(business)}/${businessSlug}/${getBusinessId(business)}`;
};

export const buildSupersededBusinessDetailsPath = (business = {}) =>
  business.masterLocation?.district
    ? districtPathWithSlug(business, getBusinessSlug(business))
    : legacyPathWithSlug(business, getBusinessSlug(business));

export const buildLegacyBusinessDetailsUrl = (business = {}) =>
  `${getPublicBaseUrl()}${legacyPathWithSlug(business, getBusinessSlug(business))}`;

const normalizeUrl = (value = "") => String(value || "").replace(/\/+$/, "");

/**
 * Whether `value` is a business-profile URL we still consider current for this
 * business — i.e. one that resolves to its detail page (directly or via a 301)
 * and so does not require the QR image to be regenerated.
 *
 * Accepts the current shape plus every superseded one: the four-segment
 * district shape and the three-segment legacy shape, each built with either
 * the current business slug or the pre-fix `businesslists.slug` value.
 *
 * This list only grows. Dropping an entry makes ensureBusinessDetailsQrCode
 * treat every QR carrying that shape as stale and re-render + re-upload it to
 * S3 and re-save the document — ~9.6k of them on next fetch — while the
 * physical printed codes it invalidates were resolving perfectly well.
 */
export const isAcceptedBusinessDetailsUrl = (business = {}, value = "") => {
  const normalized = normalizeUrl(value);
  if (!normalized) return false;

  const baseUrl = getPublicBaseUrl();
  const accepted = [buildBusinessDetailsPath(business)];

  for (const businessSlug of [getBusinessSlug(business), getSupersededBusinessSlug(business)]) {
    accepted.push(districtPathWithSlug(business, businessSlug));
    accepted.push(legacyPathWithSlug(business, businessSlug));
  }

  return accepted.some((path) => normalized === normalizeUrl(`${baseUrl}${path}`));
};
