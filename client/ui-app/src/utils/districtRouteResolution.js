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
} = {}) => ({
  routeType: subcategory ? "districtSubcategory" : "districtCategory",
  districtSlug: district?.slug || "",
  districtName: district?.name || formatUrlText(district?.slug || ""),
  locationSlug: "",
  locationName: district?.name || formatUrlText(district?.slug || ""),
  categorySlug: category || "",
  subcategorySlug: subcategory || "",
  isKnownCategory: !subcategory,
});

export const buildLocationCategoryContext = ({
  district,
  location,
  category,
  subcategory,
  routeType = subcategory ? "locationSubcategory" : "locationCategory",
} = {}) => ({
  routeType,
  districtSlug: district?.slug || "",
  districtName: district?.name || formatUrlText(district?.slug || ""),
  locationSlug: location?.slug || "",
  locationName: location?.name || formatUrlText(location?.slug || ""),
  categorySlug: category || "",
  subcategorySlug: subcategory || "",
  isKnownCategory: !subcategory,
});
