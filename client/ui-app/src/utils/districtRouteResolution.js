import axiosInstance from "../services/axiosInstance.js";

export const formatUrlText = (text = "") =>
  String(text || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const slugFromText = (text = "") =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const resolveDistrictRoute = async ({ district, p2, p3 } = {}) => {
  const params = { district };
  if (p2) params.p2 = p2;
  if (p3) params.p3 = p3;

  const response = await axiosInstance.get("/v2/location/resolve", { params });
  return response.data;
};

export const buildLegacyRouteContext = ({ location, category, subcategory } = {}) => ({
  routeType: subcategory ? "legacySubcategory" : "legacyCategory",
  district: "",
  districtSlug: "",
  districtName: "",
  locationSlug: location || "",
  locationName: formatUrlText(location || ""),
  categorySlug: category || "",
  subcategorySlug: subcategory || "",
  isKnownCategory: !subcategory,
});

export const buildDistrictCategoryContext = ({
  district,
  category,
  subcategory,
  // Defaults to the same "!subcategory" convention every existing caller
  // relies on (a bare category with no subcategory is always a known
  // top-level category by the time it reaches here). Callers passing
  // unverified free text as `category` (e.g. DistrictRouteResolver's
  // genuine-"unknown" fallback) must override this explicitly to false —
  // otherwise the caller downstream would run an exact-category match
  // against text that was never confirmed to BE a category.
  isKnownCategory = !subcategory,
} = {}) => {
  const context = {
    routeType: subcategory ? "districtSubcategory" : "districtCategory",
    districtSlug: district?.slug || "",
    districtName: district?.name || formatUrlText(district?.slug || ""),
    locationSlug: "",
    // Intentionally NOT blanked to match locationSlug's emptiness: this is
    // not "the name of the resolved location" (there isn't one), it's the
    // display fallback for "no specific location, browsing the whole
    // district" — CategoryRouter's overrideLocation prop reads it directly
    // for exactly that. Blanking it would blank the location field on every
    // ordinary district-wide category page (e.g. /trichy/hotels), not just
    // the "unknown"/"unresolvedLocation" fallback paths this field was
    // scrutinized for. The asymmetry with locationSlug is by design; what
    // must NOT happen is pairing this locationName with a locationSlug from
    // an unrelated source (e.g. stale navigation state) as if the two
    // described the same resolved location — see extractSearchResultData in
    // searchResultNavigation.js, which is where that pairing is guarded.
    locationName: district?.name || formatUrlText(district?.slug || ""),
    categorySlug: category || "",
    subcategorySlug: subcategory || "",
    isKnownCategory,
  };
  return context;
};

export const buildLocationCategoryContext = ({
  district,
  location,
  category,
  subcategory,
  routeType = subcategory ? "locationSubcategory" : "locationCategory",
} = {}) => {
  const context = {
    routeType,
    districtSlug: district?.slug || "",
    districtName: district?.name || formatUrlText(district?.slug || ""),
    locationSlug: location?.slug || "",
    locationName: location?.name || formatUrlText(location?.slug || ""),
    categorySlug: category || "",
    subcategorySlug: subcategory || "",
    isKnownCategory: !subcategory,
  };
  return context;
};
