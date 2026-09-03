import React from "react";

import LegalDocumentPage from "features/public/footer/LegalDocumentPage.js";

const fallbackSeo = {
  title: "Privacy Policy - Massclick",
  description:
    "How Massclick collects, uses, shares and protects your personal information across our website and mobile app.",
  keywords: "massclick privacy policy, data protection, DPDP",
  canonical: "https://massclick.in/privacy",
  robots: "index, follow",
};

const PrivacyPolicy = () => (
  <LegalDocumentPage
    documentType="privacy-policy"
    seoPageType="privacy"
    fallbackSeo={fallbackSeo}
    headingLead="Our"
    headingHighlight="Privacy Policy"
  />
);

export default PrivacyPolicy;
