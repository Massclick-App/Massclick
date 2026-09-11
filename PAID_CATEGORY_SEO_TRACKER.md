# Paid Category SEO Console — Tracker

Admin page that keeps SEO for categories with **paid businesses** complete, specific
and protected from look-alike categories. Route: `/dashboard/paid-category-seo`.

"Paid" = any of `amountPaid`, PhonePe `payment.paymentStatus: SUCCESS`,
`paymentConcept.paymentStatus` paid/part_paid, `subscription.isActive`, non-FREE plan,
`premiumBusiness` — on a live, active business.

## Scope

| Tab | What it shows | Actions |
|---|---|---|
| Categories | Every category with ≥1 paid business: paid count, districts, coverage %, gaps, conflicts | Open detail |
| Category detail | Paid businesses (+ their SEO), every page slot (district page + each paid business's locality page) with title/description/page content/featured-box checks, protected terms, conflicts | Edit/create SEO row, edit business SEO, edit protected terms, refresh live cache |
| Gaps | Every failing page slot across all paid categories | Fix (opens editor pre-filled) |
| Competitors | Other categories' SEO in the same districts using a paid category's protected terms | Remove keyword items, edit title/description |

## Checklist

- [x] Phase 0 — Data fix: 5 `geoglist` businesses → `geologist` (dev + prod done 2026-09-10)
- [x] Phase 1 — Schema: `categories.seoProtectedTerms: [String]`
- [x] Phase 2 — Server helper `helper/seo/paidSeoConsoleHelper.js` (overview, detail, gaps, conflicts, upsert row, business SEO, protected terms, cache purge)
- [x] Phase 3 — Controller `controller/seo/paidSeoConsoleController.js` + routes in `seoRoutes.js` (all `oauthAuthentication`)
- [x] Phase 4 — Client thunks `state/actions/paidCategorySeoAction.js`
- [x] Phase 5 — UI `features/admin/paid-category-seo/` (page + module CSS, own classes only; ESLint clean)
- [x] Phase 6 — Wiring: lazy route, `App.js` route, menu (Content → "Paid SEO"), `PAGE_REGISTRY`
- [x] Phase 7a — Server verified on massClick_dev: read (overview/detail/gaps/conflicts) + 9/9 write checks (snapshot `paid-seo-console-test`)
- [ ] Phase 7b — You check the page on dev.massclick.in after deploy (non-SuperAdmin roles need "Paid Category SEO" ticked in Roles)
- [ ] Phase 8 — Prod: geoglist fix + deploy (after your OK)

## Conflict rules (as built)

- **Auto terms** (from the category name, e.g. "restaurant") flag only a keyword item or title part that is *purely*
  that search plus location/filler words ("best restaurants in trichy"), never "pizza restaurant trichy". Descriptions
  are never flagged by auto terms.
- **Custom terms** (added in the console, e.g. "toys" for Toy Shops) flag any use in title/description/keywords.
- A competitor using a term that's part of its own name ("eye hospitals" → "hospital") is never flagged.
- Scope: other categories' SEO rows in the districts where the paid category has paid businesses, plus all templates.

## Notes

- Page SSR cache keys (`category:district:<d>:…:<cat>…`) are not cleared by `invalidateSeoCache`; the console's
  "Refresh live pages" purges them for one category.
- Locality page SEO rows use `location = masterlocation.publicLocationSlug`, `district = district URL slug`.
- Business SEO is used on `/business/...` only when it names the business (`helper/businessList/businessSeoMeta.js`).
