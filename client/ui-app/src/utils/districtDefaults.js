// Canonical fallback when nothing is saved yet and geolocation is
// unavailable/denied — must match a real `district` value in masterlocations
// (see server/helper/location/masterLocationHelper.js) so it lines up with
// the storefront's district dropdown, which only lists real DB values.
export const DEFAULT_DISTRICT = "Tiruchirappalli";

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\bdistrict\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Google's reverse-geocode result ("Tiruchirappalli District", stray
// spacing, etc.) rarely matches a masterlocations `district` value
// character-for-character. Resolves it to the real dropdown option instead
// of silently falling through to DEFAULT_DISTRICT on a near-miss.
export const matchCanonicalDistrict = (detected, districtList) => {
  const target = normalize(detected);
  if (!target || !Array.isArray(districtList) || districtList.length === 0) return null;

  const exact = districtList.find((d) => normalize(d) === target);
  if (exact) return exact;

  const partial = districtList.find((d) => {
    const canonical = normalize(d);
    return canonical && (target.includes(canonical) || canonical.includes(target));
  });
  return partial || null;
};
