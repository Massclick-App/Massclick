/**
 * Canonical site-wide identity schema (Organization + WebSite).
 *
 * This is the SINGLE SOURCE OF TRUTH for how Massclick describes itself to
 * search engines. Google merges JSON-LD nodes by @id, so every page that needs
 * to point at the company must emit ORGANIZATION_REF rather than redefining an
 * anonymous Organization node — anonymous name-only nodes do not merge reliably
 * and make one company look like several unrelated entities.
 *
 * MIRRORED (by hand) in client/ui-app/src/utils/seoSchemaGenerators.js for
 * client-side-only navigations. CRA's ModuleScopePlugin forbids importing from
 * outside client/ui-app/src, so the two cannot share a module. Same arrangement
 * as breadcrumbBuilder.js <-> client/ui-app/src/utils/breadcrumbs.js.
 * If you change anything here, change it there too.
 */

export const SITE_ORIGIN = "https://massclick.in";

export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

/** Reference node. Use this anywhere a page needs a publisher/mainEntity. */
export const ORGANIZATION_REF = { "@id": ORGANIZATION_ID };

/** Reference node for the site itself (WebPage.isPartOf). */
export const WEBSITE_REF = { "@id": WEBSITE_ID };

export const buildOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "Massclick",
  url: SITE_ORIGIN,
  logo: `${SITE_ORIGIN}/logo.png`,
  description:
    "Find trusted local businesses near you with reviews, ratings, and contact details",
  foundingDate: "2018",
  address: {
    "@type": "PostalAddress",
    streetAddress:
      "SLK Complex, 166/9, Rani Mangammal Saalai, Renga Nagar, Krishna Moorthy Nagar, K K Nagar",
    addressLocality: "Tiruchirappalli",
    addressRegion: "Tamil Nadu",
    postalCode: "620021",
    addressCountry: "IN",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+919789104201",
    contactType: "Customer Service",
    email: "support@massclick.in",
    areaServed: "IN",
    availableLanguage: ["English", "Tamil"],
  },
  // Every URL here must resolve and should link back to massclick.in — Google
  // treats sameAs as corroboration it verifies, not as a claim it accepts.
  sameAs: [
    "https://www.instagram.com/massclick.in",
    "https://www.facebook.com/massClicks",
    "https://www.linkedin.com/company/massclick/",
    "https://www.youtube.com/@Mass360Business",
    "https://play.google.com/store/apps/details?id=com.massclick.massclick",
  ],
  areaServed: {
    "@type": "Country",
    name: "IN",
  },
});

export const buildWebsiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  name: "Massclick",
  url: `${SITE_ORIGIN}/`,
  description: "Find trusted local businesses near you",
  publisher: ORGANIZATION_REF,
  // No potentialAction/SearchAction: Google deprecated the sitelinks search box
  // in late 2024, so the markup renders nothing.
});
