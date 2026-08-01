/**
 * Centralized navigation handler for SearchResult
 * Ensures all flows to SearchResult have consistent, normalized data
 */

const DISTRICT_SLUG_ALIASES = {
  tiruchirappalli: "trichy",
  tiruchirapalli: "trichy",
  tiruchy: "trichy",
  trichy: "trichy",
};

export const createSlug = (text = "") => {
  if (!text) return "";
  if (typeof text === "object") {
    text = text.slug || text.name || text.district || text.label || "";
  }
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

export const createDistrictSlug = (value = "") => {
  const raw =
    typeof value === "object"
      ? value.districtSlug || value.urlAlias || value.district || value.name || value.label || ""
      : value;
  const slug = createSlug(raw);
  return DISTRICT_SLUG_ALIASES[slug] || slug;
};

export const getLocationName = (value = "") => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.name || value.location || value.district || value.label || "";
};

export const getLocationContext = (value = {}) => {
  const name = getLocationName(value);
  const districtName =
    typeof value === "object"
      ? value.districtName || value.district || name
      : name;
  const districtSlug =
    (typeof value === "object" && (value.districtSlug || value.urlAlias)) ||
    localStorage.getItem("selectedLocationDistrictSlug") ||
    localStorage.getItem("selectedDistrictSlug") ||
    createDistrictSlug(districtName);

  return {
    name,
    districtName,
    districtSlug: createDistrictSlug(districtSlug),
    locationSlug:
      (typeof value === "object" && (value.publicLocationSlug || value.locationSlug)) ||
      localStorage.getItem("selectedPublicLocationSlug") ||
      "",
    masterLocationSlug:
      (typeof value === "object" && (value.masterLocationSlug || value.slug)) ||
      localStorage.getItem("selectedLocationSlug") ||
      "",
  };
};

export const buildCategoryPath = ({
  districtSlug = "",
  locationSlug = "",
  location = "",
  category,
  categorySlug,
  subcategory,
  subcategorySlug,
  isDistrictScope = false,
} = {}) => {
  const resolvedDistrictSlug = createDistrictSlug(districtSlug);
  const resolvedLocationSlug = createSlug(locationSlug || location);
  const resolvedCategorySlug = createSlug(categorySlug || category);
  const resolvedSubcategorySlug = createSlug(subcategorySlug || subcategory);
  if (!resolvedCategorySlug) return "/";

  if (resolvedDistrictSlug) {
    const segments = isDistrictScope
      ? [resolvedDistrictSlug, resolvedCategorySlug, resolvedSubcategorySlug]
      : [resolvedDistrictSlug, resolvedLocationSlug, resolvedCategorySlug, resolvedSubcategorySlug];
    return `/${segments.filter(Boolean).join("/")}`;
  }

  const legacyLocationSlug = resolvedLocationSlug;
  return `/${[legacyLocationSlug, resolvedCategorySlug, resolvedSubcategorySlug].filter(Boolean).join("/")}`;
};

export const buildBusinessPath = ({
  districtSlug = "",
  locationSlug = "",
  location = "",
  businessSlug,
  businessName,
  id,
} = {}) => {
  const resolvedDistrictSlug = createDistrictSlug(districtSlug);
  const resolvedLocationSlug = createSlug(locationSlug || location) || "business";
  const resolvedBusinessSlug = createSlug(businessSlug || businessName) || "profile";
  const segments = resolvedDistrictSlug
    ? ["business", resolvedDistrictSlug, resolvedLocationSlug, resolvedBusinessSlug, id]
    : ["business", resolvedLocationSlug, resolvedBusinessSlug, id];
  return `/${segments.filter(Boolean).join("/")}`;
};

/**
 * Normalize search term
 * @param {string} text - Text to normalize
 * @returns {string} - Normalized text
 */
export const normalizeSearchTerm = (text = "") => {
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ");
};

/**
 * The effective place to search when the user activates a homepage entry
 * point (featured service, popular category, trending chip, tourist card…).
 * Returns the specific location the user typed/picked in the location field
 * when there is one, otherwise the selected district scope. Mirrors the search
 * bar's own fallback so clicking a card and searching the same picked location
 * from the bar land on the same results page — instead of a card click always
 * using the district and ignoring the location the user actually chose.
 *
 * @param {string|Object} districtFallback - Current district scope
 *   (locationReducer.selectedDistrict); used only when no location is set.
 * @returns {{ location: string, masterLocationSlug: string }}
 */
export const getEffectiveSearchLocation = (districtFallback = "") => {
  const selectedLocation = localStorage.getItem("selectedLocation") || "";
  const fallbackContext = getLocationContext(districtFallback);
  const selectedPublicLocationSlug = localStorage.getItem("selectedPublicLocationSlug") || "";
  const selectedMasterLocationSlug = localStorage.getItem("selectedLocationSlug") || "";
  const hasVerifiedLocation = Boolean(selectedPublicLocationSlug || selectedMasterLocationSlug);
  const location =
    selectedLocation ||
    fallbackContext.name ||
    localStorage.getItem("selectedDistrict") ||
    "Global";
  const districtName =
    localStorage.getItem("selectedLocationDistrict") ||
    fallbackContext.districtName ||
    location;
  const districtSlug =
    localStorage.getItem("selectedLocationDistrictSlug") ||
    fallbackContext.districtSlug ||
    createDistrictSlug(districtName);

  return {
    location,
    // The canonical slug belongs to a picked verified location only; never
    // pair it with a district fallback, or an empty field would search the
    // wrong node.
    masterLocationSlug: hasVerifiedLocation ? selectedMasterLocationSlug : "",
    locationSlug: hasVerifiedLocation ? selectedPublicLocationSlug || createSlug(location) : "",
    districtName,
    districtSlug,
    isDistrictScope: !hasVerifiedLocation,
  };
};

/**
 * Navigate to SearchResult with normalized data
 * @param {Object} config - Configuration object
 * @param {string} config.searchTerm - The search term or category name
 * @param {string} config.location - Location/district
 * @param {Function} config.navigate - React Router navigate function
 * @param {Function} config.dispatch - Redux dispatch function
 * @param {boolean} config.isKnownCategory - If TRUE: send as category (exact match). If FALSE: send as term (flexible search)
 * @param {Array} config.results - Optional: Pre-fetched results
 * @param {boolean} config.logAlreadySent - Optional: Whether logging was already done
 * @param {Object} config.userDetails - Optional: User details for logging
 */
export const navigateToSearchResult = ({
  searchTerm,
  location,
  districtSlug = "",
  districtName = "",
  locationSlug = "",
  isDistrictScope = false,
  // Canonical masterlocations slug (e.g. "tamil-nadu-salem-mettur") from a
  // verified-location pick. Sent to the search API instead of the free text,
  // so ambiguous names (two "Puthur"s) hit the exact node the user chose.
  masterLocationSlug = "",
  navigate,
  dispatch,
  isKnownCategory = false,
  results = null,
  logAlreadySent = false,
  userDetails = null,
}) => {
  if (!searchTerm || !location || !navigate) {
    return;
  }

  // Normalize inputs
  const normalizedTerm = normalizeSearchTerm(searchTerm);
  const normalizedLocation = normalizeSearchTerm(location);
  const slugLocation = createSlug(normalizedLocation);
  const slugTerm = createSlug(normalizedTerm);

  // Consistent state structure for all SearchResult flows
  const navigationState = {
    // Location - normalized
    location: normalizedLocation,

    // Canonical location slug from a verified pick ("" when typed freely)
    masterLocationSlug,
    districtSlug,
    districtName,
    locationSlug,
    locationName: location,
    isKnownCategory,

    // Display name - use raw input for UI display
    displayName: searchTerm,

    // Category name - preserve actual category name (not slug)
    categoryName: searchTerm,

    // API Parameters:
    // If isKnownCategory: send as 'category' for exact match
    // If !isKnownCategory: send as 'term' for flexible search
    ...(isKnownCategory
      ? { category: normalizedTerm }
      : { searchTerm: normalizedTerm }),

    // Pre-fetched results if available
    ...(results && { results }),

    // Logging state
    logAlreadySent,

    // Optional user details for delayed logging
    ...(userDetails && { userDetails }),

    // Timestamp for cache validation
    timestamp: Date.now(),
  };

  const targetPath = buildCategoryPath({
    districtSlug,
    locationSlug,
    location: normalizedLocation,
    categorySlug: slugTerm,
    isDistrictScope,
  });

  navigate(targetPath || `/${slugLocation}/${slugTerm}`, {
    state: navigationState,
  });
};

/**
 * Extract and normalize SearchResult data from navigation state
 * Works with any incoming state structure and normalizes it
 * @param {Object} locationState - React Router location.state
 * @param {Object} urlParams - URL parameters from useParams
 * @returns {Object} - Normalized search data
 */
export const extractSearchResultData = (locationState = {}, urlParams = {}) => {
  const {
    searchTerm,
    location,
    masterLocationSlug = "",
    displayName,
    category: stateCategory,
    results = null,
    logAlreadySent = false,
    userDetails = null,
    // Legacy field names for backward compatibility
    category,
    categoryName,
    searchText,
    isKnownCategory: stateKnownCategory,
    district,
    districtSlug: stateDistrictSlug,
    districtName: stateDistrictName,
    locationSlug: stateLocationSlug,
    locationName: stateLocationName,
  } = locationState;

  const {
    district: districtParam,
    districtSlug: paramDistrictSlug,
    districtName: paramDistrictName,
    location: locParam,
    locationSlug: paramLocationSlug,
    locationName: paramLocationName,
    category: categoryParam,
    categorySlug: paramCategorySlug,
    subcategory,
    subcategorySlug: paramSubcategorySlug,
    isKnownCategory: routeKnownCategory,
  } = urlParams;

  // Route-resolved (param*) wins over navigation state (state*) when both are
  // present and disagree. `state` is populated by whatever component called
  // navigate() as a hand-off optimization to skip a redundant API call — it
  // can go stale (e.g. carrying a pre-migration district name someone typed
  // into a search bar long before the district-prefixed URL scheme existed).
  // `param*` on a district-prefixed URL comes from a live resolution against
  // the current masterlocation data (DistrictRouteResolver's
  // /v2/location/resolve call), so it is always at least as fresh. This still
  // falls through to `state*` unchanged for legacy free-text-search
  // navigations that have no district URL segment to resolve at all — those
  // leave param* empty, so state* is used exactly as before.
  const finalDistrictSlug = String(
    paramDistrictSlug || districtParam || stateDistrictSlug || district || ""
  );
  const finalDistrictName =
    paramDistrictName ||
    stateDistrictName ||
    (finalDistrictSlug ? finalDistrictSlug : "");
  const routeLocationSlug = String(
    paramLocationSlug || locParam || stateLocationSlug || ""
  );
  const routeLocationName =
    paramLocationName ||
    stateLocationName ||
    (routeLocationSlug ? routeLocationSlug : "");
  console.log("[DistrictNameDebug] extractSearchResultData (post-fix: param* now wins over state*)", {
    stateDistrictName,
    paramDistrictName,
    finalDistrictSlug,
    finalDistrictName,
    stateLocationName,
    paramLocationName,
    routeLocationName,
    rawLocationState: locationState,
    rawUrlParams: urlParams,
  });
  const categorySlug = paramCategorySlug || categoryParam || "";
  const subcategorySlug = paramSubcategorySlug || subcategory || "";

  // Determine if this is a known category or user search
  // If stateCategory is provided, it's a known category (sent as category parameter)
  const isKnownCategory = Boolean(stateCategory || stateKnownCategory || routeKnownCategory);

  // Priority order for determining search term
  const finalSearchTerm =
    stateCategory || // If stateCategory exists, use it
    searchTerm ||
    displayName ||
    categoryName ||
    searchText ||
    category ||
    subcategorySlug ||
    categorySlug ||
    "";

  // Priority order for location
  const finalLocation =
    location ||
    routeLocationName ||
    (finalDistrictSlug ? finalDistrictName : "") ||
    "";

  return {
    searchTerm: normalizeSearchTerm(finalSearchTerm),
    location: normalizeSearchTerm(finalLocation),
    masterLocationSlug: String(masterLocationSlug || ""),
    districtSlug: finalDistrictSlug,
    districtName: finalDistrictName,
    routeLocationSlug,
    routeLocationName,
    categorySlug,
    subcategorySlug,
    displayName: finalSearchTerm, // Keep original for display
    isKnownCategory, // Flag for API call routing
    results: Array.isArray(results) ? results : null,
    logAlreadySent: Boolean(logAlreadySent),
    userDetails: userDetails || null,
  };
};
