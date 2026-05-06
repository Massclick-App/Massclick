export const STATIC_PAGES = {
  aboutus:     { pageType: "about",        title: "About Us | Massclick",                   description: "Learn about Massclick - India's trusted local business search platform.",              keywords: "massclick, about us, local business platform" },
  testimonials:{ pageType: "testimonial",  title: "Testimonials | Massclick",               description: "See what customers say about businesses listed on Massclick.",                        keywords: "massclick, testimonials, customer reviews" },
  feedbacks:   { pageType: "feedback",     title: "Feedback | Massclick",                   description: "Share your feedback and help us improve Massclick for everyone.",                     keywords: "massclick, feedback, user reviews" },
  customercare:{ pageType: "customerCare", title: "Customer Care | Massclick",              description: "Contact Massclick customer support for help and assistance.",                         keywords: "massclick, customer care, support, help" },
  portfolio:   { pageType: "portfolio",    title: "Portfolio | Massclick",                  description: "Explore the portfolio and work samples at Massclick.",                                keywords: "massclick, portfolio, projects" },
  terms:       { pageType: "terms",        title: "Terms & Conditions | Massclick",         description: "Read the terms and conditions of using Massclick services.",                         keywords: "massclick, terms and conditions, usage policy" },
  privacy:     { pageType: "privacy",      title: "Privacy Policy | Massclick",             description: "Learn how Massclick protects your privacy and handles your personal data.",           keywords: "massclick, privacy policy, data protection" },
  refund:      { pageType: "refund",       title: "Refund Policy | Massclick",              description: "Understand Massclick's refund and cancellation policies.",                           keywords: "massclick, refund policy, cancellation" },
  enquiry:     { pageType: "enquiry",      title: "Contact Us | Massclick",                 description: "Get in touch with the Massclick team for any queries or support.",                   keywords: "massclick, contact, enquiry, support" },
  web:         { pageType: "web",          title: "Web Development Services | Massclick",   description: "Professional web development services to grow your business online.",                keywords: "massclick, web development, website design" },
  digital:     { pageType: "digital",      title: "Digital Marketing Services | Massclick", description: "Result-driven digital marketing services for local businesses.",                     keywords: "massclick, digital marketing, online marketing, SEO" },
  graphic:     { pageType: "graphic",      title: "Graphic Design Services | Massclick",    description: "Creative graphic design services including logos, banners and branding.",            keywords: "massclick, graphic design, logo design, branding" },
  seo:         { pageType: "seo",          title: "SEO Services | Massclick",               description: "Improve your search engine rankings with Massclick's professional SEO services.",    keywords: "massclick, SEO services, search engine optimisation" },
};

export const SKIP_SEO_ROUTES = new Set([
  "business", "dashboard", "admin", "write-review",
  "payment-status", "leads", "free-listing", "advertise",
  "user", "deleteaccount",
]);
