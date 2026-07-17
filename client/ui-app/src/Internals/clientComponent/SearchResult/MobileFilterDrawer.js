import React from "react";
import { Box, Button, Drawer } from "@mui/material";
import FilterPanel from "./FilterPanel.js";

const MobileFilterDrawer = ({
  open,
  onClose,
  filterConfig,
  activeFilters,
  sortBy,
  onFilterChange,
  onSortChange,
  onClearAll,
  hasGeo,
  totalActiveCount,
}) => (
  <Drawer
    anchor="bottom"
    open={open}
    onClose={onClose}
    PaperProps={{
      sx: {
        borderRadius: "16px 16px 0 0",
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      },
    }}
  >
    <Box
      sx={{
        overflowY: "auto",
        flex: 1,
        p: 2,
        WebkitOverflowScrolling: "touch",
      }}
    >
      <FilterPanel
        filterConfig={filterConfig}
        activeFilters={activeFilters}
        sortBy={sortBy}
        onFilterChange={onFilterChange}
        onSortChange={onSortChange}
        onClearAll={onClearAll}
        hasGeo={hasGeo}
      />
    </Box>
    <Box
      sx={{
        p: 2,
        pt: 1,
        flexShrink: 0,
        borderTop: "1px solid #f1f5f9",
        bgcolor: "#fff",
      }}
    >
      <Button
        fullWidth
        variant="contained"
        onClick={onClose}
        sx={{
          bgcolor: "#ff8c00",
          "&:hover": { bgcolor: "#e07800" },
          borderRadius: 2,
          fontWeight: 700,
        }}
      >
        Apply Filters {totalActiveCount > 0 ? `(${totalActiveCount})` : ""}
      </Button>
    </Box>
  </Drawer>
);

export default MobileFilterDrawer;
