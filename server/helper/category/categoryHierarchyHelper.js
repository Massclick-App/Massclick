import categoryDisplaySettingsModel from "../../model/categoryDisplaySettings/categoryDisplaySettingsModel.js";
import { categoriesData } from "../../utils/sub-categoriesData.js";
import { subCategoryGroupsData } from "../../utils/sub-category-groups-data.js";

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

  // A name that lives only inside a group (e.g. "Biryani" under Restaurants
  // → Indian Flavours) is still somebody's child and must not be treated as
  // top-level — union in group members the same way as flat mapping members.
  const groupMapping = settings?.subCategoryGroupMapping?.length > 0
    ? settings.subCategoryGroupMapping
    : Object.entries(subCategoryGroupsData).flatMap(([parentSlug, groups]) => groups);
  for (const { subCategoryNames } of groupMapping) {
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

// ─── Sub-category groups (3rd tier: parent → group → subcategory names) ───
// Same settings-first-then-hardcoded-fallback resolution as getSubCategoryNameSet
// above, and the same short-TTL cache shape — kept as its own cache rather than
// folded into the one above because callers of this need the full group
// objects (name/slug/icon), not just a flat name set.

let subCategoryGroupLookupCache = null;
let subCategoryGroupLookupCacheAt = 0;

// parentSlug → [{ groupSlug, groupName, groupIcon, subCategoryNames }]
export const getSubCategoryGroupLookup = async () => {
  const now = Date.now();
  if (subCategoryGroupLookupCache && now - subCategoryGroupLookupCacheAt < CACHE_TTL_MS) {
    return subCategoryGroupLookupCache;
  }

  const settings = await categoryDisplaySettingsModel.findOne().lean();
  const rows = settings?.subCategoryGroupMapping?.length > 0
    ? settings.subCategoryGroupMapping
    : Object.entries(subCategoryGroupsData).flatMap(([parentSlug, groups]) =>
        (groups || []).map((g) => ({ parentSlug, ...g }))
      );

  const lookup = {};
  for (const { parentSlug, groupSlug, groupName, groupIcon, subCategoryNames } of rows) {
    if (!lookup[parentSlug]) lookup[parentSlug] = [];
    lookup[parentSlug].push({
      groupSlug,
      groupName,
      groupIcon: groupIcon || "",
      subCategoryNames: subCategoryNames || [],
    });
  }

  subCategoryGroupLookupCache = lookup;
  subCategoryGroupLookupCacheAt = now;
  return lookup;
};

// Call after an admin edit to subCategoryGroupMapping so the change is
// visible immediately instead of waiting out the TTL.
export const invalidateSubCategoryGroupCache = () => {
  subCategoryGroupLookupCache = null;
  subCategoryGroupLookupCacheAt = 0;
};

// Resolves a bare group slug against the group lookup, searching across
// EVERY parent — unlike a subcategory (which only ever needs a reverse
// lookup for breadcrumb purposes, see getV2ParentOfSubCategoryAction), a
// group's own slug IS how it's addressed in the URL: this app's URL scheme
// collapses every drill-down to a single flat slug per segment
// (buildCategoryPath's finalCategorySlug = subcategorySlug || categorySlug —
// there is no /:category/:group/:subcategory shape anywhere in this app), so
// classifyLocationRouteSegments needs "does this 1-segment slug belong to
// some group, and if so which parent is it under" with no parent slug
// given up front. Returns null (fast, one lookup miss across a small map)
// for any slug that isn't a group — the no-op path for every category with
// no group data, and for a plain top-level/subcategory slug.
export const matchGroupBySlug = async (groupSlug) => {
  if (!groupSlug) return null;
  const lookup = await getSubCategoryGroupLookup();
  for (const [parentSlug, groups] of Object.entries(lookup)) {
    const match = groups.find((g) => g.groupSlug === groupSlug);
    if (match) return { parentSlug, ...match };
  }
  return null;
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
