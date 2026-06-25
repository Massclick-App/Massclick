import React from "react";
import { Button, Typography, IconButton } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import BusinessFormSection from "./BusinessFormSection";
import styles from "../business.module.css";

const cx = createScopedClassNames(styles);

const BusinessFormStep1 = ({
  kycFiles,
  handleKycUpload,
  handleRemoveFile,
  handleSectionAdvance,
  getSectionNavigation,
  getSectionRefKey,
  getSectionIsDisabled,
  renderFieldError,
}) => {
  const isDisabled = getSectionIsDisabled ? getSectionIsDisabled(1, "kycDocuments") : false;
  const navigation = getSectionNavigation ? getSectionNavigation(1, "kycDocuments") : null;

  return (
    <>
      <BusinessFormSection
        step={1}
        sectionKey="kycDocuments"
        title="KYC Documents"
        subtitle="Upload identity proof and business documents"
        isCollapsed={false}
        isDisabled={isDisabled}
        onToggleCollapse={() => {}}
        showAdvanceButton={!!navigation}
        onAdvance={() => handleSectionAdvance(1, "kycDocuments")}
        advanceLabel={navigation?.label || "Next"}
        advanceType={navigation?.type === "submit" ? "submit" : "next"}
      >
        <div className={cx("section-intro") }>
          <div className={cx("section-intro-copy") }>
            <p className={cx("section-eyebrow")}>Verification</p>
            <p className={cx("section-summary")}>Upload clear documents so the listing can be reviewed without back-and-forth. PDFs and images work best when they are sharp and uncropped.</p>
          </div>
          <div className={cx("section-stat")}>{kycFiles.length} file(s)</div>
        </div>

        <div className={cx("field-card", "field-span-full")}>
          <div className={cx("upload-panel")}>
            <div>
              <label className={cx("input-label")}>Upload Documents (PDF, PNG, JPG)</label>
              <p className={cx("upload-panel-copy")}>Add Aadhaar, GST, ownership papers, or any other verification files that help the review team move faster.</p>
            </div>
            <Button variant="contained" component="label" startIcon={<CloudUploadIcon />} className={cx("upload-button")}>
              Upload Files
              <input type="file" multiple hidden onChange={handleKycUpload} accept=".pdf,.png,.jpg,.jpeg" />
            </Button>
          </div>
          {renderFieldError("kycDocuments")}
        </div>

        <div className={cx("kyc-file-list")}>
          {kycFiles.length === 0 ? (
            <div className={cx("field-card", "field-span-full")} style={{ textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
                No documents uploaded yet. Add one or more files to build the KYC bundle.
              </Typography>
            </div>
          ) : (
            kycFiles.map((file, index) => (
              <div key={index} className={cx("kyc-file-item")}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {file.name || `Document ${index + 1}`}
                </Typography>
                <IconButton color="error" onClick={() => handleRemoveFile(index)}>
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>

                <div style={{ marginTop: "5px" }}>
                  {file.type?.includes("image") ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      style={{
                        width: "100%",
                        maxWidth: "160px",
                        height: "160px",
                        borderRadius: "12px",
                        objectFit: "cover",
                      }}
                    />
                  ) : file.type?.includes("pdf") ? (
                    <iframe
                      src={file.preview}
                      title={file.name}
                      width="100%"
                      height="170px"
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                      }}
                    />
                  ) : null}

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                    <Button size="small" variant="outlined" onClick={() => window.open(file.preview, "_blank") }>
                      View Full
                    </Button>
                    <IconButton color="error" onClick={() => handleRemoveFile(index)}>
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </BusinessFormSection>
    </>
  );
};

export default BusinessFormStep1;
