import React from "react";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import styles from "../business.module.css";

const cx = createScopedClassNames(styles);

const BusinessFormSection = ({
  step,
  sectionKey,
  title,
  subtitle,
  isCollapsed,
  isDisabled,
  onToggleCollapse,
  children,
  showAdvanceButton = true,
  onAdvance,
  advanceLabel = "Next",
  advanceType = "next",
}) => {
  return (
    <div className={cx("form-section-wrapper", "section-panel")}>
      <div
        className={cx("col-span-all", "form-section-anchor", isCollapsed && "section-collapsed")}
      >
        <div className={cx("section-header", isDisabled && "disabled", isCollapsed && "collapsed")}>
          <button
            type="button"
            className={cx("section-header-button")}
            onClick={onToggleCollapse}
            disabled={isDisabled}
            aria-expanded={!isCollapsed}
          >
            <div className={cx("section-title-group")}>
              <h3 className={cx("section-title")}>{title}</h3>
              {subtitle && <p className={cx("section-subtitle")}>{subtitle}</p>}
            </div>
          </button>
          {isDisabled && (
            <div className={cx("section-disabled-overlay")}>
              Complete previous section to unlock
            </div>
          )}
        </div>
      </div>

      {!isCollapsed && !isDisabled && (
        <div className={cx("form-section-content")}>
          {children}
          {showAdvanceButton && onAdvance && (
            <div className={cx("col-span-all", "section-nav-row")}>
              <button
                type="button"
                className={cx("step-nav-button", "section-next-button", advanceType === "submit" && "section-submit-button")}
                onClick={onAdvance}
              >
                <span>{advanceLabel}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BusinessFormSection;
