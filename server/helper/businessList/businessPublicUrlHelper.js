import { slugify } from "../../slugify.js";
import { getBusinessUrlSlug } from "./businessUrl.js";

export const getPublicBaseUrl = () =>
  String(process.env.PUBLIC_BASE_URL || "https://massclick.in").replace(/\/+$/, "");

export const getBusinessId = (business = {}) =>
  business?._id?.toString?.() || business?._id || business?.id || "";

export const getBusinessSlug = (business = {}) => getBusinessUrlSlug(business);

/**
 * The business-slug segment as it was built BEFORE the businessName fix: read
 * `businesslists.slug` first, which holds category or SEO title text rather
 * than the business's own name (see businessUrl.js). Nothing mints URLs this
 * way any more.
 *
 * Kept solely so QR images already generated, uploaded, and physically printed
 * still count as current in isAcceptedBusinessDetailsUrl. Without it,
 * ensureBusinessDetailsQrCode would treat every stored `qrText` as stale and
 * re-render + re-upload a QR to S3 and re-save the doc for all ~9.6k
 * businesses on their next fetch. The canonical redirect in
 * legacyUrlRedirectMiddleware.js 301s these URLs to the current shape, so the
 * printed codes keep resolving.
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

const legacyPathWithSlug = (business = {}, businessSlug = "") =>
  `/business/${getLegacyBusinessLocationSlug(business)}/${businessSlug}/${getBusinessId(business)}`;

const districtPathWithSlug = (business = {}, businessSlug = "") => {
  const districtSlug = slugify(business.masterLocation?.district || "");
  if (!districtSlug) return legacyPathWithSlug(business, businessSlug);

  return `/business/${districtSlug}/${getDistrictBusinessLocationSlug(business)}/${businessSlug}/${getBusinessId(business)}`;
};

export const buildLegacyBusinessDetailsPath = (business = {}) =>
  legacyPathWithSlug(business, getBusinessSlug(business));

export const buildDistrictBusinessDetailsPath = (business = {}) =>
  districtPathWithSlug(business, getBusinessSlug(business));

export const buildBusinessDetailsPath = (business = {}) =>
  business.masterLocation?.district
    ? buildDistrictBusinessDetailsPath(business)
    : buildLegacyBusinessDetailsPath(business);

export const buildBusinessDetailsUrl = (business = {}) =>
  `${getPublicBaseUrl()}${buildBusinessDetailsPath(business)}`;

export const buildLegacyBusinessDetailsUrl = (business = {}) =>
  `${getPublicBaseUrl()}${buildLegacyBusinessDetailsPath(business)}`;

const normalizeUrl = (value = "") => String(value || "").replace(/\/+$/, "");

/**
 * Whether `value` is a business-profile URL we still consider current for this
 * business — i.e. one that resolves to its detail page without needing the QR
 * image regenerated.
 *
 * Accepts both URL shapes (district-prefixed and legacy two-segment) built
 * with either the current or the superseded business slug. New QRs are always
 * minted from buildBusinessDetailsUrl; the extra forms here only stop already
 * printed codes from being treated as stale.
 */
export const isAcceptedBusinessDetailsUrl = (business = {}, value = "") => {
  const normalized = normalizeUrl(value);
  if (!normalized) return false;

  const baseUrl = getPublicBaseUrl();
  return [getBusinessSlug(business), getSupersededBusinessSlug(business)].some(
    (businessSlug) =>
      normalized === normalizeUrl(`${baseUrl}${districtPathWithSlug(business, businessSlug)}`) ||
      normalized === normalizeUrl(`${baseUrl}${legacyPathWithSlug(business, businessSlug)}`),
  );
};
