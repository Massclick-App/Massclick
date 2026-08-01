import categoryDisplaySettingsModel from "../../model/categoryDisplaySettings/categoryDisplaySettingsModel.js";
import { categoriesData } from "../../utils/sub-categoriesData.js";

// The authoritative answer to "is this category browsable at the top level"
// is NOT categoryModel's `categoryType` field. Verified against
// massClick_dev: 8 of 23 categories the rest of the app already treats as
// top-level (Hotels, Education, Dentist, Packers and Movers, House Keeping
// Service, Security System, Hostel) are tagged categoryType: "Sub Category"
// — categoryType is set inconsistently by whoever created each record, not
// enforced as a real hierarchy flag. None of those 8 actually appear as a
// subcategory item under any parent in subCategoryMapping, which IS the data
// getV2ParentOfSubCategoryAction and the subcategory-grid navigation
// actually use to resolve parent/child relationships — so "not listed as
// anyone's child there" is the correct, behaviorally-consistent definition
// of top-level, and this file is the single place that answers it.
//
// Mirrors categoryDisplaySettingsController.js's buildSubCatLookup (same
// settings-first-then-categoriesData-fallback resolution), but deliberately
// a separate, narrower function rather than a refactor of that one: this
// only needs the flat set of subcategory NAMES, and touching the existing
// lookup (used by several already-working admin/display endpoints) isn't
// worth the risk for that.

let subCategoryNameSetCache = null;
let subCategoryNameSetCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

const normalize = (name = "") => String(name).toLowerCase().trim();

// Set of every name that appears as a subcategory item under some parent —
// i.e. names that are somebody else's child and therefore NOT top-level.
export const getSubCategoryNameSet = async () => {
  const now = Date.now();
  if (subCategoryNameSetCache && now - subCategoryNameSetCacheAt < CACHE_TTL_MS) {
    return subCategoryNameSetCache;
  }

  const settings = await categoryDisplaySettingsModel.findOne().lean();
  const mapping = settings?.subCategoryMapping?.length > 0
    ? settings.subCategoryMapping
    : Object.entries(categoriesData).map(([parentSlug, items]) => ({
        parentSlug,
        subCategoryNames: (items || []).map((item) => item.name),
      }));

  const names = new Set();
  for (const { subCategoryNames } of mapping) {
    for (const name of subCategoryNames || []) {
      names.add(normalize(name));
    }
  }

  subCategoryNameSetCache = names;
  subCategoryNameSetCacheAt = now;
  return names;
};

// Call after an admin edit to subCategoryMapping so the change is visible
// immediately instead of waiting out the TTL.
export const invalidateSubCategoryNameCache = () => {
  subCategoryNameSetCache = null;
  subCategoryNameSetCacheAt = 0;
};

// A category NAME (not slug) is top-level if it isn't registered as anyone's
// subcategory. Takes a name rather than a slug because subCategoryMapping
// stores display names, not slugs — matches buildSubCatLookup's own
// comparison basis.
export const isTopLevelCategoryName = async (name) => {
  if (!name) return false;
  const subNames = await getSubCategoryNameSet();
  return !subNames.has(normalize(name));
};
