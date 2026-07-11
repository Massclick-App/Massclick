/**
 * Centralized navigation handler for SearchResult
 * Ensures all flows to SearchResult have consistent, normalized data
 */

const createSlug = (text = "") => {
  if (!text) return "";
  if (typeof text === "object") {
    text = text.slug || text.name || text.label || "";
  }
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

  navigate(`/${slugLocation}/${slugTerm}`, {
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
  } = locationState;

  const { location: locParam, category: categoryParam, subcategory } = urlParams;

  // Determine if this is a known category or user search
  // If stateCategory is provided, it's a known category (sent as category parameter)
  const isKnownCategory = Boolean(stateCategory);

  // Priority order for determining search term
  const finalSearchTerm =
    stateCategory || // If stateCategory exists, use it
    searchTerm ||
    displayName ||
    categoryName ||
    searchText ||
    category ||
    subcategory ||
    categoryParam ||
    "";

  // Priority order for location
  const finalLocation = location || locParam || "";

  return {
    searchTerm: normalizeSearchTerm(finalSearchTerm),
    location: normalizeSearchTerm(finalLocation),
    masterLocationSlug: String(masterLocationSlug || ""),
    displayName: finalSearchTerm, // Keep original for display
    isKnownCategory, // Flag for API call routing
    results: Array.isArray(results) ? results : null,
    logAlreadySent: Boolean(logAlreadySent),
    userDetails: userDetails || null,
  };
};
