import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Toolbar from "@mui/material/Toolbar";

const documentOptions = [
  { label: "Visiting Card", path: "/user_visiting-card" },
  { label: "Letterhead", path: "/user_letterhead" },
  { label: "Quotation", path: "/user_quotation" },
];

export default function BusinessDocumentsNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = documentOptions.some((option) => option.path === location.pathname)
    ? location.pathname
    : documentOptions[0].path;

  return (
    <Box
      sx={{
        maxWidth: 760,
        mx: "auto",
        mb: 3,
        borderRadius: 2,
        overflow: "hidden",
        boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "#ffffff",
          color: "#0f172a",
          border: "1px solid rgba(148, 163, 184, 0.28)",
        }}
      >
        <Toolbar disableGutters sx={{ minHeight: "52px !important", px: { xs: 0.5, sm: 1 } }}>
          <Tabs
            value={currentPath}
            onChange={(event, value) => navigate(value)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Business document pages"
            sx={{
              width: "100%",
              minHeight: 52,
              "& .MuiTabs-indicator": {
                height: 3,
                borderRadius: "3px 3px 0 0",
                backgroundColor: "#f97316",
              },
              "& .MuiTab-root": {
                minHeight: 52,
                flex: { sm: 1 },
                color: "#475569",
                fontWeight: 800,
                textTransform: "none",
                fontSize: { xs: "0.86rem", sm: "0.95rem" },
              },
              "& .MuiTab-root.Mui-selected": {
                color: "#f97316",
              },
            }}
          >
            {documentOptions.map((option) => (
              <Tab key={option.path} value={option.path} label={option.label} />
            ))}
          </Tabs>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
