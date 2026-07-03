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
  { key: "paymentDetails", title: "Payment", step: 0 },
  { key: "kycDocuments", title: "KYC Docs", step: 1 },
  { key: "categorySeo", title: "Category", step: 2 },
  { key: "keywordsTags", title: "Keywords", step: 2 },
  { key: "displaySeo", title: "Display & SEO", step: 2 },
  { key: "searchSeo", title: "SEO", step: 2 },
  { key: "preview", title: "Preview", step: 2 },
];

const BusinessSidebar = ({ activeSection, onSectionChange, sectionStatus = {}, getSectionIsDisabled }) => {
  return (
    <div className={cx("business-sidebar")}>
      <div className={cx("sidebar-header")}>
        <p className={cx("sidebar-title")}>Sections</p>
      </div>

      <div className={cx("sidebar-sections")}>
        {SECTION_ORDER.map((section, index) => {
          const status = sectionStatus[section.key];
          const isDisabled = getSectionIsDisabled ? getSectionIsDisabled(section.step, section.key) : false;
          const isLocked = isDisabled;

          return (
            <button
              key={section.key}
              className={cx(
                "sidebar-item",
                activeSection === section.key ? "active" : "",
                isLocked ? "disabled" : ""
              )}
              onClick={() => !isLocked && onSectionChange(section.key)}
              type="button"
              disabled={isLocked}
              title={isLocked ? "Complete previous section to unlock" : undefined}
            >
              <span className={cx("sidebar-item-number")}>{index + 1}</span>
              <span className={cx("sidebar-item-title")}>{section.title}</span>
              {isLocked && <span className={cx("sidebar-lock-icon")}>🔒</span>}
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
