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
- [x] Admin create-group flow — real test group added: Restaurants → "indian restaurants" → bbq/millet/seafood restaurants
- [x] Backend endpoint direct hit — `/v2/category/group/restaurants`, `/v2/location/resolve` (bare group slug), `/v2/category/parent-of/:slug` all confirmed on dev
- [x] Customer drill-down — full 3-level click-through confirmed by user: `/trichy/restaurants` (group tile) → group detail (3 cuisine names) → search results
- [ ] Hard-refresh each URL directly (not yet confirmed — only in-app nav clicked so far)
- [ ] Regression check (Hotels, Rent And Hire unaffected) — API-level confirmed (`hasSubcategories: false` unchanged); UI look at e.g. `/trichy/hotels` not yet confirmed

## 9. Backfill (final, manual, only where grouping is obvious)
- [~] Restaurants — one real group live on dev ("indian restaurants"); more cuisine groups optional
- [ ] Review other categories — skip if no clean grouping exists

---
Last updated: 2026-09-04 — full 3-level click-through confirmed working on dev (group listing → group detail → search results). Feature is functionally verified. Left open: a hard-refresh check on each URL (exercises the server-side resolver instead of client-side nav) and a quick look at an unrelated 2-level category page for peace of mind. Backfill (more real groups) is discretionary from here.

## 10. Tier-2 redesign (group-listing view only — not committed yet)
- [x] Backend: `getV2SubCategoryGroupsAction` now returns `{parent: {title, description, webHero}, groups: [...]}`
- [x] Redux: `subCategoryGroupsParent` unpacked in reducer
- [x] No SEO for tier 2: breadcrumbs UI, JSON-LD schemas, and the FAQ/article block all skipped; robots forced to `noindex, follow`; SEO fetch effects gated + CLEAR_SEO_META dispatched to avoid a stale record leaking through (SeoMeta prefers seoData over fallback when non-empty)
- [x] Banner: reuses existing `categoryModel.categoryImages.webHero`/`title`/`description` (no new schema/admin work), gradient fallback via the same 5-color rotation as group cards
- [x] Search box removed for tier 2
- [x] Quick-jump strip: all group members flattened+deduped, shown below the group grid in the existing small-tile style
- [x] Removed per user feedback — didn't work visually, competed with the group cards
- [ ] Not yet visually verified (lint-clean, logic traced, but no eyes on it) — needs a look on dev once committed/deployed

## 11. Tier-3 (group-detail) header banner + real cache-invalidation fix
- [x] New `groupBanner` field on `subCategoryGroupMapping` — separate from `groupIcon` (tier-2 card image), own admin upload
- [x] Tier-3 header redesigned: light side-by-side banner (title+subtitle left, groupBanner image right), gradient fallback, search box kept (not removed like tier 2)
- [x] Real bug fix: `invalidateCategoryCache()` (runs after every category update/image upload) never cleared the v2 middleware caches — now delegates to `invalidateCategoryDisplaySettingsCache()` so a webHero/category edit shows up immediately instead of waiting out the cache TTL
- [ ] Not committed — everything in this section still needs `git add`/commit
- [ ] Not visually verified — needs a `groupBanner` uploaded for a real group, then a look at that group's tier-3 page, after redeploy
