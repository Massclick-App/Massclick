import React from "react";
import { CircularProgress } from "@mui/material";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import styles from "../business.module.css";

const cx = createScopedClassNames(styles);

const BusinessFormSection = ({
  step,
  sectionKey,
  title,
  subtitle,
  isDisabled,
  children,
  showAdvanceButton = true,
  onAdvance,
  advanceLabel = "Next",
  advanceType = "next",
  showSaveButton = false,
  onSave,
  isSaving = false,
}) => {
  return (
    <div className={cx("form-section-wrapper", "section-panel")}>
      <div
        className={cx("col-span-all", "form-section-anchor")}
      >
        <div className={cx("section-header", isDisabled && "disabled")}>
          <div className={cx("section-title-group")}>
            <h3 className={cx("section-title")}>{title}</h3>
            {subtitle && <p className={cx("section-subtitle")}>{subtitle}</p>}
          </div>
          {isDisabled && (
            <div className={cx("section-disabled-overlay")}>
              Complete previous section to unlock
            </div>
          )}
        </div>
      </div>

      {!isDisabled && (
        <div className={cx("form-section-content")}>
          {children}
          {showSaveButton && onSave && (
            <div className={cx("col-span-all", "section-nav-row")}>
              <button
                type="button"
                className={cx("step-nav-button", "section-save-button")}
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1, color: 'inherit' }} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Section</span>
                )}
              </button>
            </div>
          )}
          {showAdvanceButton && onAdvance && !showSaveButton && (
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
