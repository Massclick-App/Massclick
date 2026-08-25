import { getEffectiveSearchLocation, navigateToSearchResult } from "./searchResultNavigation";

export const readSearchUserDetails = () => {
  try {
    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}") || {};
    return {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email,
    };
  } catch {
    return {};
  }
};

const cleanVoicePart = (value = "") =>
  String(value || "").trim().replace(/\s+/g, " ");

export const parseVoiceSearchTranscript = (transcript = "") => {
  const text = cleanVoicePart(transcript);
  if (!text) return { category: "", location: "" };

  const nearMeMatch = text.match(/^(.*?)\s+(?:near\s+me|nearby)$/i);
  if (nearMeMatch) {
    return { category: cleanVoicePart(nearMeMatch[1]), location: "" };
  }

  const locationMatch = text.match(/^(.*?)\s+(?:in|near|around)\s+(.+)$/i);
  if (locationMatch) {
    const location = cleanVoicePart(locationMatch[2]);
    return {
      category: cleanVoicePart(locationMatch[1]),
      location: /^me$/i.test(location) ? "" : location,
    };
  }

  return { category: text, location: "" };
};

export const submitSearchIntent = ({
  event,
  searchTerm,
  locationName,
  defaultLocation = "Trichy",
  masterLocationSlug = "",
  selectedLocationSlug,
  navigate,
  dispatch,
  setLocationName,
  setCategoryName,
  isKnownCategory = false,
} = {}) => {
  event?.preventDefault?.();

  const searchInput = String(searchTerm || "").trim();
  const locationInput = String(locationName || defaultLocation || "").trim();

  if (!searchInput) {
    return { submitted: false, reason: "missing-search" };
  }

  if (!String(locationName || "").trim() && locationInput) {
    setLocationName?.(locationInput);
  }

  setCategoryName?.(searchInput);

  const effectiveLocation = getEffectiveSearchLocation();
  const explicitMasterLocationSlug = selectedLocationSlug ?? masterLocationSlug;

  navigateToSearchResult({
    ...effectiveLocation,
    searchTerm: searchInput,
    location: locationInput || effectiveLocation.location,
    masterLocationSlug: explicitMasterLocationSlug || effectiveLocation.masterLocationSlug,
    navigate,
    dispatch,
    isKnownCategory,
    logAlreadySent: false,
    userDetails: readSearchUserDetails(),
  });

  return { submitted: true, searchTerm: searchInput, location: locationInput };
};
