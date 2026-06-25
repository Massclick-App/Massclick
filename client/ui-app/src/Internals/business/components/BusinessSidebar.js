import React from "react";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import styles from "../business.module.css";

const cx = createScopedClassNames(styles);

const SECTION_ORDER = [
  { key: "clientBusiness", title: "Business Info", step: 0 },
  { key: "address", title: "Address", step: 0 },
  { key: "contact", title: "Contact", step: 0 },
  { key: "businessInfo", title: "Business Details", step: 0 },
  { key: "locationWeb", title: "Location & Web", step: 0 },
  { key: "socialMedia", title: "Social Media", step: 0 },
  { key: "bannerDetails", title: "Banner & Details", step: 0 },
  { key: "openingHours", title: "Hours", step: 0 },
  { key: "badgesVisibility", title: "Badges", step: 0 },
  { key: "kycDocuments", title: "KYC Docs", step: 1 },
  { key: "categorySeo", title: "Category", step: 2 },
  { key: "keywordsTags", title: "Keywords", step: 2 },
  { key: "displaySeo", title: "Display & SEO", step: 2 },
  { key: "searchSeo", title: "SEO", step: 2 },
  { key: "payment", title: "Payment", step: 3 },
];

const BusinessSidebar = ({ activeSection, onSectionChange, sectionStatus = {} }) => {
  return (
    <div className={cx("business-sidebar")}>
      <div className={cx("sidebar-header")}>
        <p className={cx("sidebar-title")}>Sections</p>
      </div>

      <div className={cx("sidebar-sections")}>
        {SECTION_ORDER.map((section, index) => {
          const status = sectionStatus[section.key];
          return (
            <button
              key={section.key}
              className={cx("sidebar-item", {
                active: activeSection === section.key,
              })}
              onClick={() => onSectionChange(section.key)}
              type="button"
            >
              <span className={cx("sidebar-item-number")}>{index + 1}</span>
              <span className={cx("sidebar-item-title")}>{section.title}</span>
              {status && (
                <span
                  className={cx(
                    "sidebar-field-pill",
                    status.done === status.total ? "sidebar-field-pill-complete" : "sidebar-field-pill-incomplete"
                  )}
                  aria-label={`${status.done} of ${status.total} fields done`}
                >
                  {status.done}/{status.total}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BusinessSidebar;
