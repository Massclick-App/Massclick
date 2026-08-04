import { classifyLocationRouteSegments } from "./locationUrl.js";

// Disambiguates the one ambiguous URL shape in the district-prefixed scheme:
// /:district/:p2/:p3 is syntactically identical whether it means
// "district-wide category + subcategory" (/trichy/hotels/luxury-hotels) or
// "locality-specific category" (/trichy/srirangam/hotels) — segment position
// alone cannot tell them apart. Kept in its own file rather than folded into
// locationResolver.js: it composes BOTH location and category data, and
// locationResolver.js is otherwise category-agnostic — no circular import
// risk today (verified: category/categoryModel.js has no location imports),
// but keeping the two domains apart here is also just the more honest shape
// of what this function actually does.
//
// MUST be used identically on the client and the server — see
// client/ui-app/src/utils/breadcrumbs.js's header comment for why this is a
// duplicated-by-convention pair, not a shared package.

// A top-level category is one that isn't registered as anyone's subcategory
// — NOT categoryType "Primary Category". Verified against massClick_dev:
// categoryType is set inconsistently (8 of 23 categories the rest of the app
// already treats as top-level, including "Hotels", are tagged "Sub
// Category"), so it cannot be trusted as a hierarchy flag. See
// helper/category/categoryHierarchyHelper.js for the actual authoritative
// source (subCategoryMapping — the same data getV2ParentOfSubCategoryAction
// uses for the inverse question).
/**
 * @param {object} args
 * @param {object} args.districtDoc - already-resolved district doc (from
 *   resolveDistrictBySlug / resolveRouteLocation) — this function does not
 *   resolve the district itself, only disambiguates what comes after it.
 * @param {string} args.p2 - the URL segment right after the district.
 * @param {string} [args.p3] - the URL segment after that, if present.
 * @returns {Promise<
 *   | { type: "districtCategory", categorySlug: string, subcategorySlug: string|null }
 *   | { type: "location", locationDoc: object, categorySlug: string|null }
 *   | { type: "unresolvedLocation", attemptedLocationText: string, categorySlug: string }
 *   | { type: "unknown", attemptedText: string }
 * >}
 *
 * Resolution order matches the plan's design decision exactly:
 *   1. Is p2 a known top-level category slug? -> district-wide + subcategory.
 *   2. Else, does p2 resolve as a locality/ward/zone within the district?
 *      -> locality-specific.
 *   3. Neither, but p3 IS a known top-level category -> "unresolvedLocation".
 *      p2 can only mean "category" or "location" in this URL shape, and step
 *      1 already ruled out "category" — so a real category sitting in p3
 *      means p2 was almost certainly a failed/mistyped location attempt
 *      (e.g. someone typed the district's own name, found live via
 *      /trichy/tiruchirappalli/hotels — "tiruchirappalli" isn't a locality
 *      registered under itself). Falls back to the district-wide category in
 *      p3 rather than the caller fabricating a fake category out of p2.
 *   4. Neither, and p3 isn't a known category either -> genuine "unknown".
 *      Deliberately not a hard 404 here — the caller decides what
 *      best-effort rendering means; this function only classifies.
 */
export const classifyMiddleSegment = async ({ districtDoc, p2, p3, p4 } = {}) =>
  classifyLocationRouteSegments({
    districtDoc,
    segments: [p2, p3, p4].filter(Boolean),
  });
