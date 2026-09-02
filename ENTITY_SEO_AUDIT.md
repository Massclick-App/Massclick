# Schema Markup Audit — Entity Recognition for MassClick

**Date:** 2026-09-02
**Goal:** get Google to recognise MassClick as a Knowledge Graph *entity* (the prerequisite for a
thumbnail row + preview card in Google autocomplete).
**Scope:** JSON-LD emitted by the app. Off-site work (GBP, Wikidata) is listed but not audited here.

---

## Where schema is emitted

Two independent code paths build the same JSON-LD, and they have drifted apart:

| Path | File | Runs on |
|---|---|---|
| Server-side | `server/middleware/ssrMiddleware.js:555-723` | Fresh page loads (real HTML) |
| Client-side | `client/ui-app/src/utils/seoSchemaGenerators.js` | React render via `Helmet` |

`home.js` guards against double-emission with `window.__SSR_SEO__`.
`SearchResult.js` does **not** — see B3.

---

## A. Blockers (fix these first — they actively prevent entity consolidation)

### A1. `logo` points at a 404

`seoSchemaGenerators.js:162` and `:415` both emit:

    logo: "https://massclick.in/logo.png"

There is no `logo.png` in `client/ui-app/public/` or `client/ui-app/build/`, and
`server/app.js:194` serves static files from the build dir only. **The URL 404s.**

SSR instead uses `apple-touch-icon.png` (`ssrMiddleware.js:570`) — a 180x180 rounded app icon.
It resolves, but it is a favicon, not a logo.

**Fix:** add a real logo (transparent PNG, at least 112px on the shorter side; wide aspect is fine)
at `public/logo.png`, then use that one URL in all three places.

### A2. Entity fragmentation — five nodes, one company, one `@id`

Google merges JSON-LD nodes by `@id` and `url`. Anonymous nodes carrying only a `name` do not
reliably merge, so MassClick currently looks like several unrelated things:

| Node | Location | `@id`? | Type |
|---|---|---|---|
| Homepage Organization | `ssrMiddleware.js:565` | yes | `Organization` |
| Client Organization | `seoSchemaGenerators.js:156` | yes | `Organization` |
| `basePublisher` (every non-home page) | `ssrMiddleware.js:554` | **no** | `Organization` |
| AboutPage `mainEntity` | `seoSchemaGenerators.js:411` | **no** | `Organization` |
| ContactPage `mainEntity` | `seoSchemaGenerators.js:444` | **no** | **`LocalBusiness`** |

The ContactPage one is the worst: it declares the company as a `LocalBusiness` with no `url` and
no `@id`, which is a different entity class from the homepage `Organization`.

**Fix:** define the Organization once, with `@id: "https://massclick.in/#organization"`.
Everywhere else, reference it instead of redefining it:

    "publisher":  { "@id": "https://massclick.in/#organization" }
    "mainEntity": { "@id": "https://massclick.in/#organization" }

### A3. Play Store app missing from `sameAs`

`public/manifest.json` declares `com.massclick.massclick` with a live Play Store URL, but that URL
appears in no `sameAs` array. A Play listing is one of the stronger Knowledge Graph corroborators
available to an Indian company, and it is free to add.

### A4. YouTube `sameAs` brand mismatch

`sameAs` lists `https://www.youtube.com/@Mass360Business`. `sameAs` works by *corroboration* —
Google follows the link and checks the destination is visibly the same entity. A channel branded
"Mass360Business" weakens the signal rather than strengthening it, unless the channel name,
description, and link-back clearly say MassClick.

---

## B. Correctness issues

### B1. `SearchAction` urlTemplate is malformed

`seoSchemaGenerators.js:210`:

    urlTemplate: "https://massclick.in/{search_term_string}"

No query parameter — this does not describe a search endpoint. Separately, Google **deprecated the
sitelinks search box** in late 2024, so this block earns nothing regardless.

**Fix:** delete the `potentialAction` block entirely.

### B2. Organization emitted on homepage only (server-side)

`ssrMiddleware.js:562` gates on `if (!firstSegment)`. Every other route gets only the anonymous
`basePublisher`. Category and location pages are where most of the site's crawl budget goes, so the
entity signal is absent from the majority of indexed pages.

### B3. `SearchResult.js` double-emits on SSR pages

`SearchResult.js:1209-1210` calls `generateWebsiteSchema()` and `generateOrganizationSchema()` with
no `window.__SSR_SEO__` guard (unlike `home.js:392`). On category/search pages Google therefore sees
two Organization nodes with **different `logo` values** — one 404ing, one not.

### B4. `WebSite` node has no `@id` and no reciprocal link

SSR's `WebSite` (`ssrMiddleware.js:594`) has an inline `publisher` but no `@id` of its own, so
`WebPage.isPartOf` in `home.js:381` cannot bind to it.

**Fix:** give it `@id: "https://massclick.in/#website"`, set
`publisher: { "@id": ".../#organization" }`, and have pages reference
`isPartOf: { "@id": ".../#website" }`.

### B5. Client/SSR field drift

The client Organization has `description` and `areaServed`; the SSR one does not. The SSR one has a
different `logo`. These should be one exported constant consumed by both paths.

---

## C. Missing fields that feed panel content

Add to the canonical Organization:

- `alternateName` — e.g. "MassClick India", plus any Tamil rendering
- `legalName` — the registered entity name
- `image` — same as logo or a brand image; the panel image is chosen from `image`/`logo` + GBP
- `slogan`, `knowsAbout` — cheap topical signal
- `founder` (a `Person` with `sameAs` to their LinkedIn) — a named founder is a notable KG edge
- `numberOfEmployees`, `award`, `memberOf` where truthful

Also: brand casing is inconsistent between code ("Massclick") and the logo/marketing ("MassClick").
Pick one, use it in `name`, and put the other in `alternateName`.

---

## D. What is already correct — do not regress it

- SSR injects JSON-LD into real HTML before hydration (`ssrMiddleware.js:841-871`). This matters
  more than most of the above; many SPAs get this wrong.
- `BreadcrumbList` on every route via a shared builder.
- `FAQPage` on blog and category pages, driven by real content.
- `BlogPosting` with a full `author` `Person` including `jobTitle`, `knowsAbout`, and `sameAs`.
  This is genuinely good E-E-A-T markup.
- Complete `PostalAddress` + `ContactPoint` with `availableLanguage: ["English", "Tamil"]`.
- `foundingDate: "2018"`.
- `robots.txt` explicitly allows every major AI crawler and declares the sitemap.

---

## E. Fix order

1. **[DONE]** Ship `public/logo.png`; point all three references at it. *(A1)*
2. **[DONE]** One canonical Organization definition; add `@id` everywhere; convert
   `basePublisher`, AboutPage and ContactPage to `@id` references. *(A2, B5)*
3. **[DONE]** Add the Play Store URL to `sameAs`. *(A3)*
4. **[DONE]** Delete the `potentialAction` / `SearchAction` block. *(B1)*
5. **[DONE]** Add the `__SSR_SEO__` guard to `SearchResult.js`, matching `home.js`. *(B3)*
6. **[DONE]** Emit the Organization reference site-wide, not just at root. *(B2)*
7. **[DONE]** Add `@id` to `WebSite`, wire `isPartOf` / `publisher` by reference. *(B4)*
8. Fill in `alternateName`, `legalName`, `image`, `founder`. *(C)*
9. Rebrand or rename the YouTube channel so `sameAs` corroborates. *(A4)*

Steps 8-9 need business decisions and are still open.

### What shipped for steps 1-7

- **New:** `server/helper/seo/organizationSchema.js` — canonical `Organization` + `WebSite`,
  exporting `ORGANIZATION_REF` / `WEBSITE_REF` for use as `@id` references.
- `client/ui-app/public/logo.png` — currently a copy of `android-chrome-512x512.png` (512x512 PNG).
  Replace with a proper wordmark if one exists; the URL and dimensions are already valid.
- `ssrMiddleware.js` — imports the canonical module, emits both identity nodes on every route,
  `basePublisher` is now a reference, generic `WebPage` gained `isPartOf`.
- `seoSchemaGenerators.js` — mirrors the server constants (CRA cannot import across the package
  boundary), logo fixed, `SearchAction` removed, and the AboutPage / ContactPage / Service /
  BlogPosting nodes now reference the Organization instead of redefining it. The stray
  `LocalBusiness` on ContactPage is gone.
- `SearchResult.js` — SSR guard added, ending the double emission.
- `home.js` — `isPartOf` now references `#website` by `@id`.

**Deployment note:** `logo.png` was added to `public/`, so a client rebuild is required before
`https://massclick.in/logo.png` resolves in production. Validate with the Rich Results Test and
Schema.org validator on the homepage and one category page after deploying.

---

## F. Off-site work (not code — the actual gating factor)

Schema markup alone has never created a Knowledge Panel. It tells Google how to interpret
corroboration it finds elsewhere. In rough order of leverage:

1. **Verified Google Business Profile** for the K.K. Nagar office. Highest leverage by far.
2. **Wikidata item** for MassClick — self-creatable, needs 2-3 independent citations.
3. **Crunchbase** entry; keep the LinkedIn company page active.
4. Press and directory mentions that name MassClick as a company.
5. **Branded search volume.** The plain-text autocomplete rows only exist when real people type
   "massclick ...". The QR banner and Meta ad campaigns feed this directly.
6. Once a panel appears, claim it via Search Console verification.

Every URL added to `sameAs` must resolve and should link back to massclick.in — that reciprocity is
what makes it a corroboration rather than an unverified claim.
