import React from "react";

import LegalDocumentPage from "features/public/footer/LegalDocumentPage.js";

const fallbackSeo = {
  title: "Terms and Conditions - Massclick",
  description:
    "The agreement between you and Massclick covering use of our website and mobile app, listings, leads, payments and dispute resolution.",
  keywords: "massclick terms and conditions, user agreement",
  canonical: "https://massclick.in/terms",
  robots: "index, follow",
};

const TermsAndConditions = () => (
  <LegalDocumentPage
    documentType="terms-and-conditions"
    seoPageType="terms"
    fallbackSeo={fallbackSeo}
    headingLead="Our"
    headingHighlight="Terms & Conditions"
  />
);

export default TermsAndConditions;
