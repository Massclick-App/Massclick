import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import axiosInstance from "../../services/axiosInstance.js";

const API_URL = process.env.REACT_APP_API_URL;
const PAGE_SIZE = 500;

const DATA_SOURCES = [
  { key: "businesslist", endpoint: "/businesslist/viewall" },
  { key: "categories", endpoint: "/category/viewall" },
  { key: "locations", endpoint: "/location/viewall" },
  { key: "seo", endpoint: "/seo/viewall" },
];

const getToken = () => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    throw new Error("Admin session expired. Please log in again.");
  }
  return token;
};

const normalizeResponseRows = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
};

const getTotalFromPayload = (payload, rows = []) => {
  const total =
    payload?.total ??
    payload?.count ??
    payload?.meta?.total ??
    payload?.pagination?.total;

  if (Number.isFinite(Number(total))) {
    return Number(total);
  }

  return rows.length;
};

async function fetchCollectionPage(collection, pageNo, pageSize = PAGE_SIZE) {
  const response = await axiosInstance.get(`${API_URL}${collection.endpoint}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
    params: {
      pageNo,
      pageSize,
      status: "all",
    },
  });

  const payload = response.data || {};
  const rows = normalizeResponseRows(payload);
  const total = getTotalFromPayload(payload, rows);

  return { rows, total };
}

async function fetchAllCollectionRows(collection) {
  const rows = [];
  let pageNo = 1;
  let total = null;

  while (true) {
    const result = await fetchCollectionPage(collection, pageNo, PAGE_SIZE);
    const batch = Array.isArray(result.rows) ? result.rows : [];
    const nextTotal = Number(result.total);

    if (Number.isFinite(nextTotal) && nextTotal > 0) {
      total = nextTotal;
    }

    if (batch.length === 0) {
      break;
    }

    rows.push(...batch);

    if (total != null && rows.length >= total) {
      break;
    }

    if (total == null && batch.length < PAGE_SIZE) {
      break;
    }

    pageNo += 1;
  }

  return rows;
}

const normalizeText = (value) => String(value || "").trim().toLowerCase();
const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");
const getCategoryName = (row) => String(row?.category || row?.subcategory || "Uncategorised").trim();
const getLocationName = (row) => String(row?.location || row?.city || row?.district || "").trim();

const isActiveRow = (row) =>
  row?.isActive !== false &&
  row?.status !== "inactive" &&
  row?.status !== "disabled" &&
  row?.deleted !== true;

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const downloadFile = (fileName, content, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const buildMasterLocationMap = (rows = []) => {
  const map = new Map();

  rows.forEach((row) => {
    const location = getLocationName(row);
    const key = normalizeText(location);
    if (!key || map.has(key)) return;
    map.set(key, location);
  });

  return map;
};

const matchLocationToMaster = (rawLocation, masterLocationMap) => {
  const location = String(rawLocation || "").trim();
  const key = normalizeText(location);

  if (!key) {
    return {
      canonical: "",
      warning: "",
    };
  }

  const canonical = masterLocationMap.get(key);

  if (!canonical) {
    return {
      canonical: "",
      warning: `Missing in master: ${location}`,
    };
  }

  if (canonical !== location) {
    return {
      canonical,
      warning: `Case mismatch: ${location} -> ${canonical}`,
    };
  }

  return {
    canonical,
    warning: "",
  };
};

const getCoverageLabel = (businessCount, metaSeoCount) => {
  if (businessCount > 0 && metaSeoCount > 0) return "Covered";
  if (businessCount > 0 && metaSeoCount === 0) return "Missing SEO";
  if (businessCount === 0 && metaSeoCount > 0) return "SEO Only";
  return "No Data";
};

const getCoverageChipSx = (coverage) => {
  if (coverage === "Covered") {
    return { bgcolor: "#eaf8ef", color: "#166534", borderColor: "#b7ebc6" };
  }
  if (coverage === "Missing SEO") {
    return { bgcolor: "#fff4e8", color: "#b45309", borderColor: "#fed7aa" };
  }
  if (coverage === "SEO Only") {
    return { bgcolor: "#eef4ff", color: "#1d4ed8", borderColor: "#bfdbfe" };
  }
  return { bgcolor: "#f3f4f6", color: "#4b5563", borderColor: "#d1d5db" };
};

const buildExcelReportHtml = ({ title, subtitle, filters, columns, rows }) => {
  const filtersHtml = filters.length
    ? `
      <table class="filters"><tr>
        ${filters
          .map(
            (item) => `
              <td class="filter-chip">
                <span class="filter-label">${escapeHtml(item.label)}:</span>
                <span class="filter-value">${escapeHtml(item.value)}</span>
              </td>
            `
          )
          .join("")}
      </tr></table>
    `
    : "";

  const headHtml = columns
    .map((column) => `<th style="width:${column.width || "16%"}">${escapeHtml(column.label)}</th>`)
    .join("");

  const bodyHtml = rows.length
    ? rows
        .map((row) => {
          return `
            <tr>
              ${columns
                .map((column) => {
                  const rawValue = row[column.key];
                  const value = column.format ? column.format(rawValue, row) : rawValue;
                  const align = column.type === "number" ? "right" : "left";
                  const warningClass =
                    column.key === "locationWarning" && String(value) !== "OK" ? "warning-cell" : "";
                  const coverageClass = column.key === "coverage" ? `coverage-${normalizeText(value).replaceAll(" ", "-")}` : "";

                  return `
                    <td class="${warningClass} ${coverageClass}" style="text-align:${align}">
                      ${escapeHtml(value)}
                    </td>
                  `;
                })
                .join("")}
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="${columns.length}" class="empty-state">No rows available</td></tr>`;

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <meta name="ProgId" content="Excel.Sheet" />
        <style>
          body {
            font-family: Calibri, Arial, sans-serif;
            color: #172033;
            margin: 24px;
          }
          .title {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 6px;
            color: #172033;
          }
          .subtitle {
            font-size: 12px;
            color: #66758a;
            margin-bottom: 16px;
          }
          .filters {
            border-collapse: separate;
            border-spacing: 8px;
            margin-bottom: 14px;
          }
          .filter-chip {
            background: #f8fafc;
            border: 1px solid #dbe4ef;
            border-radius: 999px;
            padding: 6px 10px;
            font-size: 11px;
            color: #425066;
          }
          .filter-label {
            font-weight: 700;
            margin-right: 4px;
          }
          table.report {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          table.report thead th {
            background: #143d66;
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            padding: 10px 12px;
            border: 1px solid #d9e2ec;
          }
          table.report tbody td {
            font-size: 11px;
            padding: 8px 10px;
            border: 1px solid #e5eaf1;
            vertical-align: top;
            word-wrap: break-word;
          }
          table.report tbody tr:nth-child(even) td {
            background: #f8fafc;
          }
          .warning-cell {
            background: #fff7ed;
            color: #b45309;
            font-weight: 600;
          }
          .coverage-covered {
            background: #eaf8ef;
            color: #166534;
            font-weight: 600;
          }
          .coverage-missing-seo {
            background: #fff4e8;
            color: #b45309;
            font-weight: 600;
          }
          .coverage-seo-only {
            background: #eef4ff;
            color: #1d4ed8;
            font-weight: 600;
          }
          .coverage-no-data {
            background: #f3f4f6;
            color: #4b5563;
            font-weight: 600;
          }
          .empty-state {
            text-align: center;
            color: #66758a;
            padding: 18px;
          }
        </style>
      </head>
      <body>
        <div class="title">${escapeHtml(title)}</div>
        <div class="subtitle">${escapeHtml(subtitle)}</div>
        ${filtersHtml}
        <table class="report">
          <thead>
            <tr>${headHtml}</tr>
          </thead>
          <tbody>
            ${bodyHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;
};

const exportExcelReport = ({ fileName, title, subtitle, filters, columns, rows }) => {
  const html = buildExcelReportHtml({ title, subtitle, filters, columns, rows });
  downloadFile(fileName, html, "application/vnd.ms-excel;charset=utf-8;");
};

const compactFilterBarSx = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 1,
  p: 1.25,
  mb: 1.75,
  border: "1px solid #e6edf5",
  borderRadius: 3,
  bgcolor: "#f8fafc",
};

const compactFieldSx = {
  "& .MuiOutlinedInput-root": {
    height: 38,
    borderRadius: 2.5,
    bgcolor: "#ffffff",
  },
  "& .MuiInputLabel-root": {
    fontSize: 13,
  },
  "& .MuiInputBase-input": {
    fontSize: 13,
  },
};

export default function AdminDataAnalytics() {
  const [data, setData] = useState({
    businesslist: [],
    categories: [],
    locations: [],
    seo: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const loadTableData = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);
    setError("");

    try {
      const nextData = {};

      for (const source of DATA_SOURCES) {
        nextData[source.key] = await fetchAllCollectionRows(source);
      }

      setData(nextData);
    } catch (loadError) {
      setError(loadError.message || "Unable to load category coverage analytics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  useEffect(() => {
    setPage(0);
  }, [search, selectedLocation]);

  const masterLocationMap = useMemo(() => buildMasterLocationMap(data.locations), [data.locations]);

  const locationOptions = useMemo(() => {
    const values = Array.from(masterLocationMap.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    return ["all", ...values];
  }, [masterLocationMap]);

  const combinedRows = useMemo(() => {
    const seoCounts = new Map();
    const businessCounts = new Map();
    const warningMap = new Map();
    const categoryMap = new Map();
    const selectedLocationKey = normalizeText(selectedLocation);

    const collectWarning = (scopedKey, warning) => {
      if (!warning) return;
      const warnings = warningMap.get(scopedKey) || new Set();
      warnings.add(warning);
      warningMap.set(scopedKey, warnings);
    };

    data.seo.forEach((row) => {
      const category = getCategoryName(row);
      const categoryKey = normalizeText(category);
      const matchedLocation = matchLocationToMaster(getLocationName(row), masterLocationMap);
      const scopedKey = `${categoryKey}::${selectedLocation === "all" ? "all" : selectedLocationKey}`;

      if (selectedLocation !== "all" && normalizeText(matchedLocation.canonical) !== selectedLocationKey) {
        return;
      }

      seoCounts.set(scopedKey, (seoCounts.get(scopedKey) || 0) + 1);
      collectWarning(scopedKey, matchedLocation.warning);

      if (selectedLocation === "all") {
        collectWarning(`${categoryKey}::all`, matchedLocation.warning);
      }
    });

    data.businesslist.forEach((row) => {
      const category = getCategoryName(row);
      const categoryKey = normalizeText(category);
      const matchedLocation = matchLocationToMaster(getLocationName(row), masterLocationMap);
      const scopedKey = `${categoryKey}::${selectedLocation === "all" ? "all" : selectedLocationKey}`;

      if (selectedLocation !== "all" && normalizeText(matchedLocation.canonical) !== selectedLocationKey) {
        return;
      }

      businessCounts.set(scopedKey, (businessCounts.get(scopedKey) || 0) + 1);
      collectWarning(scopedKey, matchedLocation.warning);

      if (selectedLocation === "all") {
        collectWarning(`${categoryKey}::all`, matchedLocation.warning);
      }
    });

    data.categories.forEach((row) => {
      const category = getCategoryName(row);
      const key = normalizeText(category);
      const current = categoryMap.get(key);

      if (!current) {
        categoryMap.set(key, {
          category,
          active: isActiveRow(row),
        });
        return;
      }

      if (!current.active && isActiveRow(row)) {
        categoryMap.set(key, { ...current, active: true });
      }
    });

    return Array.from(categoryMap.values())
      .map((item) => {
        const key = `${normalizeText(item.category)}::${selectedLocation === "all" ? "all" : selectedLocationKey}`;
        const businessCount = businessCounts.get(key) || 0;
        const metaSeoCount = seoCounts.get(key) || 0;
        const locationWarning = Array.from(warningMap.get(key) || []).join(" | ") || "OK";

        return {
          category: item.category,
          location: selectedLocation === "all" ? "All locations" : selectedLocation,
          businessCount,
          metaSeoCount,
          coverage: getCoverageLabel(businessCount, metaSeoCount),
          locationWarning,
          active: item.active ? "Active" : "Inactive",
        };
      })
      .filter((row) => {
        if (!search) return true;
        return normalizeText(row.category).includes(normalizeText(search));
      })
      .sort(
        (a, b) =>
          b.businessCount - a.businessCount ||
          b.metaSeoCount - a.metaSeoCount ||
          a.category.localeCompare(b.category, undefined, { sensitivity: "base" })
      );
  }, [data.businesslist, data.categories, data.seo, masterLocationMap, search, selectedLocation]);

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return combinedRows.slice(start, start + rowsPerPage);
  }, [combinedRows, page, rowsPerPage]);

  const summaryStats = useMemo(() => {
    const covered = combinedRows.filter((row) => row.coverage === "Covered").length;
    const missingSeo = combinedRows.filter((row) => row.coverage === "Missing SEO").length;
    const seoOnly = combinedRows.filter((row) => row.coverage === "SEO Only").length;
    const warningRows = combinedRows.filter((row) => row.locationWarning !== "OK").length;

    return [
      { label: "Rows", value: formatNumber(combinedRows.length), color: "#172033", bg: "#eef2f7" },
      { label: "Covered", value: formatNumber(covered), color: "#166534", bg: "#eaf8ef" },
      { label: "Missing SEO", value: formatNumber(missingSeo), color: "#b45309", bg: "#fff4e8" },
      { label: "SEO Only", value: formatNumber(seoOnly), color: "#1d4ed8", bg: "#eef4ff" },
      { label: "Location Warnings", value: formatNumber(warningRows), color: "#92400e", bg: "#fff7ed" },
    ];
  }, [combinedRows]);

  const exportRows = useCallback(() => {
    const rows = combinedRows.map((row) => ({
      category: row.category,
      location: row.location,
      businessCount: row.businessCount,
      metaSeoCount: row.metaSeoCount,
      coverage: row.coverage,
      locationWarning: row.locationWarning,
      status: row.active,
    }));

    exportExcelReport({
      fileName: `category-coverage-${selectedLocation === "all" ? "all-locations" : selectedLocation}.xls`,
      title: "Category Coverage by Location",
      subtitle: "Business count and Meta SEO count in one combined export, matched against master locations.",
      filters: [
        { label: "Location", value: selectedLocation === "all" ? "All locations" : selectedLocation },
        { label: "Search", value: search || "All categories" },
        { label: "Rows", value: formatNumber(rows.length) },
      ],
      columns: [
        { key: "category", label: "Category", width: "24%" },
        { key: "location", label: "Location", width: "18%" },
        { key: "businessCount", label: "Business Count", width: "12%", type: "number" },
        { key: "metaSeoCount", label: "Meta SEO Count", width: "12%", type: "number" },
        { key: "coverage", label: "Coverage", width: "12%" },
        { key: "locationWarning", label: "Location Warning", width: "14%" },
        { key: "status", label: "Status", width: "8%" },
      ],
      rows,
    });
  }, [combinedRows, search, selectedLocation]);

  return (
    <Box sx={{ width: "100%", p: { xs: 1.5, md: 2 }, bgcolor: "#f3f6fb", minHeight: "100%" }}>
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          p: { xs: 2, md: 2.5 },
          borderRadius: 5,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.05)",
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", lg: "center" }}
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 900, color: "#172033", letterSpacing: -0.3 }}>
              Category Coverage by Location
            </Typography>
            <Typography sx={{ fontSize: 13, color: "#66758a", mt: 0.5 }}>
              One compact table for business count, Meta SEO count, location quality, and coverage gaps.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<DownloadRoundedIcon />}
              onClick={exportRows}
              disabled={!combinedRows.length}
              sx={{
                textTransform: "none",
                fontWeight: 800,
                bgcolor: "#143d66",
                borderRadius: 2.5,
                boxShadow: "none",
                "&:hover": { bgcolor: "#102f50", boxShadow: "none" },
              }}
            >
              Export Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={loadTableData}
              disabled={refreshing}
              sx={{
                textTransform: "none",
                fontWeight: 800,
                borderRadius: 2.5,
                borderColor: "#d5deea",
                color: "#172033",
              }}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </Stack>
        </Stack>

        <Box sx={compactFilterBarSx}>
          <Chip
            label="Filters"
            size="small"
            sx={{ fontWeight: 800, bgcolor: "#e8eef7", color: "#425066", borderRadius: 2 }}
          />

          <TextField
            label="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            size="small"
            placeholder="Category name"
            sx={{
              ...compactFieldSx,
              flex: "1 1 280px",
              minWidth: { xs: "100%", md: 280 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 17, color: "#7a8699" }} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            select
            label="Location"
            value={selectedLocation}
            onChange={(event) => setSelectedLocation(event.target.value)}
            size="small"
            sx={{
              ...compactFieldSx,
              flex: "0 1 240px",
              minWidth: { xs: "100%", md: 220 },
            }}
          >
            {locationOptions.map((location) => (
              <MenuItem key={location} value={location}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <PublicRoundedIcon sx={{ fontSize: 16, color: "#7a8699" }} />
                  {location === "all" ? "All locations" : location}
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.75 }}>
          {summaryStats.map((item) => (
            <Chip
              key={item.label}
              label={`${item.label}: ${item.value}`}
              sx={{
                fontWeight: 800,
                bgcolor: item.bg,
                color: item.color,
                borderRadius: 2,
              }}
            />
          ))}
        </Stack>

        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 999 }} />}

        {error ? (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
            {error}
          </Alert>
        ) : null}

        <TableContainer
          sx={{
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            overflow: "hidden",
            bgcolor: "#ffffff",
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#143d66" }}>
                <TableCell sx={{ color: "#ffffff", fontWeight: 800 }}>Category</TableCell>
                <TableCell sx={{ color: "#ffffff", fontWeight: 800 }}>Location</TableCell>
                <TableCell sx={{ color: "#ffffff", fontWeight: 800 }} align="right">
                  Business Count
                </TableCell>
                <TableCell sx={{ color: "#ffffff", fontWeight: 800 }} align="right">
                  Meta SEO Count
                </TableCell>
                <TableCell sx={{ color: "#ffffff", fontWeight: 800 }}>Coverage</TableCell>
                <TableCell sx={{ color: "#ffffff", fontWeight: 800 }}>Location Warning</TableCell>
                <TableCell sx={{ color: "#ffffff", fontWeight: 800 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, index) => (
                  <TableRow
                    key={`${row.category}-${row.location}`}
                    sx={{
                      bgcolor: index % 2 === 0 ? "#ffffff" : "#fafbfd",
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700, color: "#172033" }}>{row.category}</TableCell>
                    <TableCell>{row.location}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatNumber(row.businessCount)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatNumber(row.metaSeoCount)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.coverage}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          border: "1px solid",
                          borderRadius: 2,
                          ...getCoverageChipSx(row.coverage),
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: row.locationWarning === "OK" ? "#166534" : "#b45309", fontWeight: 700 }}>
                      {row.locationWarning}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.active}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          borderRadius: 2,
                          bgcolor: row.active === "Active" ? "#eefbf3" : "#f5f5f5",
                          color: row.active === "Active" ? "#166534" : "#52525b",
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#66758a" }}>
                    No category coverage rows found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={combinedRows.length}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          sx={{
            mt: 1,
            "& .MuiTablePagination-toolbar": {
              px: 0.5,
            },
          }}
        />
      </Paper>
    </Box>
  );
}
