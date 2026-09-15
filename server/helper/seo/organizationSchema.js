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
  alternateName: ["MassClick", "massclick.in"],
  // Registered entity per the MCA Certificate of Incorporation (09-Jul-2026).
  // Keep in sync with client/ui-app/src/shared/utils/companyIdentity.js.
  legalName: "MassClick Technologies Private Limited",
  url: SITE_ORIGIN,
  logo: `${SITE_ORIGIN}/logo.png`,
  description:
    "Massclick is an India local business discovery platform for finding trusted businesses, services, restaurants, hotels, healthcare providers, and professionals by city and category.",
  slogan: "Explore. Connect. Succeed Local.",
  foundingDate: "2018",
  email: "admin@massclick.in",
  address: {
    "@type": "PostalAddress",
    streetAddress:
      "No. 166/9, SLK Complex, Renga Nagar, Mangammal Salai, K.K. Nagar",
    addressLocality: "Tiruchirappalli",
    addressRegion: "Tamil Nadu",
    postalCode: "620021",
    addressCountry: "IN",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+919789104201",
    contactType: "Customer Service",
    email: "admin@massclick.in",
    areaServed: "IN",
    availableLanguage: ["English", "Tamil"],
  },
  // Every URL here must resolve and should link back to massclick.in — Google
  // treats sameAs as corroboration it verifies, not as a claim it accepts.
  sameAs: [
    "https://www.instagram.com/massclick.in",
    "https://www.facebook.com/massClicks",
    "https://www.linkedin.com/company/massclick/",
    "https://x.com/massclick_mc",
    "https://www.youtube.com/@Mass360Business",
    "https://play.google.com/store/apps/details?id=com.massclick.massclick",
  ],
  areaServed: {
    "@type": "Country",
    name: "IN",
  },
  knowsAbout: [
    "Local business discovery",
    "Indian business directory",
    "Local SEO",
    "Business listings",
    "Customer reviews",
    "City and category search",
  ],
  serviceArea: {
    "@type": "Country",
    name: "India",
  },
  makesOffer: [
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Local business search",
        description:
          "Search verified local businesses by location and category with phone numbers, addresses, ratings, reviews, photos, and opening details.",
      },
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Business listing and local SEO services",
        description:
          "Business profile visibility, category placement, lead discovery, digital marketing, and SEO support for Indian local businesses.",
      },
    },
  ],
});

export const buildWebsiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  name: "Massclick",
  alternateName: "massclick.in",
  url: `${SITE_ORIGIN}/`,
  description:
    "Search Massclick for trusted local businesses in India by city, locality, and category.",
  inLanguage: ["en-IN", "ta-IN"],
  publisher: ORGANIZATION_REF,
  about: [
    { "@type": "Thing", name: "Local business directory" },
    { "@type": "Thing", name: "Verified business listings" },
    { "@type": "Thing", name: "Local services in India" },
  ],
  audience: {
    "@type": "Audience",
    audienceType: "Indian consumers and local business owners",
  },
  // No potentialAction/SearchAction: Google deprecated the sitelinks search box
  // in late 2024, so the markup renders nothing.
});
