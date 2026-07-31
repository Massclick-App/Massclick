import categoryModel from "../../model/category/categoryModel.js";
import { resolveLocationWithinDistrict } from "./locationResolver.js";

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

// A top-level category is one that itself has no parent — the DB models this
// as categoryType "Primary Category" (see schema/category/categorySchema.js),
// distinct from "Sub Category". A single indexed existence check; category
// count is small enough that no separate cache layer is worth it here.
export const isKnownTopLevelCategorySlug = async (slug) => {
  if (!slug) return false;
  const hit = await categoryModel.exists({
    slug,
    categoryType: "Primary Category",
    isActive: true,
  });
  return Boolean(hit);
};

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
 *   | { type: "unknown" }
 * >}
 *
 * Resolution order matches the plan's design decision exactly:
 *   1. Is p2 a known top-level category slug? -> district-wide + subcategory.
 *   2. Else, does p2 resolve as a locality/ward/zone within the district?
 *      -> locality-specific.
 *   3. Neither -> "unknown". Deliberately not a hard 404 here — the caller
 *      decides what best-effort rendering means (matches today's existing
 *      behavior for an unrecognized segment); this function only classifies.
 */
export const classifyMiddleSegment = async ({ districtDoc, p2, p3 } = {}) => {
  if (!districtDoc || !p2) return { type: "unknown" };

  const isCategory = await isKnownTopLevelCategorySlug(p2);
  if (isCategory) {
    return { type: "districtCategory", categorySlug: p2, subcategorySlug: p3 || null };
  }

  const locationDoc = await resolveLocationWithinDistrict(districtDoc, p2);
  if (locationDoc) {
    return { type: "location", locationDoc, categorySlug: p3 || null };
  }

  return { type: "unknown" };
};
