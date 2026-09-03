// Single source of truth for turning the messy stored address fields of a
// business into something readable.
//
// The stored data is dirty in ways that are cheap to describe and expensive to
// ignore (measured across 10,883 dev records): 47% of `plotNumber` values are
// junk placeholders, 35% of `street` values already repeat the district, 29%
// already end with the locality, 25% carry a trailing comma, and 4% have the
// full "…, Tamil Nadu 620007" Google suffix pasted in. Composing the fields
// naively — as `[plotNumber, street, location].join(", ")` did — produces
// "42, 42, Mullai Nagar, Thendral Nagar, Trichy".
//
// These rules are deliberately pure and dependency-free so the database
// normalization pass can import the same functions and produce byte-identical
// output to what the UI renders. If a rule changes here it must change for
// both; that is the point of this file.

// Values that mean "nothing was entered". They reach the database from two
// places: operators typing a dash, and an admin-grid round-trip that wrote its
// own "-" display placeholder back into the record.
const JUNK_VALUES = new Set([
  "",
  "-",
  "--",
  "---",
  ".",
  ",",
  "n/a",
  "na",
  "nil",
  "none",
  "null",
  "undefined",
]);

const isJunk = (value) => JUNK_VALUES.has(String(value ?? "").trim().toLowerCase());

// Trim, collapse runs of whitespace, drop empty comma segments, and strip
// leading/trailing punctuation. Applied to every field before anything else
// looks at it.
const tidy = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/(?:,\s*)+/g, ", ")
    .replace(/^[\s,.-]+/, "")
    .replace(/[\s,.-]+$/, "")
    .trim();

const clean = (value) => {
  const tidied = tidy(value);
  return isJunk(tidied) ? "" : tidied;
};

// Compare two address segments for "is this the same place". Case, spacing and
// punctuation all vary between operators ("K.K. Nagar" / "KK Nagar" / "k k
// nagar"), so identity has to be checked on a flattened form.
const flatten = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const escapeRegExp = (value) => String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sameSegment = (a, b) => {
  const fa = flatten(a);
  const fb = flatten(b);
  return fa.length > 0 && fa === fb;
};

// Is this whole comma segment just the plot number repeated?
//
// Only the comma-delimited form is treated as a duplicate. The space-separated
// form ("9/21 MANICKKAPURAM", "No 103 C") was tried and deliberately rejected:
// it cannot be told apart from a street whose name legitimately begins with a
// number. Stripping it turned "1st Floor, Phase 1" into "Floor, Phase 1",
// "17 street, Kamaraja Puram" into "street, Kamaraja Puram", and orphaned the
// "C" of a "No 103 C" door number - 22 records, several of them mangled.
// Those are left for a human to correct.
//
// @returns {string|null} "" if the segment is nothing but the plot number,
//   or null if it should be left alone.
const stripPlotPrefix = (segment, plot) => (sameSegment(segment, plot) ? "" : null);

const splitSegments = (value) =>
  clean(value)
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment && !isJunk(segment));

// Trailing noise that belongs to a postal address but not to a search card:
// the state, the country, and the pincode — all of which we either already
// know or deliberately omit.
const isNoiseSegment = (segment, pincode) => {
  const flat = flatten(segment);
  if (!flat) return true;
  if (flat === "tamilnadu" || flat === "tn" || flat === "india") return true;
  // A bare pincode, or the "Trichy-620007" / "620007, India" shapes.
  if (/^\d{6}$/.test(flat)) return true;
  if (pincode && flat === flatten(pincode)) return true;
  return false;
};

// Strip the "…, Tiruchirappalli, Tamil Nadu 620007" tail that gets pasted in
// from Google's formatted_address, plus any bare pincode left inline.
const stripPostalNoise = (segments, pincode) =>
  segments
    // Remove the pincode FIRST, then test for noise. Order matters: the
    // pasted Google tail arrives as one segment, "Tamil Nadu 620007", which
    // only looks like the state once its digits are gone. Filtering first
    // left a bare "Tamil Nadu" behind.
    .map((segment) =>
      // "Trichy-620007" -> "Trichy": the pincode is glued to the town with a dash.
      clean(segment.replace(/[-–—]\s*\d{6}\b/g, "").replace(/\b\d{6}\b/g, "")),
    )
    .filter(Boolean)
    .filter((segment) => !isNoiseSegment(segment, pincode));

/**
 * The street-level part of the address: plot number plus street, with the
 * plot number de-duplicated against the head of the street (3.6% of records
 * store "42" and "42, Mullai Nagar, …") and postal noise removed.
 */
export const formatStreetDetail = (business = {}) => {
  const plot = clean(business?.plotNumber);
  const streetSegments = stripPostalNoise(splitSegments(business?.street), clean(business?.pincode));

  const segments = [...streetSegments];

  if (plot) {
    // Drop the plot number from the head of the street when it is repeated
    // there, then prepend it once. Anywhere else in the street is left alone —
    // "Muthaiya mahal, 63, Wireless Rd" is legitimately different from a
    // duplicated prefix.
    const trimmed = segments.length > 0 ? stripPlotPrefix(segments[0], plot) : null;
    if (trimmed !== null) {
      if (trimmed === "") segments.shift();
      else segments[0] = trimmed;
    }
    segments.unshift(plot);
  }

  return dedupeSegments(segments).join(", ");
};

// Drop a segment that repeats one already present. Keeps the first occurrence
// so the more specific, earlier part of the address survives.
const dedupeSegments = (segments) => {
  const seen = new Set();
  const kept = [];
  for (const segment of segments) {
    const key = flatten(segment);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    kept.push(segment);
  }
  return kept;
};

/**
 * The locality label for a business, taken from the resolved masterlocations
 * hierarchy rather than the free-text `location` field. `location` holds a
 * district/town label ("Trichy") and is inconsistent even within one district,
 * so it is not used for display at all.
 */
export const getLocalityLabel = (business = {}) => {
  const master = business?.masterLocation || {};
  return clean(master.locality) || clean(master.ward) || clean(master.zone) || "";
};

export const getDistrictLabel = (business = {}) =>
  clean(business?.masterLocation?.district) || "";

const DEFAULT_MAX_LENGTH = 60;
// A search card shows the area, not the doorstep: the last two parts only.
const CARD_SEGMENT_LIMIT = 2;
const CONTAINS_DIGIT = /\d/;
const ELLIPSIS = "…";

/**
 * Build the address shown on a search-result card.
 *
 * The string is assembled from the BACK. The tail — locality, the location the
 * user searched for, and the district — is what makes a result feel local and
 * relevant, so it is reserved first and always survives. Street detail is then
 * prepended with whatever character budget is left, and is truncated from the
 * left if it does not fit. Truncating the other way round would drop exactly
 * the part worth keeping: 31% of composed addresses exceed 80 characters, so
 * this is the common case, not the edge case.
 *
 * @param {object} business          the business record
 * @param {object} [options]
 * @param {string} [options.searchedLocation]  what the user searched for; included
 *   only when it adds something the locality and district do not already say
 * @param {number} [options.maxLength]
 * @returns {string} the formatted address, or "" when nothing usable is stored
 */
export const formatBusinessAddress = (business = {}, options = {}) => {
  const { searchedLocation = "", maxLength = DEFAULT_MAX_LENGTH } = options;

  const locality = getLocalityLabel(business);
  const district = getDistrictLabel(business);
  const searched = clean(searchedLocation);

  // Tail, left to right: locality, then what was searched for, then district.
  // dedupeSegments drops the searched term when it repeats the locality or the
  // district, and drops the district when the business resolved only that far
  // (797 records resolve to district level, where locality === district).
  const tail = dedupeSegments([locality, searched, district].filter(Boolean));

  // The searched location is only worth showing when it sits inside this
  // business's own hierarchy. Searching "palpannai junction" and seeing it
  // appended to a K.K. Nagar business would be actively misleading.
  const hierarchy = business?.masterLocation || {};
  const belongsToHierarchy = (value) =>
    [hierarchy.locality, hierarchy.ward, hierarchy.zone, hierarchy.district, hierarchy.state].some(
      (level) => sameSegment(level, value),
    );

  const tailSegments = tail.filter(
    (segment) => segment !== searched || belongsToHierarchy(searched),
  );

  const streetDetail = formatStreetDetail(business);

  // Street segments the tail is about to state anyway: 29% of stored streets
  // already end with the locality and 35% carry the district somewhere.
  const streetSegments = (streetDetail ? streetDetail.split(", ") : []).filter(
    (segment) =>
      !tailSegments.some((tailSegment) => sameSegment(tailSegment, segment)) &&
      // A card names an area, not a doorstep. Door and plot numbers, floor
      // numbers and plus-codes are noise at this size and are dropped outright
      // — the full address including them is on the detail page. Only street
      // detail is filtered this way; locality and district come from the
      // resolved hierarchy and are kept whatever they contain.
      !CONTAINS_DIGIT.test(segment),
  );

  // Only the last two parts are shown: the area and the district. Everything
  // more specific is detail the reader cannot use from a result list, and
  // keeping it made cards ragged and pushed the locality out of view.
  const kept = [...streetSegments, ...tailSegments].slice(-CARD_SEGMENT_LIMIT);

  // Last resort. A handful of records hold nothing but a door number and the
  // legacy free-text `location` — filtering the number away would leave the
  // card with no location at all, which is worse than a coarse one. This is
  // the only place `location` is read, and only when there is no alternative.
  if (kept.length === 0) return clean(business?.location);

  return truncateSegments(kept, maxLength);
};

// Fit street segments into a character budget by dropping them from the RIGHT.
//
// A street reads most-specific to least-specific — "42, Mullai Nagar, Thendral
// Nagar" — so its right-hand segments are the broad area names that the tail's
// locality and district are about to state anyway, while the left-hand head is
// the door or building number, the one part of the string that is unique to
// this business. Dropping from the left would discard exactly that.
const truncateSegments = (segments, budget) => {
  let kept = segments;
  while (kept.length > 1 && kept.join(", ").length > budget) {
    kept = kept.slice(0, -1);
  }

  const text = kept.join(", ");
  if (text.length <= budget) return text;
  // A single segment still over budget: cut mid-word as a last resort.
  if (budget <= ELLIPSIS.length) return "";
  return `${text.slice(0, budget - ELLIPSIS.length).replace(/[\s,]+$/, "")}${ELLIPSIS}`;
};

/**
 * The full address for a business detail page: everything that is stored,
 * cleaned and de-duplicated, with no length budget.
 */
export const formatFullBusinessAddress = (business = {}) => {
  const streetDetail = formatStreetDetail(business);
  const locality = getLocalityLabel(business);
  const district = getDistrictLabel(business);
  const pincode = clean(business?.pincode);

  const segments = dedupeSegments(
    [...(streetDetail ? streetDetail.split(", ") : []), locality, district].filter(Boolean),
  );

  if (segments.length === 0) return "";
  const base = segments.join(", ");
  return /^\d{6}$/.test(pincode) ? `${base} - ${pincode}` : base;
};

/**
 * Years in business, as a plain number string.
 *
 * The field is free text and 1,638 records hold something that is not a number:
 * "++" (752) and "+" (491) are placeholders that rendered as the literal
 * "+++ Years in Business" on the card, and "10+" style values carry a suffix
 * the UI adds itself. Anything without digits returns null so the caller can
 * omit the row entirely rather than print a placeholder.
 *
 * @returns {string|null}
 */
export const formatExperience = (experience) => {
  const raw = String(experience ?? "").trim();
  if (!raw || isJunk(raw)) return null;

  const match = raw.match(/\d+/);
  if (!match) return null;

  const years = Number.parseInt(match[0], 10);
  // Above this the value is a phone number or a founding year ("2015"), not a
  // duration. The bound is 200 rather than 100 because genuinely old businesses
  // are in the data — a Bosch store at 140 years and a post office at 150.
  if (!Number.isFinite(years) || years <= 0 || years > 200) return null;

  return String(years);
};

/**
 * Tidy a single stored address field: trim, collapse whitespace and repeated
 * commas, drop surrounding punctuation, and turn a placeholder into "". Used by
 * the entry form on blur and by the database normalization pass, so a field
 * cleaned in the browser and one cleaned in the script come out identical.
 */
export const normalizeAddressField = (value) => clean(value);

/**
 * Remove a plot number that the street repeats at its head, for STORAGE.
 *
 * `formatStreetDetail` already hides this duplication when rendering, but the
 * two fields still hold it — "42" and "42, Mullai Nagar, Thendral Nagar" — so
 * anything reading the raw fields sees it. This returns the street with that
 * leading segment removed.
 *
 * Two cases deliberately return null (leave the record alone):
 *
 *  - the plot number appears somewhere OTHER than the head. "Muthaiya mahal,
 *    63, Wireless Rd" with plot "63" is a real address, not a duplication.
 *  - removing it would empty the street. A handful of records hold an entire
 *    address in `plotNumber` with `street` set to the same text; deciding which
 *    field should survive is a judgement call, not a cleanup.
 *
 * @returns {string|null} the corrected street, or null when nothing should change
 */
export const stripLeadingPlotFromStreet = (plotNumber, street) => {
  const plot = clean(plotNumber);
  if (!plot) return null;

  const segments = splitSegments(street);
  if (segments.length === 0) return null;

  const trimmed = stripPlotPrefix(segments[0], plot);
  if (trimmed === null) return null;

  const remaining = trimmed === "" ? segments.slice(1) : [trimmed, ...segments.slice(1)];
  if (remaining.length === 0) return null;

  return remaining.join(", ");
};

// Exported for the entry form's inline warnings and for the database
// normalization pass, which reports on the same conditions.
export const getAddressWarnings = (business = {}) => {
  const warnings = [];
  const street = String(business?.street ?? "");
  const cleanStreet = clean(street);
  const plot = clean(business?.plotNumber);
  const pincode = clean(business?.pincode);
  const district = getDistrictLabel(business);
  const add = (field, level, message) => warnings.push({ field, level, message });

  // The single highest-value check. Without a linked location the card cannot
  // name the locality, which is most of what a search result shows.
  if (!business?.masterLocation?.locationId && !getLocalityLabel(business)) {
    add(
      "masterLocation",
      "error",
      "No verified location linked. Search for the area above — without it the listing cannot show which locality it is in.",
    );
  }

  if (!cleanStreet) {
    add("street", "error", "Street is empty. Add the street, area or a nearby landmark.");
  }

  if (plot && sameSegment(splitSegments(street)[0], plot)) {
    add("street", "warn", "The street repeats the plot number. Remove it here — it has its own field.");
  }
  if (/tamil\s*nadu|india/i.test(street)) {
    add("street", "warn", "Remove the state and country. Only the street and area belong here.");
  }
  if (pincode && street.includes(pincode)) {
    add("street", "warn", "Remove the pincode from the street — it has its own field.");
  }
  if (
    district &&
    new RegExp(`\\b${escapeRegExp(district)}\\b`, "i").test(street)
  ) {
    add("street", "warn", `Remove "${district}" — the district is added automatically.`);
  }
  if (street !== cleanStreet && cleanStreet) {
    add("street", "info", "Stray spaces or commas will be tidied up when you move on.");
  }
  if (cleanStreet.length > 120) {
    add("street", "warn", "This is very long. Keep the street, area and one landmark; drop the rest.");
  }

  // A plot number is a door or shop number. Several commas means a whole
  // address was pasted into the wrong field.
  if (plot && plot.split(",").length > 2) {
    add("plotNumber", "warn", "This looks like a full address. Keep only the door, shop or plot number.");
  }

  if (!pincode) {
    add("pincode", "error", "Pincode is required.");
  } else if (!/^\d{6}$/.test(pincode)) {
    add("pincode", "error", "Pincode must be exactly 6 digits.");
  }

  const experienceRaw = String(business?.experience ?? "").trim();
  if (experienceRaw && formatExperience(experienceRaw) === null) {
    add("experience", "warn", "Enter a number of years, or leave this blank. Text here is not shown.");
  }

  return warnings;
};

