import { slugify } from "../../slugify.js";

export const getPublicBaseUrl = () =>
  String(process.env.PUBLIC_BASE_URL || "https://massclick.in").replace(/\/+$/, "");

export const getBusinessId = (business = {}) =>
  business?._id?.toString?.() || business?._id || business?.id || "";

export const getBusinessSlug = (business = {}) =>
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

export const buildLegacyBusinessDetailsPath = (business = {}) => {
  const businessId = getBusinessId(business);
  return `/business/${getLegacyBusinessLocationSlug(business)}/${getBusinessSlug(business)}/${businessId}`;
};

export const buildDistrictBusinessDetailsPath = (business = {}) => {
  const districtSlug = slugify(business.masterLocation?.district || "");
  if (!districtSlug) return buildLegacyBusinessDetailsPath(business);

  return `/business/${districtSlug}/${getDistrictBusinessLocationSlug(business)}/${getBusinessSlug(business)}/${getBusinessId(business)}`;
};

export const buildBusinessDetailsPath = (business = {}) =>
  business.masterLocation?.district
    ? buildDistrictBusinessDetailsPath(business)
    : buildLegacyBusinessDetailsPath(business);

export const buildBusinessDetailsUrl = (business = {}) =>
  `${getPublicBaseUrl()}${buildBusinessDetailsPath(business)}`;

export const buildLegacyBusinessDetailsUrl = (business = {}) =>
  `${getPublicBaseUrl()}${buildLegacyBusinessDetailsPath(business)}`;

const normalizeUrl = (value = "") => String(value || "").replace(/\/+$/, "");

export const isAcceptedBusinessDetailsUrl = (business = {}, value = "") => {
  const normalized = normalizeUrl(value);
  return (
    normalized === normalizeUrl(buildBusinessDetailsUrl(business)) ||
    normalized === normalizeUrl(buildLegacyBusinessDetailsUrl(business))
  );
};
