import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSnackbar } from "notistack";
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import axiosInstance from "../../services/axiosInstance.js";

const API_URL = process.env.REACT_APP_API_URL;
const PAGE_SIZE = 500;

const REPORT_SOURCES = [
  {
    key: "businesslist",
    label: "Business List",
    endpoint: "/businesslist/viewall",
    icon: StorefrontRoundedIcon,
    tone: "#ea6d11",
  },
  {
    key: "categories",
    label: "Categories",
    endpoint: "/category/viewall",
    icon: CategoryRoundedIcon,
    tone: "#2563eb",
  },
  {
    key: "locations",
    label: "Locations",
    endpoint: "/location/viewall",
    icon: PublicRoundedIcon,
    tone: "#16803c",
  },
  {
    key: "seo",
    label: "SEO",
    endpoint: "/seo/viewall",
    icon: SearchRoundedIcon,
    tone: "#7c3aed",
  },
  {
    key: "pages",
    label: "Pages",
    endpoint: "/seopagecontent/viewall",
    icon: ArticleRoundedIcon,
    tone: "#0f766e",
  },
  {
    key: "pageBlogs",
    label: "Page Blogs",
    endpoint: "/seopagecontentblog/viewall",
    icon: AutoGraphRoundedIcon,
    tone: "#dc2626",
  },
];

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

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

async function fetchAllCollectionRows(collection, onProgress) {
  const rows = [];
  let pageNo = 1;

  while (true) {
    const result = await fetchCollectionPage(collection, pageNo, PAGE_SIZE);
    rows.push(...result.rows);

    if (typeof onProgress === "function") {
      onProgress(rows.length, result.total);
    }

    if (result.rows.length < PAGE_SIZE || rows.length >= result.total) {
      break;
    }

    pageNo += 1;
  }

  return rows;
}

const csvEscape = (value) => {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

const flattenValue = (value) => {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item == null) return "";
        if (typeof item === "object") return JSON.stringify(item);
        return String(item);
      })
      .filter(Boolean)
      .join(" | ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const flattenRecord = (record, prefix = "", output = {}) => {
  Object.entries(record || {}).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      if (Object.keys(value).length === 0) {
        output[nextKey] = "";
        return;
      }

      flattenRecord(value, nextKey, output);
      return;
    }

    output[nextKey] = flattenValue(value);
  });

  return output;
};

const rowsToCsv = (rows = []) => {
  const flattenedRows = rows.map((row) => flattenRecord(row));
  const headers = Array.from(
    flattenedRows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  const lines = [
    headers.map(csvEscape).join(","),
    ...flattenedRows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(",")),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
};

const downloadFile = (fileName, content) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const countBy = (rows, predicate) =>
  rows.reduce((count, row) => count + (predicate(row) ? 1 : 0), 0);

const groupBy = (rows, selector) => {
  const map = new Map();
  rows.forEach((row) => {
    const key = selector(row);
    if (!key) return;
    const current = map.get(key) || [];
    current.push(row);
    map.set(key, current);
  });
  return map;
};

const uniqueCount = (values) =>
  new Set(values.map((value) => String(value || "").trim()).filter(Boolean)).size;

const hasValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(String(value || "").trim());
};

const isActiveRow = (row) =>
  row?.isActive !== false &&
  row?.status !== "inactive" &&
  row?.status !== "disabled" &&
  row?.deleted !== true;

const getCategoryName = (row) => String(row?.category || row?.subcategory || "Uncategorised").trim();
const getLocationName = (row) => String(row?.location || row?.city || row?.district || "Unspecified").trim();
const getPageTypeName = (row) => String(row?.pageType || "unknown").trim();

function MetricCard({ icon: Icon, label, value, helper, tone = "#ea6d11" }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        borderRadius: 3,
        border: "1px solid #e5e9f0",
        bgcolor: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        minHeight: 132,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#657084" }}>
          {label}
        </Typography>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            bgcolor: `${tone}16`,
            color: tone,
          }}
        >
          <Icon fontSize="small" />
        </Box>
      </Stack>

      <Box>
        <Typography sx={{ fontSize: 30, lineHeight: 1.05, fontWeight: 900, color: "#172033" }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: 13, color: "#657084", mt: 0.5 }}>
          {helper}
        </Typography>
      </Box>
    </Paper>
  );
}

function PreviewTable({ columns = [], rows = [] }) {
  const previewRows = rows.slice(0, 5);

  if (!columns.length || !previewRows.length) {
    return (
      <Box
        sx={{
          minHeight: 160,
          display: "grid",
          placeItems: "center",
          color: "#657084",
          border: "1px dashed #e5e9f0",
          borderRadius: 2,
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
          No rows to preview yet.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer
      sx={{
        border: "1px solid #eef2f7",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.key} sx={{ fontWeight: 800, color: "#172033", bgcolor: "#fbfcfe" }}>
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {previewRows.map((row, rowIndex) => (
            <TableRow key={`${rowIndex}-${columns[0]?.key || "row"}`}>
              {columns.map((column) => (
                <TableCell key={`${rowIndex}-${column.key}`}>
                  {column.render ? column.render(row[column.key], row) : row[column.key] ?? "N/A"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ReportSection({
  title,
  subtitle,
  rows,
  columns,
  metrics = [],
  tone = "#ea6d11",
  exporting = false,
  onExport,
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 4,
        border: "1px solid #e5e9f0",
        bgcolor: "#fff",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={1.25}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 900, color: "#172033" }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: 13, color: "#657084", mt: 0.25 }}>
            {subtitle}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={exporting ? null : <DownloadRoundedIcon />}
          onClick={onExport}
          disabled={exporting}
          sx={{
            bgcolor: tone,
            textTransform: "none",
            fontWeight: 800,
            "&:hover": { bgcolor: tone },
          }}
        >
          {exporting ? "Exporting..." : "Export report CSV"}
        </Button>
      </Stack>

      {metrics.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
          {metrics.map((metric) => (
            <Chip
              key={`${title}-${metric.label}`}
              label={`${metric.label}: ${metric.value}`}
              sx={{
                fontWeight: 800,
                bgcolor: metric.bgcolor || "#fff7f0",
                color: metric.color || tone,
                border: "1px solid",
                borderColor: metric.borderColor || `${tone}28`,
              }}
            />
          ))}
        </Stack>
      )}

      <PreviewTable columns={columns} rows={rows} />
    </Paper>
  );
}

export default function AdminDataAnalytics() {
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState({
    businesslist: [],
    categories: [],
    locations: [],
    seo: [],
    pages: [],
    pageBlogs: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [loadingLabel, setLoadingLabel] = useState("Loading report data...");
  const [exportingKey, setExportingKey] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadReportData = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);
    setError("");
    setLoadingLabel("Loading report data...");

    const nextData = {};
    const failures = [];

    try {
      for (let index = 0; index < REPORT_SOURCES.length; index += 1) {
        const collection = REPORT_SOURCES[index];
        setLoadingLabel(`Loading ${collection.label.toLowerCase()}...`);

        try {
          nextData[collection.key] = await fetchAllCollectionRows(collection);
        } catch (collectionError) {
          nextData[collection.key] = [];
          failures.push(collection.label);
          console.error(`Failed to load ${collection.label}:`, collectionError);
        }
      }

      setData(nextData);
      setLastUpdated(new Date());

      if (failures.length > 0) {
        setError(`Some report sources could not be loaded: ${failures.join(", ")}.`);
      }
    } catch (loadError) {
      setError(loadError.message || "Unable to load analytics reports.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingLabel("Loading report data...");
    }
  }, []);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const businessByCategoryRows = useMemo(() => {
    const grouped = groupBy(data.businesslist, getCategoryName);

    return Array.from(grouped.entries())
      .map(([key, rows]) => {
        const categoryName = rows[0]?.category || rows[0]?.subcategory || "Uncategorised";
        const locations = new Set(rows.map((row) => getLocationName(row)).filter(Boolean));

        return {
          category: categoryName,
          businesses: rows.length,
          activeBusinesses: countBy(rows, isActiveRow),
          liveBusinesses: countBy(rows, (row) => row.businessesLive === true),
          verifiedBusinesses: countBy(rows, (row) => row.verification?.isVerified === true),
          featuredBusinesses: countBy(rows, (row) => row.badges?.isFeatured === true),
          sponsoredBusinesses: countBy(rows, (row) => row.badges?.isSponsored === true),
          trendingBusinesses: countBy(rows, (row) => row.badges?.isTrending === true),
          locations: locations.size,
          key,
        };
      })
      .sort(
        (a, b) =>
          b.businesses - a.businesses ||
          a.category.localeCompare(b.category, undefined, { sensitivity: "base" })
      );
  }, [data.businesslist]);

  const businessByLocationRows = useMemo(() => {
    const grouped = groupBy(data.businesslist, getLocationName);

    return Array.from(grouped.entries())
      .map(([key, rows]) => {
        const locationName = rows[0]?.location || rows[0]?.city || rows[0]?.district || "Unspecified";
        const categories = new Set(rows.map((row) => getCategoryName(row)).filter(Boolean));

        return {
          location: locationName,
          businesses: rows.length,
          activeBusinesses: countBy(rows, isActiveRow),
          liveBusinesses: countBy(rows, (row) => row.businessesLive === true),
          verifiedBusinesses: countBy(rows, (row) => row.verification?.isVerified === true),
          categories: categories.size,
          key,
        };
      })
      .sort(
        (a, b) =>
          b.businesses - a.businesses ||
          a.location.localeCompare(b.location, undefined, { sensitivity: "base" })
      );
  }, [data.businesslist]);

  const categorySeoCoverageRows = useMemo(() => {
    const seoMap = groupBy(data.seo, getCategoryName);
    const pageMap = groupBy(data.pages, getCategoryName);
    const blogMap = groupBy(data.pageBlogs, getCategoryName);
    const businessMap = groupBy(data.businesslist, getCategoryName);

    return data.categories
      .map((category) => {
        const key = getCategoryName(category);
        const seoDocs = seoMap.get(key) || [];
        const pageDocs = pageMap.get(key) || [];
        const blogDocs = blogMap.get(key) || [];
        const businessDocs = businessMap.get(key) || [];
        const pageTypes = new Set([
          ...seoDocs.map((item) => getPageTypeName(item)).filter(Boolean),
          ...pageDocs.map((item) => getPageTypeName(item)).filter(Boolean),
          ...blogDocs.map((item) => getPageTypeName(item)).filter(Boolean),
        ]);
        const locations = new Set([
          ...seoDocs.map((item) => getLocationName(item)).filter(Boolean),
          ...pageDocs.map((item) => getLocationName(item)).filter(Boolean),
          ...blogDocs.map((item) => getLocationName(item)).filter(Boolean),
        ]);
        const keywordCount = Array.isArray(category.keywords) ? category.keywords.length : 0;
        const hasCategorySeoFields = Boolean(category.seoTitle || category.seoDescription);
        const hasFilterConfig = hasValue(category.filterConfig);
        const hasCoreSeo = hasCategorySeoFields || seoDocs.length > 0;
        const hasLandingPage = pageDocs.length > 0;
        const hasBlogPage = blogDocs.length > 0;

        return {
          category: category.category || category.subcategory || "Uncategorised",
          active: isActiveRow(category),
          businesses: businessDocs.length,
          activeBusinesses: countBy(businessDocs, isActiveRow),
          liveBusinesses: countBy(businessDocs, (row) => row.businessesLive === true),
          keywordCount,
          hasFilterConfig,
          hasCategorySeoFields,
          seoDocs: seoDocs.length,
          pageContents: pageDocs.length,
          blogPages: blogDocs.length,
          pageTypes: pageTypes.size,
          locations: locations.size,
          hasCoreSeo,
          hasLandingPage,
          hasBlogPage,
          missingSeoDoc: seoDocs.length === 0,
          missingPageContent: pageDocs.length === 0,
          gapStatus:
            seoDocs.length === 0 && pageDocs.length === 0
              ? "No SEO or page content"
              : seoDocs.length === 0
                ? "Missing SEO doc"
                : pageDocs.length === 0
                  ? "Missing page content"
                  : "Covered",
          key,
        };
      })
      .sort((a, b) => {
        const scoreA =
          (a.hasCategorySeoFields ? 1 : 0) +
          (a.seoDocs > 0 ? 1 : 0) +
          (a.pageContents > 0 ? 1 : 0);
        const scoreB =
          (b.hasCategorySeoFields ? 1 : 0) +
          (b.seoDocs > 0 ? 1 : 0) +
          (b.pageContents > 0 ? 1 : 0);

        return (
          scoreB - scoreA ||
          b.businesses - a.businesses ||
          a.category.localeCompare(b.category, undefined, { sensitivity: "base" })
        );
      });
  }, [data.categories, data.seo, data.pages, data.pageBlogs, data.businesslist]);

  const categoryGapRows = useMemo(
    () =>
      categorySeoCoverageRows.filter(
        (row) => row.missingSeoDoc || row.missingPageContent || !row.hasCoreSeo
      ),
    [categorySeoCoverageRows]
  );

  const pageTypeRows = useMemo(() => {
    const pageDocs = [
      ...data.seo.map((row) => ({ ...row, source: "SEO" })),
      ...data.pages.map((row) => ({ ...row, source: "Page Content" })),
      ...data.pageBlogs.map((row) => ({ ...row, source: "Blog Page" })),
    ];

    const grouped = groupBy(pageDocs, getPageTypeName);

    return Array.from(grouped.entries())
      .map(([key, rows]) => {
        const categories = new Set(rows.map((row) => getCategoryName(row)).filter(Boolean));
        const locations = new Set(rows.map((row) => getLocationName(row)).filter(Boolean));
        const seoDocs = rows.filter((row) => row.source === "SEO");
        const contentDocs = rows.filter((row) => row.source === "Page Content");
        const blogDocs = rows.filter((row) => row.source === "Blog Page");

        return {
          pageType: rows[0]?.pageType || "unknown",
          seoDocs: seoDocs.length,
          seoActive: countBy(seoDocs, isActiveRow),
          pageContents: contentDocs.length,
          pageContentActive: countBy(contentDocs, isActiveRow),
          blogPages: blogDocs.length,
          blogActive: countBy(blogDocs, isActiveRow),
          categories: categories.size,
          locations: locations.size,
          key,
        };
      })
      .sort(
        (a, b) =>
          b.seoDocs + b.pageContents + b.blogPages - (a.seoDocs + a.pageContents + a.blogPages) ||
          a.pageType.localeCompare(b.pageType, undefined, { sensitivity: "base" })
      );
  }, [data.seo, data.pages, data.pageBlogs]);

  const inventoryRows = useMemo(() => {
    const categoriesWithCoreCoverage = categorySeoCoverageRows.filter((row) => row.hasCoreSeo).length;
    const categoriesMissingSeo = categorySeoCoverageRows.filter((row) => row.missingSeoDoc).length;
    const categoriesMissingContent = categorySeoCoverageRows.filter((row) => row.missingPageContent).length;
    const categoriesWithBlogs = categorySeoCoverageRows.filter((row) => row.hasBlogPage).length;
    const distinctBusinessCategories = uniqueCount(data.businesslist.map((row) => getCategoryName(row)));
    const distinctBusinessLocations = uniqueCount(data.businesslist.map((row) => getLocationName(row)));
    const activeLocations = countBy(data.locations, isActiveRow);
    const activeSeoDocs = countBy(data.seo, isActiveRow);
    const activePages = countBy(data.pages, isActiveRow);
    const activeBlogs = countBy(data.pageBlogs, isActiveRow);

    return [
      {
        collection: "Business List",
        records: data.businesslist.length,
        active: countBy(data.businesslist, isActiveRow),
        coverage: `${distinctBusinessCategories} categories / ${distinctBusinessLocations} locations`,
        note: "Business distribution base",
      },
      {
        collection: "Categories",
        records: data.categories.length,
        active: countBy(data.categories, isActiveRow),
        coverage: `${categoriesWithCoreCoverage} categories with SEO signal`,
        note: `${categoriesMissingSeo} missing SEO docs, ${categoriesMissingContent} missing page content`,
      },
      {
        collection: "Locations",
        records: data.locations.length,
        active: activeLocations,
        coverage: `${distinctBusinessLocations} business locations linked`,
        note: "Location master coverage",
      },
      {
        collection: "SEO",
        records: data.seo.length,
        active: activeSeoDocs,
        coverage: `${pageTypeRows.length} page types covered`,
        note: "Metadata coverage by page type",
      },
      {
        collection: "Pages",
        records: data.pages.length,
        active: activePages,
        coverage: `${categoriesWithCoreCoverage} categories with page content`,
        note: "Landing page coverage",
      },
      {
        collection: "Page Blogs",
        records: data.pageBlogs.length,
        active: activeBlogs,
        coverage: `${categoriesWithBlogs} categories with blog pages`,
        note: "Blog-style SEO coverage",
      },
    ];
  }, [categorySeoCoverageRows, data, pageTypeRows.length]);

  const summaryCards = useMemo(() => {
    const categoriesWithCoreCoverage = categorySeoCoverageRows.filter((row) => row.hasCoreSeo).length;
    const categoriesMissingSeo = categorySeoCoverageRows.filter((row) => row.missingSeoDoc).length;
    const categoriesMissingContent = categorySeoCoverageRows.filter((row) => row.missingPageContent).length;
    const categoriesWithBlogs = categorySeoCoverageRows.filter((row) => row.hasBlogPage).length;
    const categoriesWithGaps = categoryGapRows.length;

    return [
      {
        label: "Businesses",
        value: formatNumber(data.businesslist.length),
        helper: "Directory records available for reporting",
        icon: StorefrontRoundedIcon,
        tone: "#ea6d11",
      },
      {
        label: "Covered categories",
        value: formatNumber(categoriesWithCoreCoverage),
        helper: "Categories with SEO metadata or SEO docs",
        icon: CategoryRoundedIcon,
        tone: "#2563eb",
      },
      {
        label: "Missing SEO",
        value: formatNumber(categoriesMissingSeo),
        helper: "Categories without SEO documents",
        icon: SearchRoundedIcon,
        tone: "#dc2626",
      },
      {
        label: "Missing page content",
        value: formatNumber(categoriesMissingContent),
        helper: "Categories without landing page content",
        icon: ArticleRoundedIcon,
        tone: "#0f766e",
      },
      {
        label: "Blog coverage",
        value: formatNumber(categoriesWithBlogs),
        helper: "Categories with at least one blog page",
        icon: AutoGraphRoundedIcon,
        tone: "#7c3aed",
      },
      {
        label: "Gap watchlist",
        value: formatNumber(categoriesWithGaps),
        helper: "Categories needing report attention",
        icon: ViewModuleRoundedIcon,
        tone: "#172033",
      },
    ];
  }, [data.businesslist.length, categorySeoCoverageRows, categoryGapRows.length]);

  const exportReport = useCallback(
    async (label, rows) => {
      try {
        if (!rows.length) {
          enqueueSnackbar(`No rows available for ${label}.`, { variant: "info" });
          return;
        }

        const csv = rowsToCsv(rows);
        const fileName = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date()
          .toISOString()
          .slice(0, 10)}.csv`;
        downloadFile(fileName, csv);
        enqueueSnackbar(`${label} exported as CSV.`, { variant: "success" });
      } catch (exportError) {
        enqueueSnackbar(exportError.message || `Failed to export ${label}.`, { variant: "error" });
      }
    },
    [enqueueSnackbar]
  );

  const previewReportColumns = {
    inventory: [
      { key: "collection", label: "Collection" },
      { key: "records", label: "Rows" },
      { key: "active", label: "Active" },
      { key: "coverage", label: "Coverage" },
      { key: "note", label: "Notes" },
    ],
    businessCategory: [
      { key: "category", label: "Category" },
      { key: "businesses", label: "Businesses" },
      { key: "activeBusinesses", label: "Active" },
      { key: "liveBusinesses", label: "Live" },
      { key: "verifiedBusinesses", label: "Verified" },
      { key: "featuredBusinesses", label: "Featured" },
      { key: "sponsoredBusinesses", label: "Sponsored" },
      { key: "trendingBusinesses", label: "Trending" },
      { key: "locations", label: "Locations" },
    ],
    businessLocation: [
      { key: "location", label: "Location" },
      { key: "businesses", label: "Businesses" },
      { key: "activeBusinesses", label: "Active" },
      { key: "liveBusinesses", label: "Live" },
      { key: "verifiedBusinesses", label: "Verified" },
      { key: "categories", label: "Categories" },
    ],
    categorySeo: [
      { key: "category", label: "Category" },
      { key: "active", label: "Active" },
      { key: "businesses", label: "Businesses" },
      { key: "keywordCount", label: "Keywords" },
      { key: "hasFilterConfig", label: "Filters" },
      { key: "hasCategorySeoFields", label: "SEO Fields" },
      { key: "seoDocs", label: "SEO Docs" },
      { key: "pageContents", label: "Page Content" },
      { key: "blogPages", label: "Blog Pages" },
      { key: "pageTypes", label: "Page Types" },
      { key: "locations", label: "Locations" },
      { key: "gapStatus", label: "Gap Status" },
    ],
    categoryGaps: [
      { key: "category", label: "Category" },
      { key: "businesses", label: "Businesses" },
      { key: "seoDocs", label: "SEO Docs" },
      { key: "pageContents", label: "Page Content" },
      { key: "blogPages", label: "Blogs" },
      { key: "missingSeoDoc", label: "Missing SEO" },
      { key: "missingPageContent", label: "Missing Page" },
      { key: "gapStatus", label: "Gap Status" },
    ],
    pageType: [
      { key: "pageType", label: "Page Type" },
      { key: "seoDocs", label: "SEO Docs" },
      { key: "seoActive", label: "SEO Active" },
      { key: "pageContents", label: "Pages" },
      { key: "pageContentActive", label: "Pages Active" },
      { key: "blogPages", label: "Blogs" },
      { key: "blogActive", label: "Blogs Active" },
      { key: "categories", label: "Categories" },
      { key: "locations", label: "Locations" },
    ],
  };

  const categorySeoMetrics = [
    { label: "Covered", value: formatNumber(categorySeoCoverageRows.filter((row) => row.hasCoreSeo).length) },
    { label: "Missing SEO", value: formatNumber(categorySeoCoverageRows.filter((row) => row.missingSeoDoc).length) },
    { label: "Missing page content", value: formatNumber(categorySeoCoverageRows.filter((row) => row.missingPageContent).length) },
  ];

  const pageTypeMetrics = [
    { label: "Page types", value: formatNumber(pageTypeRows.length) },
    { label: "SEO docs", value: formatNumber(data.seo.length) },
    { label: "Pages", value: formatNumber(data.pages.length) },
    { label: "Blogs", value: formatNumber(data.pageBlogs.length) },
  ];

  return (
    <Box sx={{ width: "100%", maxWidth: 1600 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.25, md: 3 },
          borderRadius: 4,
          border: "1px solid #e5e9f0",
          background: "linear-gradient(135deg, #fff7f0 0%, #ffffff 48%, #f8fbff 100%)",
          mb: 2.5,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Box>
            <Chip
              icon={<AnalyticsRoundedIcon />}
              label="Admin Data Analytics"
              sx={{
                mb: 1.5,
                fontWeight: 800,
                bgcolor: "#fff",
                border: "1px solid #f2d5c2",
                color: "#b95b12",
              }}
            />
            <Typography sx={{ fontSize: { xs: 28, md: 38 }, lineHeight: 1.05, fontWeight: 950, color: "#172033" }}>
              Report view for your Massclick data
            </Typography>
            <Typography sx={{ fontSize: 14, color: "#657084", mt: 1, maxWidth: 860 }}>
              This page exports report summaries, not raw data. Use it to review coverage, gaps, and distribution across businesses, categories, locations, SEO, and page content before downloading CSV reports.
            </Typography>
          </Box>

          <Stack spacing={1.25} sx={{ minWidth: { xs: "100%", md: 260 } }}>
            <Button
              variant="contained"
              startIcon={<RefreshRoundedIcon />}
              onClick={loadReportData}
              disabled={refreshing}
              sx={{
                bgcolor: "#ea6d11",
                textTransform: "none",
                fontWeight: 800,
                "&:hover": { bgcolor: "#d9620f" },
              }}
            >
              {refreshing ? "Refreshing..." : "Refresh reports"}
            </Button>
            <Chip
              label={lastUpdated ? `Last updated ${lastUpdated.toLocaleString("en-IN")}` : "Reports not loaded yet"}
              variant="outlined"
              sx={{ justifyContent: "flex-start", borderColor: "#e5e9f0" }}
            />
          </Stack>
        </Stack>

        {loading && (
          <Box sx={{ mt: 2.5 }}>
            <LinearProgress sx={{ borderRadius: 999, mb: 1.5 }} />
            <Typography sx={{ fontSize: 13, color: "#657084" }}>{loadingLabel}</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="warning" sx={{ mt: 2.5 }}>
            {error}
          </Alert>
        )}
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 2.5,
        }}
      >
        {summaryCards.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </Box>

      <Box sx={{ display: "grid", gap: 2.5 }}>
        <ReportSection
          title="Collection inventory"
          subtitle="Quick report over the core collections and their coverage relationships."
          rows={inventoryRows}
          columns={previewReportColumns.inventory}
          metrics={[
            { label: "Businesses", value: formatNumber(data.businesslist.length) },
            { label: "Categories", value: formatNumber(data.categories.length) },
            { label: "Locations", value: formatNumber(data.locations.length) },
            { label: "SEO docs", value: formatNumber(data.seo.length) },
            { label: "Pages", value: formatNumber(data.pages.length) },
            { label: "Blogs", value: formatNumber(data.pageBlogs.length) },
          ]}
          exporting={exportingKey === "inventory"}
          tone="#ea6d11"
          onExport={() => {
            setExportingKey("inventory");
            exportReport("Collection Inventory Report", inventoryRows).finally(() => setExportingKey(""));
          }}
        />

        <ReportSection
          title="Business distribution by category"
          subtitle="Shows how businesses are spread across categories and status buckets."
          rows={businessByCategoryRows}
          columns={previewReportColumns.businessCategory}
          metrics={[
            { label: "Top category", value: businessByCategoryRows[0]?.category || "N/A" },
            { label: "Active businesses", value: formatNumber(countBy(data.businesslist, isActiveRow)) },
            { label: "Live businesses", value: formatNumber(countBy(data.businesslist, (row) => row.businessesLive === true)) },
          ]}
          exporting={exportingKey === "businessCategory"}
          tone="#2563eb"
          onExport={() => {
            setExportingKey("businessCategory");
            exportReport("Business by Category Report", businessByCategoryRows).finally(() => setExportingKey(""));
          }}
        />

        <ReportSection
          title="Business distribution by location"
          subtitle="Shows where the business supply is concentrated geographically."
          rows={businessByLocationRows}
          columns={previewReportColumns.businessLocation}
          metrics={[
            { label: "Top location", value: businessByLocationRows[0]?.location || "N/A" },
            { label: "Locations covered", value: formatNumber(businessByLocationRows.length) },
          ]}
          exporting={exportingKey === "businessLocation"}
          tone="#16803c"
          onExport={() => {
            setExportingKey("businessLocation");
            exportReport("Business by Location Report", businessByLocationRows).finally(() => setExportingKey(""));
          }}
        />

        <ReportSection
          title="Category SEO coverage"
          subtitle="Highlights which categories have SEO data, page content, or coverage gaps."
          rows={categorySeoCoverageRows}
          columns={previewReportColumns.categorySeo}
          metrics={categorySeoMetrics}
          exporting={exportingKey === "categorySeo"}
          tone="#7c3aed"
          onExport={() => {
            setExportingKey("categorySeo");
            exportReport("Category SEO Coverage Report", categorySeoCoverageRows).finally(() => setExportingKey(""));
          }}
        />

        <ReportSection
          title="Category gap watchlist"
          subtitle="A focused report for categories that need SEO docs or page content."
          rows={categoryGapRows}
          columns={previewReportColumns.categoryGaps}
          metrics={[
            { label: "Gap rows", value: formatNumber(categoryGapRows.length) },
            { label: "Missing SEO", value: formatNumber(categoryGapRows.filter((row) => row.missingSeoDoc).length) },
            { label: "Missing page content", value: formatNumber(categoryGapRows.filter((row) => row.missingPageContent).length) },
          ]}
          exporting={exportingKey === "categoryGaps"}
          tone="#dc2626"
          onExport={() => {
            setExportingKey("categoryGaps");
            exportReport("Category Gap Watchlist Report", categoryGapRows).finally(() => setExportingKey(""));
          }}
        />

        <ReportSection
          title="Page type coverage"
          subtitle="Groups SEO, page content, and blog pages by page type."
          rows={pageTypeRows}
          columns={previewReportColumns.pageType}
          metrics={pageTypeMetrics}
          exporting={exportingKey === "pageType"}
          tone="#0f766e"
          onExport={() => {
            setExportingKey("pageType");
            exportReport("Page Type Coverage Report", pageTypeRows).finally(() => setExportingKey(""));
          }}
        />
      </Box>
    </Box>
  );
}
