# Frontend Structure

This structure applies only to `client/ui-app`. Backend structure is unchanged.

## Current Shape

```text
src/
  app/
    auth/
    config/
    layout/
    routes/
  assets/
  features/
    admin/
    public/
    user/
  shared/
    components/
    hooks/
    services/
    styles/
    theme/
    utils/
    validators/
  state/
    actions/
    reducers/
    selectors/
```

## Ownership

- `app`: app bootstrap, route registry, auth/session helpers, app layout, route guards.
- `features/admin`: admin-only pages and admin feature modules.
- `features/public`: public website, listing, search, footer, category, event, and public customer entry pages.
- `features/user`: logged-in customer account pages.
- `shared`: reusable UI, services, hooks, styles, theme, utilities, and validators.
- `state`: Redux actions, reducers, selectors, and store.
- `assets`: source-controlled image and animation assets.

## Naming Rules

- React components and pages use PascalCase filenames: `AppAnalytics.js`, `HomePage.js`, `Footer.js`.
- CSS modules match the component/page name where practical: `HomePage.module.css`, `Footer.module.css`.
- Feature folders use kebab-case: `site-analytics`, `free-listing`, `business-enquiry`.
- Helpers use camelCase filenames: `analyticsWorkbook.js`, `searchResultNavigation.js`.
- New imports should use `src`-root paths such as `features/public/HomePage.js` or `shared/services/axiosInstance.js`.

## Route Imports

Lazy route components are centralized in:

```text
src/app/routes/lazyRouteComponents.js
```

Keep public URLs separate from source paths. Source folders can be renamed without changing route URLs.

## Verification

Use these checks after future moves:

```bash
npm run check:imports
npm run check:css-scope
npm test -- --watchAll=false --runInBand --runTestsByPath src\App.test.js
```

Run `npm run build` only when explicitly needed.
