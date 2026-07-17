import React, { useState } from "react";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { generateCategoryKeywordsPdf } from "./generateCategoryKeywordsPdf";
import styles from "./CategoryPdfDownload.module.css";

export default function CategoryPdfDownload({ loadCategories, onError }) {
  const [status, setStatus] = useState("idle");
  const loading = status === "loading";

  const handleDownload = async () => {
    setStatus("loading");
    try {
      const categories = await loadCategories();
      if (!categories.length) {
        throw new Error("No categories are available to export.");
      }
      generateCategoryKeywordsPdf(categories);
      setStatus("success");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch (error) {
      setStatus("idle");
      onError?.(
        error?.message || "Unable to create the category keywords PDF.",
      );
    }
  };

  return (
    <button
      type="button"
      className={styles.exportButton}
      onClick={handleDownload}
      disabled={loading}
      aria-busy={loading}
      aria-label="Download the complete category and keyword directory as PDF"
    >
      <span className={styles.iconWrap} aria-hidden="true">
        {status === "success" ? (
          <CheckRoundedIcon />
        ) : (
          <PictureAsPdfOutlinedIcon />
        )}
      </span>
      <span className={styles.copy}>
        <span className={styles.eyebrow}>PDF directory</span>
        <span className={styles.label}>
          {loading
            ? "Building your export…"
            : status === "success"
              ? "Download ready"
              : "Export categories"}
        </span>
      </span>
      <span
        className={`${styles.actionIcon} ${loading ? styles.spinning : ""}`}
        aria-hidden="true"
      >
        <FileDownloadOutlinedIcon />
      </span>
    </button>
  );
}
