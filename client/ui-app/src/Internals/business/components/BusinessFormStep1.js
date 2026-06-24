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
  getSectionRefKey,
  collapsedSections,
  toggleSectionCollapsed,
  renderFieldError,
}) => {
  const refKey = getSectionRefKey(1, "kycDocuments");
  const isCollapsed = collapsedSections[refKey] ?? false;

  return (
    <>
      <BusinessFormSection
        step={1}
        sectionKey="kycDocuments"
        title="KYC Documents"
        subtitle="Upload identity proof and business documents"
        isCollapsed={isCollapsed}
        isDisabled={false}
        onToggleCollapse={() => toggleSectionCollapsed(1, "kycDocuments")}
        onAdvance={() => handleSectionAdvance(1, "kycDocuments")}
        showAdvanceButton={true}
      >
        <div className={cx("form-input-group col-span-all")}>
          <label className={cx("input-label")}>📄 Upload Documents (PDF, PNG, JPG)</label>

          <Button variant="contained" component="label" startIcon={<CloudUploadIcon />} className={cx("upload-button")}>
            Upload Files
            <input type="file" multiple hidden onChange={handleKycUpload} accept=".pdf,.png,.jpg,.jpeg" />
          </Button>

          <div className={cx("kyc-file-list")}>
            {kycFiles.map((file, index) => (
              <div key={index} className={cx("kyc-file-item")}>
                <Typography variant="body2">
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
                        width: "100px",
                        height: "100px",
                        borderRadius: "8px",
                        objectFit: "cover",
                      }}
                    />
                  ) : file.type?.includes("pdf") ? (
                    <iframe
                      src={file.preview}
                      title={file.name}
                      width="100%"
                      height="150px"
                      style={{
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                      }}
                    />
                  ) : null}

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Button size="small" variant="outlined" onClick={() => window.open(file.preview, "_blank")}>
                      View Full
                    </Button>
                    <IconButton color="error" onClick={() => handleRemoveFile(index)}>
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {renderFieldError("kycDocuments")}
        </div>
      </BusinessFormSection>
    </>
  );
};

export default BusinessFormStep1;
