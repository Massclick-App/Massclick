/**
 * SEO Schema Generators - JSON-LD Schema.org compatible functions
 * Transforms API response data into structured JSON-LD markup for search engines
 *
 * All functions return valid schema.org JSON-LD objects or null if data insufficient
 */

/**
 * Generate LocalBusiness schema for single business detail pages
 * @param {Object} business - Business data object from API
 * @returns {Object} Valid LocalBusiness schema or null
 */
export const generateLocalBusinessSchema = (business) => {
  if (!business?.businessName) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `https://massclick.in/business/${business._id}`,
    name: business.businessName,
  };

  // Optional fields - only add if they have values
  if (business.description) {
    schema.description = business.description;
  }

  // Images - support multiple
  const images = business.images?.filter(Boolean) || [];
  if (images.length > 0) {
    schema.image = images;
  } else if (business.image) {
    schema.image = business.image;
  }

  // Contact info
  if (business.telephone) {
    schema.telephone = business.telephone;
  }
  if (business.email) {
    schema.email = business.email;
  }

  // Website
  if (business.website) {
    const url = business.website.startsWith('http') ? business.website : `https://${business.website}`;
    schema.url = url;
  }

  // Address
  if (business.address) {
    schema.address = {
      "@type": "PostalAddress",
      ...(business.address.street && { streetAddress: business.address.street }),
      ...(business.address.locality && { addressLocality: business.address.locality }),
      ...(business.address.postalCode && { postalCode: business.address.postalCode }),
      ...(business.address.country && { addressCountry: business.address.country }),
    };
  }

  // Geo coordinates
  if (business.geo?.latitude && business.geo?.longitude) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: Number(business.geo.latitude),
      longitude: Number(business.geo.longitude),
    };
  }

  // Social profiles
  const socialProfiles = [];
  if (business.socialProfiles?.facebook) socialProfiles.push(business.socialProfiles.facebook);
  if (business.socialProfiles?.instagram) socialProfiles.push(business.socialProfiles.instagram);
  if (business.socialProfiles?.youtube) socialProfiles.push(business.socialProfiles.youtube);
  if (business.socialProfiles?.twitter) socialProfiles.push(business.socialProfiles.twitter);
  if (business.socialProfiles?.linkedin) socialProfiles.push(business.socialProfiles.linkedin);

  if (socialProfiles.length > 0) {
    schema.sameAs = socialProfiles;
  }

  // Service type/category
  if (business.category) {
    schema.serviceType = business.category;
  }

  // Area served
  if (business.areaServed) {
    schema.areaServed = {
      "@type": "City",
      name: business.areaServed,
    };
  }

  // Aggregate rating
  if (business.averageRating && business.totalReviews > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Math.round(Number(business.averageRating) * 10) / 10,
      reviewCount: Number(business.totalReviews),
      bestRating: 5,
      worstRating: 1,
    };
  }

  // Opening hours
  if (business.openingHours?.length > 0) {
    const openingHoursSpec = business.openingHours
      .filter(h => !h.isClosed && h.open && h.close)
      .map(h => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: h.day,
        opens: h.open,
        closes: h.close,
      }));

    if (openingHoursSpec.length > 0) {
      schema.openingHoursSpecification = openingHoursSpec;
    }
  }

  return schema;
};

/**
 * Generate Organization schema for site-wide info
 * Represents the company/organization behind the site
 * @returns {Object} Valid Organization schema
 */
export const generateOrganizationSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Massclick",
    url: "https://massclick.in",
    logo: "https://massclick.in/logo.png",
    description: "Find trusted local businesses near you with reviews, ratings, and contact details",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: "support@massclick.in",
    },
    sameAs: [
      "https://facebook.com/massclick",
      "https://instagram.com/massclick",
      "https://twitter.com/massclick",
    ],
    areaServed: {
      "@type": "Country",
      name: "IN",
    },
  };
};

/**
 * Generate WebSite schema for site-wide metadata
 * Enables search box appearance in Google results
 * @returns {Object} Valid WebSite schema
 */
export const generateWebsiteSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Massclick",
    url: "https://massclick.in",
    description: "Find trusted local businesses near you",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://massclick.in/{search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
};

/**
 * Generate BreadcrumbList schema for navigation trails
 * @param {Array} items - Array of {name: string, url: string}
 * @returns {Object} Valid BreadcrumbList schema or null
 */
export const generateBreadcrumbSchema = (items) => {
  if (!items?.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};

/**
 * Generate ItemList schema for listing pages (search results, categories)
 * @param {Array} items - Array of {name, url, description, image, aggregateRating}
 * @param {string} listName - Name of the list
 * @param {string} listDescription - Description of the list
 * @returns {Object} Valid ItemList schema or null
 */
export const generateItemListSchema = (items, listName, listDescription) => {
  if (!items?.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    ...(listDescription && { description: listDescription }),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => {
      const itemObject = {
        "@type": "LocalBusiness",
        name: item.name,
        url: item.url,
      };

      if (item.description) {
        itemObject.description = item.description;
      }

      if (item.image) {
        itemObject.image = item.image;
      }

      if (item.aggregateRating) {
        itemObject.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: Math.round(Number(item.aggregateRating.ratingValue) * 10) / 10,
          reviewCount: Number(item.aggregateRating.reviewCount),
          bestRating: 5,
          worstRating: 1,
        };
      }

      return {
        "@type": "ListItem",
        position: index + 1,
        url: item.url,
        item: itemObject,
      };
    }),
  };
};

/**
 * Generate SearchResultsPage schema (alternative to LocalBusiness for category results)
 * Better semantic representation for search result pages
 * @param {string} category - Category name
 * @param {string} location - Location name
 * @param {number} totalResults - Total number of results
 * @param {number} avgRating - Average rating across results
 * @returns {Object} Valid SearchResultsPage schema or null
 */
export const generateSearchResultsPageSchema = (category, location, totalResults, avgRating) => {
  if (!category || !location) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "SearchResultsPage",
    name: `${category} in ${location}`,
    description: `Search results for ${category} in ${location}`,
    url: `https://massclick.in/${location.toLowerCase()}/${category.toLowerCase()}`,
    mainEntity: {
      "@type": "LocalBusiness",
      name: `${category} Services in ${location}`,
      areaServed: {
        "@type": "City",
        name: location,
      },
    },
  };

  if (totalResults > 0) {
    schema.numberOfItems = totalResults;
  }

  if (avgRating && avgRating > 0) {
    schema.mainEntity.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Math.round(Number(avgRating) * 10) / 10,
      reviewCount: totalResults,
    };
  }

  return schema;
};

/**
 * Generate FAQPage schema for pages with Q&A content
 * @param {Array} faqs - Array of {question: string, answer: string}
 * @returns {Object} Valid FAQPage schema or null
 */
export const generateFAQSchema = (faqs) => {
  if (!faqs?.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
};

/**
 * Generate Article/BlogPosting schema for blog posts
 * @param {Object} blog - Blog data with metadata
 * @returns {Object} Valid BlogPosting schema or null
 */
export const generateArticleSchema = (blog) => {
  if (!blog?.headline) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.headline,
  };

  if (blog.description) {
    schema.description = blog.description;
  }

  if (blog.image) {
    schema.image = blog.image;
  }

  if (blog.datePublished) {
    schema.datePublished = blog.datePublished;
  }

  if (blog.dateModified) {
    schema.dateModified = blog.dateModified;
  }

  if (blog.author) {
    schema.author = {
      "@type": "Person",
      name: blog.author,
    };
  }

  schema.publisher = {
    "@type": "Organization",
    name: "Massclick",
  };

  return schema;
};
