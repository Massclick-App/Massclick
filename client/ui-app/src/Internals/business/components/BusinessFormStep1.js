import React from "react";
import { Button, Typography, IconButton } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import BusinessFormSection from "./BusinessFormSection";
import styles from "../business.module.css";

const cx = createScopedClassNames(styles);

const getDocumentUrl = (document) => {
  if (!document) return "";
  if (typeof document === "string") return document;
  return document.url || document.preview || document.href || "";
};

const isPreviewableImage = (url = "") => /\.(png|jpe?g|webp|gif|bmp|avif)(?:\?|$)/i.test(url);
const isPdfDocument = (url = "") => /\.pdf(?:\?|$)/i.test(url);

const BusinessFormStep1 = ({
  kycFiles,
  existingKycDocuments = [],
  handleKycUpload,
  handleRemoveFile,
  handleRemoveStoredDocument,
  handleSectionAdvance,
  getSectionNavigation,
  getSectionRefKey,
  getSectionIsDisabled,
  renderFieldError,
  editMode,
  saveSectionData,
  sectionSavingState,
}) => {
  const isDisabled = getSectionIsDisabled ? getSectionIsDisabled(1, "kycDocuments") : false;
  const navigation = getSectionNavigation ? getSectionNavigation(1, "kycDocuments") : null;
  const storedDocuments = Array.isArray(existingKycDocuments)
    ? existingKycDocuments.map(getDocumentUrl).filter(Boolean)
    : [];
  const totalDocumentCount = storedDocuments.length + kycFiles.length;
  const renderPreview = ({ src, name, type }) => {
    if (type?.includes("image") || isPreviewableImage(src)) {
      return <img src={src} alt={name} className={cx("kyc-document-preview-image")} />;
    }

    if (type?.includes("pdf") || isPdfDocument(src)) {
      return (
        <iframe
          src={src}
          title={name}
          className={cx("kyc-document-preview-frame")}
        />
      );
    }

    return (
      <div className={cx("kyc-document-placeholder")}>
        <span className={cx("kyc-document-placeholder-icon")}>DOC</span>
        <span>Preview not available</span>
      </div>
    );
  };

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
        showAdvanceButton={!editMode && !!navigation}
        onAdvance={() => handleSectionAdvance(1, "kycDocuments")}
        advanceLabel={navigation?.label || "Next"}
        advanceType={navigation?.type === "submit" ? "submit" : "next"}
        showSaveButton={editMode}
        onSave={() => saveSectionData("kycDocuments")}
        isSaving={sectionSavingState["kycDocuments"] || false}
      >
        <div className={cx("section-intro") }>
          <div className={cx("section-intro-copy") }>
            <p className={cx("section-eyebrow")}>Verification</p>
            <p className={cx("section-summary")}>Upload clear documents so the listing can be reviewed without back-and-forth. PDFs and images work best when they are sharp and uncropped.</p>
          </div>
          <div className={cx("section-stat")}>{totalDocumentCount} file(s)</div>
        </div>

        <div className={cx("kyc-upload-card")}>
          <div className={cx("kyc-upload-copy")}>
              <label className={cx("input-label")}>Upload Documents (PDF, PNG, JPG)</label>
              <p className={cx("upload-panel-copy")}>Add Aadhaar, GST, ownership papers, or any other verification files that help the review team move faster.</p>
          </div>
          <Button variant="contained" component="label" startIcon={<CloudUploadIcon />} className={cx("upload-button")}>
              Upload Files
              <input type="file" multiple hidden onChange={handleKycUpload} accept=".pdf,.png,.jpg,.jpeg" />
          </Button>
          {renderFieldError("kycDocuments")}
        </div>

        <div className={cx("kyc-file-list")}>
          {totalDocumentCount === 0 ? (
            <div className={cx("field-card", "field-span-full")} style={{ textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
                No documents uploaded yet. Add one or more files to build the KYC bundle.
              </Typography>
            </div>
          ) : (
            <>
            {storedDocuments.map((url, index) => {
              const name = `Stored document ${index + 1}`;
              return (
                <div key={`stored-${url}-${index}`} className={cx("kyc-document-card")}>
                  <div className={cx("kyc-document-topbar")}>
                    <div className={cx("kyc-document-title")}>
                      <span className={cx("kyc-document-type-icon")}>DOC</span>
                      <span className={cx("kyc-document-name")}>{name}</span>
                    </div>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleRemoveStoredDocument?.(index)}
                      aria-label={`Delete ${name}`}
                      className={cx("kyc-document-icon-button")}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </div>
                  <div className={cx("kyc-document-preview")}>
                    {renderPreview({ src: url, name })}
                  </div>
                  <div className={cx("kyc-document-actions")}>
                    <Button size="small" variant="outlined" onClick={() => window.open(url, "_blank")}>
                      View Full
                    </Button>
                    <Button size="small" color="error" variant="text" onClick={() => handleRemoveStoredDocument?.(index)}>
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
            {kycFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className={cx("kyc-document-card")}>
                <div className={cx("kyc-document-topbar")}>
                  <div className={cx("kyc-document-title")}>
                    <span className={cx("kyc-document-type-icon")}>DOC</span>
                    <span className={cx("kyc-document-name")}>{file.name || `New document ${index + 1}`}</span>
                  </div>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => handleRemoveFile(index)}
                    aria-label={`Delete ${file.name || `New document ${index + 1}`}`}
                    className={cx("kyc-document-icon-button")}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </div>
                <div className={cx("kyc-document-preview")}>
                  {renderPreview({ src: file.preview, name: file.name, type: file.type })}
                </div>
                <div className={cx("kyc-document-actions")}>
                    <Button size="small" variant="outlined" onClick={() => window.open(file.preview, "_blank") }>
                      View Full
                    </Button>
                    <Button size="small" color="error" variant="text" onClick={() => handleRemoveFile(index)}>
                      Delete
                    </Button>
                </div>
              </div>
            ))}
            </>
          )}
        </div>
      </BusinessFormSection>
    </>
  );
};

export default BusinessFormStep1;
