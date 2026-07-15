import React, { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { generateCategoryKeywordsPdf } from "./generateCategoryKeywordsPdf";

export default function CategoryPdfDownload({ loadCategories, onError }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const categories = await loadCategories();
      if (!categories.length)
        throw new Error("No categories are available to export.");
      generateCategoryKeywordsPdf(categories);
    } catch (error) {
      onError?.(
        error?.message || "Unable to create the category keywords PDF.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      size="small"
      startIcon={
        loading ? (
          <CircularProgress size={16} color="inherit" />
        ) : (
          <FileDownloadOutlinedIcon />
        )
      }
      onClick={handleDownload}
      disabled={loading}
      sx={{
        textTransform: "none",
        bgcolor: "#f5670f",
        boxShadow: "0 5px 14px rgba(245, 103, 15, 0.22)",
        "&:hover": { bgcolor: "#dc5708" },
      }}
    >
      {loading ? "Preparing PDF..." : "Download All Categories PDF"}
    </Button>
  );
}
