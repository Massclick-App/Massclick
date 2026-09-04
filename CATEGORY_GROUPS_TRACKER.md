# Category Groups (3rd tier) — Implementation Tracker

Plan: `C:\Users\USER\.claude\plans\robust-pondering-wind.md`

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

## 1. Schema
- [x] `categoryDisplaySettingsSchema.js` — add `subCategoryGroupMapping`

## 2. Fallback data
- [x] `server/utils/sub-category-groups-data.js` (new)

## 3. Backend
- [x] `categoryHierarchyHelper.js` — `getSubCategoryGroupLookup`, `matchGroupPath`, extend `getSubCategoryNameSet`, `invalidateSubCategoryGroupCache`, wire `invalidateSubCategoryNameCache` into admin PUT
- [x] `categoryDisplaySettingsController.js` — `getV2SubCategoryGroupsAction`, extend `getV2ParentOfSubCategoryAction` reverse lookup
- [x] `categoryDisplaySettingsRoutes.js` — register `GET /api/v2/category/group/:parentSlug`
- [x] Admin PUT — accept `subCategoryGroupMapping`, dup `(parentSlug,groupSlug)` guard, cache invalidation calls
- [x] `hasSubcategories` flag fix in 3 home-category actions
- [x] `cacheInvalidation.js` — add `category-group-v2:*` pattern

## 4. Admin UI — CategoryDisplaySettings.js
- [x] New state + wiring (load effect, `current` memo, `handleReset`)
- [x] `ParentGroupSection` + `SubCategoryGroupAccordion` components
- [x] "Add parent" Autocomplete
- [x] New "Sub-Category Groups" sidebar card + panel
- [x] CSS additions

## 4b. Admin UX — Category.js group assignment
- [x] Backend: `GET/PUT /api/admin/category/:slug/group-assignment` (atomic `$pull`/`$push`)
- [x] `Category.js` — "Category Grouping" section (Parent + Group Autocomplete, +New group)

## 5. Customer UI — categories.js
> **Design correction made during implementation** (see note below): dropped
> the planned `/:category/:group/:subcategory` URL shape and `handleClick`
> group branch / `buildCategoryPath` `groupSlug` param — this app's URL
> scheme collapses every drill-down to ONE flat slug (`buildCategoryPath`'s
> `finalCategorySlug = subcategorySlug || categorySlug`), so a group reuses
> that exact mechanism instead of a new one. Net result: less code than
> planned, `handleClick` and `itemListSchema` needed zero changes.
- [x] `groupSlug` from routeContext + `fetchSubCategoryGroups` effect
- [x] Render branch (group-listing / group-detail / unchanged flat)
- [x] `pagePath` canonical + H1/SEO label (`pageLabel`) for group-detail view
- [x] `breadcrumbs.js` optional `groupSlug`/`groupName` crumb (flat path, same scheme as subcategory)

## 6. Routing — corrected design (see note above)
- [x] `categoryHierarchyHelper.js` — `matchGroupBySlug` (replaces the wrong `matchGroupPath`)
- [x] `locationUrl.js` — `classifyLocationRouteSegments`'s 1-segment branch: not a category? try a group; rewrites to `{categorySlug: parentSlug, groupSlug}`
- [x] `districtRouteResolution.js` — `group` param in `buildDistrictCategoryContext`
- [x] `DistrictRouteResolver.js` — pass `groupSlug` through
- [x] `App.js` — **no changes needed**, rides on existing `/:district/:p2...` routes
- [x] `categoryRouter.js` — **no changes needed**, forwards routeContext (incl. groupSlug) as-is

## 7. Redux
- [x] `userActionTypes.js` — new triplet
- [x] `categoryAction.js` — `fetchSubCategoryGroups`
- [x] `categoryReducer.js` — state + cases

## 8. Verification (see plan for full steps)
- [ ] Admin create-group flow
- [ ] Backend endpoint direct hit
- [ ] Customer drill-down (3 URLs)
- [ ] Hard-refresh each URL
- [ ] Regression check (Hotels, Rent And Hire unaffected)

## 9. Backfill (final, manual, only where grouping is obvious)
- [ ] Restaurants (cuisine groups)
- [ ] Review other categories — skip if no clean grouping exists

---
Last updated: 2026-09-04 — plan approved, implementation starting.
