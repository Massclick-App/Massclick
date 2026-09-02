import React from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import Box from "@mui/material/Box";

export default function BusinessDocumentsNav() {
  const navigate = useNavigate();

  return (
    <Box
      component="button"
      type="button"
      onClick={() => navigate("/user_marketing-materials")}
      aria-label="Back to Marketing Materials home"
      sx={{
        display: "inline-flex",
        minHeight: 38,
        alignItems: "center",
        gap: 0.8,
        px: 1.4,
        mb: 0,
        border: "1px solid #dbe3ee",
        borderRadius: "999px",
        bgcolor: "#ffffff",
        color: "#334155",
        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
        fontFamily: "inherit",
        fontSize: "0.78rem",
        fontWeight: 800,
        cursor: "pointer",
        transition: "border-color .18s ease, background-color .18s ease, color .18s ease, transform .18s ease, box-shadow .18s ease",
        "&:hover": {
          borderColor: "#fdba74",
          bgcolor: "#fff7ed",
          color: "#ea580c",
          transform: "translateX(-2px)",
          boxShadow: "0 6px 16px rgba(234, 88, 12, 0.1)",
        },
        "&:focus-visible": { outline: "3px solid rgba(249,115,22,.24)", outlineOffset: 2 },
      }}
    >
      <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
      <span>Back to Materials</span>
    </Box>
  );
}
