import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import axiosInstance from "../../services/axiosInstance.js";
import { normalizeImageUrl } from "../../utils/imageUrlHelper.js";
import Cropper from "react-easy-crop";
import InputValidator from "../validators/inputValidator.js";
import {
  getAllCategory,
  createCategory,
  editCategory,
  deleteCategory,
  hardDeleteCategory,
} from "../../redux/actions/categoryAction";
import styles from "./categories.module.css";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  TextField,
  Autocomplete,
  Chip,
  InputAdornment,
  Checkbox,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Tooltip,
} from "@mui/material";
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CustomizedTable from "../../components/Table/CustomizedTable";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import AdminViewTabs from "../../components/AdminViewTabs.js";
const cx = createScopedClassNames(styles);
const API_URL = process.env.REACT_APP_API_URL;
const CATEGORY_PAGE_FETCH_SIZE = 100;

const fetchAllCategoriesPageWise = async ({
  status = "active",
  search = "",
  sortBy = "",
  sortOrder = "",
} = {}) => {
  const token = localStorage.getItem("accessToken");
  const collected = [];
  let pageNo = 1;
  let total = null;

  while (true) {
    const query = new URLSearchParams({
      pageNo: String(pageNo),
      pageSize: String(CATEGORY_PAGE_FETCH_SIZE),
      status,
    });

    if (search) query.set("search", search);
    if (sortBy) query.set("sortBy", sortBy);
    if (sortOrder) query.set("sortOrder", sortOrder);

    const res = await axiosInstance.get(
      `${API_URL}/category/viewall?${query.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const pageData = Array.isArray(res.data?.data) ? res.data.data : [];
    collected.push(...pageData);

    const nextTotal = Number(res.data?.total);
    if (Number.isFinite(nextTotal) && nextTotal >= 0) {
      total = nextTotal;
    }

    if (pageData.length < CATEGORY_PAGE_FETCH_SIZE) break;
    if (total !== null && collected.length >= total) break;

    pageNo += 1;
  }

  return collected;
};

const HelpHint = ({ text }) => {
  if (!text) return null;
  return (
    <span
      className={cx("help-hint")}
      tabIndex={0}
      role="note"
      aria-label={text}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className={cx("help-hint-icon")}>?</span>
      <span className={cx("help-hint-bubble")}>{text}</span>
    </span>
  );
};

// Image variant configuration with size constraints
const IMAGE_VARIANTS = {
  webHero: {
    name: "Web Hero",
    minWidth: 1000,
    minHeight: 300,
    maxWidth: 1600,
    maxHeight: 600,
    aspectRatio: "3:1",
    description: "Landscape banner for web (1200x400px)",
    maxFileSize: 2, // MB
  },
  webCard: {
    name: "Web Card",
    minWidth: 300,
    minHeight: 300,
    maxWidth: 600,
    maxHeight: 600,
    aspectRatio: "1:1",
    description: "Square grid card for web (400x400px)",
    maxFileSize: 1,
  },
  webThumbnail: {
    name: "Web Thumbnail",
    minWidth: 150,
    minHeight: 150,
    maxWidth: 300,
    maxHeight: 300,
    aspectRatio: "1:1",
    description: "Small thumbnail for web (200x200px)",
    maxFileSize: 0.5,
  },
  mobileVertical: {
    name: "Mobile Vertical",
    minWidth: 300,
    minHeight: 450,
    maxWidth: 600,
    maxHeight: 900,
    aspectRatio: "2:3",
    description: "Portrait image for mobile (400x600px)",
    maxFileSize: 1.5,
  },
  mobileCard: {
    name: "Mobile Card",
    minWidth: 250,
    minHeight: 250,
    maxWidth: 450,
    maxHeight: 450,
    aspectRatio: "1:1",
    description: "Square card for mobile (300x300px)",
    maxFileSize: 1,
  },
  mobileThumbnail: {
    name: "Mobile Thumbnail",
    minWidth: 100,
    minHeight: 100,
    maxWidth: 250,
    maxHeight: 250,
    aspectRatio: "1:1",
    description: "Small thumbnail for mobile (150x150px)",
    maxFileSize: 0.5,
  },
};
const EMPTY_FILTER_DRAFT = {
  key: "",
  label: "",
  type: "multiselect",
  options: [],
  min: "",
  max: "",
  unit: "",
  isRequired: false,
  enabled: true,
};
const FILTER_TYPE_COPY = {
  multiselect: "Multiple values, shown as checkbox-style filters.",
  radio: "One value only, useful for sort or fixed choices.",
  toggle: "Simple yes/no filter.",
  range: "Numeric min and max filter.",
};
const FIELD_HELP = {
  customer_filters:
    "These filters are shown to customers on the public search form. Build the filter here, then attach it to the category.",
  build_filter:
    "Create or edit one filter at a time. Use a preset for common filters, or fill the fields manually.",
  filter_label: "The user-facing label customers will read in the search form.",
  filter_key:
    "The internal field key saved in the database and sent through the API. Use lowercase letters and underscores.",
  filter_type:
    "Multi select allows several answers, single select allows one, toggle is yes or no, and range uses min/max numbers.",
  filter_options:
    "Add one option per value for multi select or single select filters. Press Enter after each option.",
  filter_min: "Smallest allowed value for a range filter.",
  filter_max: "Largest allowed value for a range filter.",
  filter_unit: "Shown beside the range values, such as INR, km, or years.",
  filter_required:
    "If enabled, customers must answer this filter before submitting.",
  filter_visible:
    "If disabled, the filter stays saved but is hidden from the customer-facing UI.",
  category_name: "The public category name people search for.",
  category_type:
    "Primary categories are top-level. Sub categories need a parent sub category type.",
  sub_category_type:
    "Choose the parent group for a sub category so it is organized correctly.",
  keywords:
    "Add search phrases customers might type. These help category suggestions and matching.",
  title: "The page or card title shown in the admin and public detail views.",
  description: "Longer descriptive copy for the category page.",
};
const FILTER_PRESETS = [
  {
    name: "Price",
    draft: {
      key: "price_range",
      label: "Price Range",
      type: "range",
      options: [],
      min: "0",
      max: "5000",
      unit: "INR",
      isRequired: false,
      enabled: true,
    },
  },
  {
    name: "Service Type",
    draft: {
      key: "service_type",
      label: "Service Type",
      type: "multiselect",
      options: ["Repair", "Installation", "Maintenance"],
      min: "",
      max: "",
      unit: "",
      isRequired: false,
      enabled: true,
    },
  },
  {
    name: "Availability",
    draft: {
      key: "available_now",
      label: "Available Now",
      type: "toggle",
      options: [],
      min: "",
      max: "",
      unit: "",
      isRequired: false,
      enabled: true,
    },
  },
];
const getEmptyFilterDraft = () => ({ ...EMPTY_FILTER_DRAFT, options: [] });
const NOISE_WORDS = new Set([
  "and",
  "the",
  "near",
  "me",
  "center",
  "centre",
  "service",
  "services",
  "solution",
  "solutions",
  "provider",
  "providers",
]);
const SYNONYM_MAP = (() => {
  const groups = {
    repair: ["repair", "repairs", "maintenance", "fix", "fixing", "servicing"],
    computer: ["computer", "computers", "pc", "desktop", "desktops"],
    laptop: ["laptop", "laptops"],
  };
  const map = {};
  for (const [canonical, words] of Object.entries(groups)) {
    for (const w of words) map[w] = canonical;
  }
  return map;
})();
const SPLIT_DICT = [
  "laptop",
  "computer",
  "desktop",
  "mobile",
  "phone",
  "printer",
  "repair",
  "service",
  "maintenance",
  "camera",
  "ac",
  "tv",
].sort((a, b) => b.length - a.length);
const splitMergedWord = (word) => {
  for (const known of SPLIT_DICT) {
    if (word.startsWith(known) && word.length > known.length) {
      return [known, ...splitMergedWord(word.slice(known.length))];
    }
  }
  return [word];
};
const semanticKey = (text) => {
  const s = (text || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ");
  const words = s.split(/\s+/).filter(Boolean).flatMap(splitMergedWord);
  const core = [
    ...new Set(
      words
        .map((w) => SYNONYM_MAP[w] || w)
        .filter((w) => !NOISE_WORDS.has(w) && w.length > 1),
    ),
  ].sort();
  return core.join(" ");
};
const normalizeSlug = (slug) =>
  (slug || "")
    .toLowerCase()
    .trim()
    .replace(/-e?s$/, "")
    .replace(/[-_]+/g, "-")
    .replace(/^-|-$/g, "");
const getCatKey = (text, mode) => {
  if (mode === "slug") return (text || "").toLowerCase().trim();
  if (mode === "similar-slug") return normalizeSlug(text);
  if (mode === "semantic") return semanticKey(text);
  if (mode === "similar")
    return (text || "")
      .toLowerCase()
      .trim()
      .replace(/e?s$/i, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return (text || "").toLowerCase().trim();
};
const getFilterSummary = (filter) => {
  if (!filter) return "";
  if (filter.type === "range") {
    const rangeText = [filter.min, filter.max]
      .filter((v) => v !== "" && v !== undefined)
      .join(" to ");
    return [rangeText || "No range set", filter.unit].filter(Boolean).join(" ");
  }
  if (["multiselect", "radio"].includes(filter.type)) {
    return filter.options?.length
      ? filter.options.join(", ")
      : "No options added";
  }
  return "On or off";
};
export default function Category() {
  const dispatch = useDispatch();
  const {
    category = [],
    total = 0,
    loading,
    error,
  } = useSelector((state) => state.categoryReducer || {});
  const fileInputRef = useRef();
  const liveImageInputRef = useRef();
  const [detailRow, setDetailRow] = useState(null);
  const [errors, setErrors] = useState({});
  const [filterDraft, setFilterDraft] = useState(() => getEmptyFilterDraft());
  const [filterDraftError, setFilterDraftError] = useState("");
  const [editingFilterIndex, setEditingFilterIndex] = useState(null);
  const [formData, setFormData] = useState({
    _id: null,
    categoryImages: {
      webHero: "",
      webCard: "",
      webThumbnail: "",
      mobileVertical: "",
      mobileCard: "",
      mobileThumbnail: "",
    },
    // Legacy fields for backward compatibility
    categoryImage: "",
    liveImage: "",
    category: "",
    categoryType: "",
    subCategoryType: "",
    parentCategoryId: "",
    title: "",
    keywords: [],
    description: "",
    seoTitle: "",
    seoDescription: "",
    slug: "",
    filterConfig: [],
  });

  // Image previews and refs
  const [imagePreviews, setImagePreviews] = useState({
    webHero: null,
    webCard: null,
    webThumbnail: null,
    mobileVertical: null,
    mobileCard: null,
    mobileThumbnail: null,
  });
  const [imageDimensions, setImageDimensions] = useState({
    webHero: null,
    webCard: null,
    webThumbnail: null,
    mobileVertical: null,
    mobileCard: null,
    mobileThumbnail: null,
  });
  const [uploadingImageVariant, setUploadingImageVariant] = useState(null);

  // Cropper states
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropData, setCropData] = useState({
    image: null,
    variantKey: null,
    crop: {
      x: 0,
      y: 0,
    },
    zoom: 1,
    aspect: 1,
  });

  // File input refs for all image types
  const imageInputRefs = {
    webHero: useRef(),
    webCard: useRef(),
    webThumbnail: useRef(),
    mobileVertical: useRef(),
    mobileCard: useRef(),
    mobileThumbnail: useRef(),
  };

  // Legacy preview states
  const [preview, setPreview] = useState(null);
  const [liveImagePreview, setLiveImagePreview] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [activeView, setActiveView] = useState("list");
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    id: null,
  });
  const [inputKeyword, setInputKeyword] = useState("");
  const [keywordInputError, setKeywordInputError] = useState("");
  const [suggestedKeywords, setSuggestedKeywords] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [dupDialog, setDupDialog] = useState({
    open: false,
    groups: [],
  });
  const [selectedDups, setSelectedDups] = useState([]);
  const [dupLoading, setDupLoading] = useState(false);
  const [dupDeleting, setDupDeleting] = useState(false);
  const [dupMode, setDupMode] = useState("exact");
  const [allCatsCache, setAllCatsCache] = useState([]);
  const [businessUsage, setBusinessUsage] = useState({});
  const [lookupFilters, setLookupFilters] = useState({
    type: "all",
    subType: "all",
    filters: "all",
  });
  const [createWarning, setCreateWarning] = useState({
    open: false,
    matches: [],
  });
  const [createWarningLoading, setCreateWarningLoading] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState({
    open: false,
    variantKey: null,
  });
  const subCategories = [
    "Services",
    "Construction Company",
    "Travels",
    "Restaurants",
    "Medical",
    "Events",
    "Education",
    "Garments",
    "Hotels",
    "Spa",
    "Real Estate",
    "Interior Designer",
    "Dealers",
    "Building Materials",
    "Shop",
    "CCTV",
    "Manufacturer",
    "Hostels",
  ];
  useEffect(() => {
    dispatch(getAllCategory());
  }, [dispatch]);
  useEffect(() => {
    if (formData.category) {
      const slug = formData.category
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setFormData((prev) => ({
        ...prev,
        slug,
      }));
    }
  }, [formData.category]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleKeywordChange = (event, newValue) => {
    // freeSolo adds raw string on Enter — validate before accepting it
    const validated = [];
    let lastError = "";
    for (const kw of newValue) {
      const trimmed = typeof kw === "string" ? kw.trim().toLowerCase() : kw;
      if (!trimmed) continue;
      if (trimmed.split(/\s+/).length < 2) {
        lastError = `"${trimmed}" is too generic. Use a descriptive phrase, e.g. "${trimmed} service"`;
        continue;
      }
      try {
        InputValidator.validateAndCleanKeywords([trimmed]);
        validated.push(trimmed);
      } catch (err) {
        lastError = err.message;
      }
    }
    setKeywordInputError(lastError);
    setInputKeyword("");
    setFormData((prev) => ({
      ...prev,
      keywords: validated,
    }));
  };

  // Extract S3 key from signed URL (handles malformed double-signed URLs too)
  const extractS3KeyFromUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    if (!url.startsWith("http")) return url; // Already a key

    try {
      // Handle malformed double-signed URLs like: https://bucket.com/https://bucket.com/path/key
      if (url.includes("/https://")) {
        const match = url.match(/\/https:\/\/[^/]+\/(.+?)(?:\?|$)/);
        if (match && match[1]) return match[1];
      }

      // Handle normal signed URLs: https://bucket.com/path/key?signature...
      const urlObj = new URL(url);
      let path = urlObj.pathname.startsWith("/")
        ? urlObj.pathname.slice(1)
        : urlObj.pathname;
      return path;
    } catch (err) {
      console.error("Failed to extract key from URL:", url, err);
      return url;
    }
  };
  const handleAddFilterField = () => {
    if (!filterDraft.key.trim() || !filterDraft.label.trim()) {
      setFilterDraftError("Key and Label are required");
      return;
    }
    if (
      ["multiselect", "radio"].includes(filterDraft.type) &&
      filterDraft.options.length === 0
    ) {
      setFilterDraftError("Add at least one option for this type");
      return;
    }
    setFilterDraftError("");
    const { ...rest } = filterDraft;
    setFormData((prev) => ({
      ...prev,
      filterConfig: [...prev.filterConfig, rest],
    }));
    setFilterDraft(getEmptyFilterDraft());
  };

  const handleRemoveFilterField = (index) => {
    setFormData((prev) => ({
      ...prev,
      filterConfig: prev.filterConfig.filter((_, i) => i !== index),
    }));
  };

  const handleMoveFilterField = (index, dir) => {
    setFormData((prev) => {
      const arr = [...prev.filterConfig];
      const swapIdx = index + dir;
      if (swapIdx < 0 || swapIdx >= arr.length) return prev;
      [arr[index], arr[swapIdx]] = [arr[swapIdx], arr[index]];
      return { ...prev, filterConfig: arr };
    });
  };

  const handleEditFilterField = (index) => {
    const filter = formData.filterConfig[index];
    setFilterDraft(filter);
    setEditingFilterIndex(index);
    setFilterDraftError("");
  };

  const handleUpdateFilterField = (index) => {
    if (!filterDraft.key.trim() || !filterDraft.label.trim()) {
      setFilterDraftError("Key and Label are required");
      return;
    }
    if (
      ["multiselect", "radio"].includes(filterDraft.type) &&
      filterDraft.options.length === 0
    ) {
      setFilterDraftError("Add at least one option for this type");
      return;
    }
    setFilterDraftError("");
    setFormData((prev) => {
      const arr = [...prev.filterConfig];
      arr[index] = { ...filterDraft };
      return { ...prev, filterConfig: arr };
    });
    setEditingFilterIndex(null);
    setFilterDraft(getEmptyFilterDraft());
  };

  const handleCancelEditFilter = () => {
    setEditingFilterIndex(null);
    setFilterDraft(getEmptyFilterDraft());
    setFilterDraftError("");
  };

  const handleToggleFilterEnabled = (index) => {
    setFormData((prev) => {
      const arr = [...prev.filterConfig];
      arr[index] = {
        ...arr[index],
        enabled: arr[index].enabled === false ? true : false,
      };
      return { ...prev, filterConfig: arr };
    });
  };

  const handleEdit = (row) => {
    setEditMode(true);
    setActiveView("form");

    // Extract S3 keys from signed URLs for categoryImages
    let categoryImagesKeys = {};
    if (row.categoryImages && typeof row.categoryImages === "object") {
      for (const [variant, url] of Object.entries(row.categoryImages)) {
        categoryImagesKeys[variant] = extractS3KeyFromUrl(url) || "";
      }
    } else {
      categoryImagesKeys = {
        webHero: "",
        webCard: "",
        webThumbnail: "",
        mobileVertical: "",
        mobileCard: "",
        mobileThumbnail: "",
      };
    }

    const filterConfigToSet = Array.isArray(row.filterConfig)
      ? row.filterConfig
      : [];

    setFormData({
      _id: row._id,
      categoryImages: categoryImagesKeys,
      categoryImage: row.categoryImage || "",
      liveImage: row.liveImage || "",
      category: row.category,
      categoryType: row.categoryType,
      subCategoryType: row.subCategoryType,
      parentCategoryId: row.parentCategoryId || "",
      title: row.title,
      keywords: Array.isArray(row.keywords)
        ? row.keywords
        : row.keywords?.split(",") || [],
      description: row.description,
      seoTitle: row.seoTitle || "",
      seoDescription: row.seoDescription || "",
      slug: row.slug || "",
      filterConfig: filterConfigToSet,
    });
    // Set previews using signed URLs (for display)
    setImagePreviews({
      webHero: row.categoryImages?.webHero || null,
      webCard: row.categoryImages?.webCard || null,
      webThumbnail: row.categoryImages?.webThumbnail || null,
      mobileVertical: row.categoryImages?.mobileVertical || null,
      mobileCard: row.categoryImages?.mobileCard || null,
      mobileThumbnail: row.categoryImages?.mobileThumbnail || null,
    });
    // Legacy preview
    setPreview(row.categoryImage || null);
    setLiveImagePreview(row.liveImage || null);
  };
  const handleDelete = (row) => {
    setDeleteConfirm({
      open: true,
      id: row.id,
    });
  };
  const confirmDelete = () => {
    if (deleteConfirm.id) {
      dispatch(deleteCategory(deleteConfirm.id))
        .then(() => dispatch(getAllCategory()))
        .catch((err) => console.error("Delete failed:", err))
        .finally(() =>
          setDeleteConfirm({
            open: false,
            id: null,
          }),
        );
    }
  };
  const handleAddKeyword = () => {
    const trimmed = inputKeyword.trim().toLowerCase();
    if (!trimmed) return;

    // Reject single-word keywords — they are too generic for search
    if (trimmed.split(/\s+/).length < 2) {
      setKeywordInputError(
        `"${trimmed}" is too generic. Use a descriptive phrase, e.g. "${trimmed} service" or "${trimmed} provider"`,
      );
      return;
    }

    // Run full InputValidator rules on this single keyword
    try {
      InputValidator.validateAndCleanKeywords([trimmed]);
    } catch (err) {
      setKeywordInputError(err.message);
      return;
    }

    // Check duplicate
    if (formData.keywords.map((k) => k.toLowerCase()).includes(trimmed)) {
      setKeywordInputError(`"${trimmed}" is already added`);
      return;
    }

    // Max 50 keywords
    if (formData.keywords.length >= 50) {
      setKeywordInputError("Maximum 50 keywords allowed");
      return;
    }
    setKeywordInputError("");
    setFormData((prev) => ({
      ...prev,
      keywords: [...prev.keywords, trimmed],
    }));
    setInputKeyword("");
  };
  const handleKeywordDelete = (keywordToDelete) => {
    setFormData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((k) => k !== keywordToDelete),
    }));
  };
  const handleSuggestKeywords = async () => {
    const categoryName = formData.category?.trim();
    if (!categoryName) {
      setKeywordInputError("Enter a category name first to get suggestions");
      return;
    }
    setSuggestLoading(true);
    setSuggestedKeywords([]);
    setKeywordInputError("");
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axiosInstance.get(
        `${API_URL}/category/suggest-keywords`,
        {
          params: {
            category: categoryName,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const suggestions = res.data?.keywords || [];
      // Filter out already-added keywords
      const existing = new Set(formData.keywords.map((k) => k.toLowerCase()));
      setSuggestedKeywords(suggestions.filter((k) => !existing.has(k)));
    } catch (err) {
      setKeywordInputError("Could not fetch suggestions. Try again.");
    } finally {
      setSuggestLoading(false);
    }
  };
  const handleAddSuggestion = (kw) => {
    if (formData.keywords.length >= 50) {
      setKeywordInputError("Maximum 50 keywords allowed");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      keywords: [...prev.keywords, kw],
    }));
    setSuggestedKeywords((prev) => prev.filter((s) => s !== kw));
  };
  const handleAddAllSuggestions = () => {
    const slots = 50 - formData.keywords.length;
    const toAdd = suggestedKeywords.slice(0, slots);
    setFormData((prev) => ({
      ...prev,
      keywords: [...prev.keywords, ...toAdd],
    }));
    setSuggestedKeywords([]);
  };
  const validateForm = () => {
    let newErrors = {};
    console.log("[Category] validateForm — formData:", {
      category: formData.category,
      categoryType: formData.categoryType,
      subCategoryType: formData.subCategoryType,
      title: formData.title,
      description: formData.description,
      keywords: formData.keywords,
      filterConfig: formData.filterConfig,
    });

    // Use InputValidator for comprehensive validation
    try {
      const categoryData = {
        name: formData.category.trim(),
        description: formData.description.trim(),
        keywords: formData.keywords || [],
      };

      // This will throw if validation fails
      InputValidator.validateCategory(categoryData);
    } catch (error) {
      console.log("[Category] InputValidator threw:", error.message);
      // Parse InputValidator error message into field errors
      const errorLines = error.message
        .split("\n")
        .filter((line) => line.trim());
      errorLines.forEach((line) => {
        let cleanedError = line
          .replace(/^Category validation failed:\s*/, "")
          .trim();
        if (cleanedError.includes("name")) newErrors.category = cleanedError;
        else if (cleanedError.includes("Description"))
          newErrors.description = cleanedError;
        else if (cleanedError.includes("keyword"))
          newErrors.keywords = cleanedError;
        else if (cleanedError.includes("required"))
          newErrors.category = cleanedError;
      });
    }

    // Additional MassClick-specific validations
    if (!formData.categoryType)
      newErrors.categoryType = "Category Type is required";
    if (formData.categoryType === "Sub Category" && !formData.subCategoryType)
      newErrors.subCategoryType = "Sub Category Type is required";
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.keywords.length)
      newErrors.keywords = "At least one keyword is required";
    console.log("[Category] validateForm errors:", newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle cropped image - upload to backend
  const handleCropSave = async () => {
    try {
      if (!cropData.croppedAreaPixels) {
        alert("Please adjust the crop area");
        return;
      }
      const { variantKey, image, croppedAreaPixels } = cropData;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const { x, y, width, height } = croppedAreaPixels;
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                alert("Failed to process image");
                return;
              }
              try {
                const reader = new FileReader();
                reader.onload = async () => {
                  const finalWidth = width;
                  const finalHeight = height;
                  const base64Data = reader.result;
                  try {
                    setUploadingImageVariant(variantKey);

                    // Upload to backend (auto-updates category if editing)
                    const token = localStorage.getItem("accessToken");
                    const response = await axiosInstance.post(
                      `${API_URL}/category/upload-images`,
                      {
                        variant: variantKey,
                        imageData: base64Data,
                        categoryId: formData._id || null, // Auto-update if editing existing category
                      },
                      {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      },
                    );
                    if (response.data.success && response.data.imageKey) {
                      const imageKey = response.data.imageKey;

                      // Store S3 key, not base64
                      setFormData((prev) => ({
                        ...prev,
                        categoryImages: {
                          ...prev.categoryImages,
                          [variantKey]: imageKey,
                        },
                      }));

                      // Store preview as data URL for display only
                      setImagePreviews((prev) => ({
                        ...prev,
                        [variantKey]: base64Data,
                      }));
                      setImageDimensions((prev) => ({
                        ...prev,
                        [variantKey]: {
                          width: finalWidth,
                          height: finalHeight,
                        },
                      }));
                      setCropperOpen(false);
                    } else {
                      alert("Failed to upload image");
                    }
                  } catch (err) {
                    console.error("Upload error:", err);
                    alert("Upload failed: " + err.message);
                  } finally {
                    setUploadingImageVariant(null);
                  }
                };
                reader.readAsDataURL(blob);
              } catch (err) {
                console.error("Error uploading image:", err);
                alert("Upload failed: " + err.message);
              }
            },
            "image/jpeg",
            0.95,
          );
        } catch (err) {
          console.error("Error in crop processing:", err);
          alert("Error: " + err.message);
        }
      };
      img.onerror = () => alert("Failed to load image");
      img.src = image;
    } catch (err) {
      console.error("Error in handleCropSave:", err);
      alert("Error: " + err.message);
    }
  };

  // Auto-fit image to variant constraints (no validation, just resize)
  const autoFitImage = (file, variantKey) => {
    const variant = IMAGE_VARIANTS[variantKey];
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const originalWidth = img.width;
          const originalHeight = img.height;
          const [aspectW, aspectH] = variant.aspectRatio.split(":").map(Number);
          const targetAspect = aspectW / aspectH;
          const originalAspect = originalWidth / originalHeight;
          let cropWidth = originalWidth;
          let cropHeight = originalHeight;

          // Auto-crop to match target aspect ratio
          if (originalAspect > targetAspect) {
            cropWidth = originalHeight * targetAspect;
          } else {
            cropHeight = originalWidth / targetAspect;
          }
          const cropX = (originalWidth - cropWidth) / 2;
          const cropY = (originalHeight - cropHeight) / 2;

          // Scale down to max dimensions if needed
          let finalWidth = cropWidth;
          let finalHeight = cropHeight;
          if (
            finalWidth > variant.maxWidth ||
            finalHeight > variant.maxHeight
          ) {
            const scaleW = variant.maxWidth / finalWidth;
            const scaleH = variant.maxHeight / finalHeight;
            const scale = Math.min(scaleW, scaleH);
            finalWidth = finalWidth * scale;
            finalHeight = finalHeight * scale;
          }
          resolve({
            originalWidth,
            originalHeight,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            targetWidth: finalWidth,
            targetHeight: finalHeight,
            aspect: targetAspect,
          });
        };
        img.onerror = () => resolve(null);
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };
  const handleImageChange = async (e, variantKey) => {
    const file = e.target.files[0];
    if (!file) return;
    const fitData = await autoFitImage(file, variantKey);
    if (!fitData) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropData({
        image: event.target.result,
        variantKey,
        crop: {
          x: 0,
          y: 0,
        },
        zoom: 1,
        aspect: fitData.aspect,
        fitData,
      });
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };
  const computeDupGroups = (cats, mode) => {
    const isSlugMode = mode === "slug" || mode === "similar-slug";
    const groups = {};
    cats.forEach((cat) => {
      const text = isSlugMode ? cat.slug : cat.category;
      const key = getCatKey(text, mode);
      if (!key) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(cat);
    });
    return Object.values(groups).filter((g) => g.length > 1);
  };
  const fetchBusinessUsage = async (cats) => {
    try {
      const token = localStorage.getItem("accessToken");
      const names = cats.map((c) => c.category).filter(Boolean);
      if (!names.length) return;
      const params = names
        .map((n) => `names=${encodeURIComponent(n)}`)
        .join("&");
      const res = await axiosInstance.get(
        `${API_URL}/category/business-usage?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const map = {};
      (res.data || []).forEach(({ name, count }) => {
        map[name.toLowerCase()] = count;
      });
      setBusinessUsage(map);
    } catch (err) {
      console.error("Failed to fetch business usage:", err);
    }
  };
  const findDuplicates = async () => {
    setDupLoading(true);
    try {
      const allCats = await fetchAllCategoriesPageWise({ status: "active" });
      setAllCatsCache(allCats);
      const groups = computeDupGroups(allCats, dupMode);
      setDupDialog({
        open: true,
        groups,
      });
      setSelectedDups([]);
      fetchBusinessUsage(allCats);
    } catch (err) {
      console.error("Failed to fetch categories for duplicate check:", err);
    } finally {
      setDupLoading(false);
    }
  };
  const handleModeChange = (_, newMode) => {
    if (!newMode) return;
    setDupMode(newMode);
    const groups = computeDupGroups(allCatsCache, newMode);
    setDupDialog((prev) => ({
      ...prev,
      groups,
    }));
    setSelectedDups([]);
  };
  const toggleDupSelect = (id) => {
    setSelectedDups((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const toggleSelectGroup = (group) => {
    const ids = group.map((c) => c._id);
    const allSelected = ids.every((id) => selectedDups.includes(id));
    if (allSelected) {
      setSelectedDups((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedDups((prev) => [...new Set([...prev, ...ids])]);
    }
  };
  const deleteSelectedDups = async (hard = false) => {
    setDupDeleting(hard ? "hard" : "soft");
    try {
      for (const id of selectedDups) {
        await dispatch(hard ? hardDeleteCategory(id) : deleteCategory(id));
      }
      const remaining = allCatsCache.filter(
        (c) => !selectedDups.includes(c._id),
      );
      setAllCatsCache(remaining);
      const groups = computeDupGroups(remaining, dupMode);
      setDupDialog((prev) => ({
        ...prev,
        groups,
      }));
      setSelectedDups([]);
      dispatch(getAllCategory());
    } catch (err) {
      console.error("Bulk delete failed:", err);
    } finally {
      setDupDeleting(false);
    }
  };
  const resetForm = () => {
    setFormData({
      _id: null,
      categoryImage: "",
      liveImage: "",
      category: "",
      categoryType: "",
      subCategoryType: "",
      parentCategoryId: "",
      title: "",
      keywords: [],
      description: "",
      seoTitle: "",
      seoDescription: "",
      slug: "",
      filterConfig: [],
    });
    setFilterDraft(getEmptyFilterDraft());
    setFilterDraftError("");
    setPreview(null);
    setLiveImagePreview(null);
    setEditMode(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const doSave = () => {
    console.log(
      "[Category] doSave called, editMode:",
      editMode,
      "_id:",
      formData._id,
    );
    // Prepare data to send (use cleaned keywords from InputValidator)
    const saveData = {
      ...formData,
      // Ensure keywords are properly formatted
      keywords: Array.isArray(formData.keywords) ? formData.keywords : [],
    };
    const action = editMode
      ? editCategory(formData._id, saveData)
      : createCategory(saveData);
    dispatch(action)
      .then(() => {
        resetForm();
        setActiveView("list");
        dispatch(getAllCategory());
      })
      .catch((err) => {
        console.error(editMode ? "Update failed:" : "Create failed:", err);
        if (err.response?.data?.errors) {
          const backendErrors = {};
          err.response.data.errors.forEach((e) => {
            backendErrors[e.field] = e.message;
          });
          setErrors(backendErrors);
        } else {
          const msg =
            err.response?.data?.message ||
            err.message ||
            "Save failed. Please try again.";
          setErrors({ _form: msg });
        }
      });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("[Category] handleSubmit fired, editMode:", editMode);
    const valid = validateForm();
    console.log("[Category] validateForm result:", valid);
    if (!valid) return;
    if (!editMode) {
      setCreateWarningLoading(true);
      try {
        const allCats = await fetchAllCategoriesPageWise({ status: "active" });
        const matchIds = new Set();
        ["exact", "similar", "semantic"].forEach((mode) => {
          const newKey = getCatKey(formData.category, mode);
          if (!newKey) return;
          allCats.forEach((cat) => {
            if (getCatKey(cat.category, mode) === newKey) matchIds.add(cat._id);
          });
        });
        const matches = allCats.filter((c) => matchIds.has(c._id));
        if (matches.length > 0) {
          setCreateWarning({
            open: true,
            matches,
          });
          fetchBusinessUsage(matches);
          setCreateWarningLoading(false);
          return;
        }
      } catch (err) {
        console.error("Duplicate pre-check failed:", err);
      }
      setCreateWarningLoading(false);
    }
    doSave();
  };
  const mobilePreviewSource =
    imagePreviews.mobileVertical ||
    imagePreviews.mobileCard ||
    preview ||
    liveImagePreview ||
    null;
  const mobilePreviewImage = mobilePreviewSource
    ? mobilePreviewSource.startsWith("data:")
      ? mobilePreviewSource
      : normalizeImageUrl(mobilePreviewSource)
    : null;
  const mobilePreviewTitle = (formData.category || "Category Name").trim();
  const mobilePreviewHint = imagePreviews.mobileVertical
    ? "Showing Mobile Vertical"
    : imagePreviews.mobileCard
      ? "Showing Mobile Card fallback"
      : preview || liveImagePreview
        ? "Showing legacy image fallback"
        : "Upload Mobile Vertical to preview the final mobile look";
  const rows = category
    .filter((c) => c.isActive)
    .map((cat, index) => ({
      id: cat._id || index,
      _id: cat._id,
      categoryImages: cat.categoryImages || {
        webHero: cat.categoryImage || "",
        webCard: "",
        webThumbnail: "",
        mobileVertical: cat.liveImage || "",
        mobileCard: "",
        mobileThumbnail: "",
      },
      categoryImage: cat.categoryImage,
      liveImage: cat.liveImage,
      category: cat.category,
      categoryType: cat.categoryType,
      subCategoryType: cat.subCategoryType,
      title: cat.title,
      keywords:
        Array.isArray(cat.keywords) && cat.keywords.length
          ? cat.keywords.join(", ")
          : "-",
      description: cat.description,
      seoTitle: cat.seoTitle || "-",
      seoDescription: cat.seoDescription || "-",
      slug: cat.slug || "-",
      isActive: cat.isActive,
      filterConfig: cat.filterConfig || [],
    }));
  const subCategoryLookupOptions = [
    ...new Set(rows.map((row) => row.subCategoryType).filter(Boolean)),
  ].sort();
  const hasLookupFilter =
    lookupFilters.type !== "all" ||
    lookupFilters.subType !== "all" ||
    lookupFilters.filters !== "all";
  const lookupRows = rows.filter((row) => {
    if (lookupFilters.type !== "all" && row.categoryType !== lookupFilters.type)
      return false;
    if (
      lookupFilters.subType !== "all" &&
      row.subCategoryType !== lookupFilters.subType
    )
      return false;
    if (
      lookupFilters.filters === "with" &&
      (!Array.isArray(row.filterConfig) || row.filterConfig.length === 0)
    )
      return false;
    if (
      lookupFilters.filters === "without" &&
      Array.isArray(row.filterConfig) &&
      row.filterConfig.length > 0
    )
      return false;
    return true;
  });
  const categoryList = [
    {
      id: "category",
      label: "Category",
      renderCell: (_, row) => {
        const image =
          row.categoryImages?.webThumbnail ||
          row.categoryImages?.webCard ||
          row.categoryImages?.webHero ||
          row.categoryImage ||
          row.liveImage;
        const keywordCount =
          row.keywords && row.keywords !== "-"
            ? row.keywords.split(",").filter(Boolean).length
            : 0;
        return (
          <div className={cx("category-table-identity")}>
            {image ? (
              <Avatar
                src={normalizeImageUrl(image)}
                alt={row.category}
                sx={{ width: 32, height: 32, borderRadius: 1 }}
              />
            ) : (
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: "#fff3e0",
                  color: "#c25f00",
                  fontWeight: 800,
                }}
              >
                {(row.category || "?").charAt(0).toUpperCase()}
              </Avatar>
            )}
            <div className={cx("category-table-main")}>
              <strong>{row.category || "-"}</strong>
              <span>{row.title || "No title set"}</span>
              <small>
                {keywordCount} keyword{keywordCount === 1 ? "" : "s"}
              </small>
            </div>
          </div>
        );
      },
    },
    {
      id: "seoTitle",
      label: "SEO",
      renderCell: (_, row) => (
        <div className={cx("category-table-copy")}>
          <strong>
            {row.seoTitle && row.seoTitle !== "-" ? row.seoTitle : row.slug}
          </strong>
          <span>
            {row.seoDescription && row.seoDescription !== "-"
              ? row.seoDescription
              : row.description || "No SEO description"}
          </span>
          <small>{row.slug && row.slug !== "-" ? row.slug : "No slug"}</small>
        </div>
      ),
    },
    {
      id: "categoryImages",
      label: "Media",
      renderCell: (_, row) => {
        const imageMap = row.categoryImages || {};
        const variantCount = Object.values(imageMap).filter(Boolean).length;
        const hasWeb = !!(
          imageMap.webHero ||
          imageMap.webCard ||
          imageMap.webThumbnail ||
          row.categoryImage
        );
        const hasMobile = !!(
          imageMap.mobileVertical ||
          imageMap.mobileCard ||
          imageMap.mobileThumbnail ||
          row.liveImage
        );
        return (
          <div className={cx("category-table-media")}>
            <Chip
              size="small"
              label={`${variantCount} variants`}
              sx={{
                width: "fit-content",
                bgcolor: variantCount ? "#eef6f3" : "#f3f4f6",
                color: variantCount ? "#2f6f5e" : "#6b7280",
                fontWeight: 700,
              }}
            />
            <span
              className={cx(hasWeb ? "media-dot-ready" : "media-dot-missing")}
            >
              Web {hasWeb ? "ready" : "missing"}
            </span>
            <span
              className={cx(
                hasMobile ? "media-dot-ready" : "media-dot-missing",
              )}
            >
              Mobile {hasMobile ? "ready" : "missing"}
            </span>
          </div>
        );
      },
    },
    {
      id: "action",
      label: "",
      renderCell: (_, row) => (
        <Box sx={{ display: "flex", gap: "14px", alignItems: "center" }}>
          <EyeOutlined onClick={() => setDetailRow(row)} style={{ fontSize: 17, color: "#ff7a00", cursor: "pointer" }} />
          <EditOutlined onClick={() => handleEdit(row)} style={{ fontSize: 17, color: "#3b82f6", cursor: "pointer" }} />
          <DeleteOutlined onClick={() => handleDelete(row)} style={{ fontSize: 17, color: "#ef4444", cursor: "pointer" }} />
        </Box>
      ),
    },
  ];
  const visibleFilterCount = formData.filterConfig.filter(
    (filter) => filter.enabled !== false,
  ).length;
  const requiredFilterCount = formData.filterConfig.filter(
    (filter) => filter.isRequired,
  ).length;
  const filledImageCount =
    Object.values(formData.categoryImages || {}).filter(Boolean).length +
    (formData.categoryImage ? 1 : 0) +
    (formData.liveImage ? 1 : 0);
  const filterDraftHelp = FILTER_TYPE_COPY[filterDraft.type] || "";
  const primaryCategoryCount = rows.filter(
    (row) => row.categoryType === "Primary Category",
  ).length;
  const subCategoryCount = rows.filter(
    (row) => row.categoryType === "Sub Category",
  ).length;
  const rowsWithFiltersCount = rows.filter(
    (row) => Array.isArray(row.filterConfig) && row.filterConfig.length > 0,
  ).length;
  return (
    <div className={cx("category-page-container")}>
      <AdminViewTabs
        activeView={activeView}
        onChange={setActiveView}
        isEditing={editMode}
        createLabel="Category"
        listLabel="Categories"
        listCount={rows.length}
      />

      {activeView === "form" && (
        <>
          {/* Category Form */}
          <div className={cx("category-form-section")}>
            <form onSubmit={handleSubmit} className={cx("category-form-grid")}>
              <div
                className={cx("category-editor-header category-col-span-all")}
              >
                <div>
                  <span className={cx("category-kicker")}>
                    {editMode ? "Edit category" : "New category"}
                  </span>
                  <h2 className={cx("category-editor-title")}>
                    {mobilePreviewTitle}
                  </h2>
                  <p className={cx("category-editor-subtitle")}>
                    Keep the public details, images, SEO, and customer-facing
                    filters in one compact editor.
                  </p>
                </div>
                <div className={cx("category-summary-strip")}>
                  <span>
                    <strong>{formData.keywords.length}</strong> keywords
                  </span>
                  <span>
                    <strong>{filledImageCount}</strong> images
                  </span>
                  <span>
                    <strong>{visibleFilterCount}</strong> visible filters
                  </span>
                  <span>
                    <strong>{requiredFilterCount}</strong> required
                  </span>
                </div>
              </div>

              <div
                className={cx("category-section-title category-col-span-all")}
              >
                <span>Details</span>
              </div>

              <div className={cx("category-form-input-group")}>
                <label className={cx("category-input-label label-with-help")}>
                  <span>Category</span>
                  <HelpHint text={FIELD_HELP.category_name} />
                </label>
                <input
                  type="text"
                  name="category"
                  className={cx(`category-text-input ${errors.category ? "category-error" : ""}`)}
                  value={formData.category}
                  onChange={handleChange}
                />
              </div>

              <div className={cx("category-form-input-group")}>
                <label className={cx("category-input-label")}>
                  Slug (Auto)
                </label>
                <input
                  type="text"
                  name="slug"
                  className={cx("category-text-input")}
                  value={formData.slug}
                  readOnly
                />
              </div>

              <div className={cx("category-form-input-group")}>
                <label className={cx("category-input-label label-with-help")}>
                  <span>Category Type</span>
                  <HelpHint text={FIELD_HELP.category_type} />
                </label>
                <select
                  name="categoryType"
                  className={cx(`category-select-input ${errors.categoryType ? "category-error" : ""}`)}
                  value={formData.categoryType}
                  onChange={handleChange}
                >
                  <option value="">-- Select Type --</option>
                  <option value="Primary Category">Primary Category</option>
                  <option value="Sub Category">Sub Category</option>
                </select>
              </div>

              {formData.categoryType === "Sub Category" && (
                <div className={cx("category-form-input-group")}>
                  <label className={cx("category-input-label label-with-help")}>
                    <span>Sub Category Type</span>
                    <HelpHint text={FIELD_HELP.sub_category_type} />
                  </label>
                  <select
                    name="subCategoryType"
                    className={cx(`category-select-input ${errors.subCategoryType ? "category-error" : ""}`)}
                    value={formData.subCategoryType}
                    onChange={handleChange}
                  >
                    <option value="">-- Select Sub Category --</option>
                    {subCategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={cx("category-form-input-group")}>
                <label className={cx("category-input-label label-with-help")}>
                  <span>Title</span>
                  <HelpHint text={FIELD_HELP.title} />
                </label>
                <input
                  type="text"
                  name="title"
                  className={cx(`category-text-input ${errors.title ? "category-error" : ""}`)}
                  value={formData.title}
                  onChange={handleChange}
                />
              </div>

              <div
                className={cx("category-section-title category-col-span-all")}
              >
                <span>Content and SEO</span>
              </div>

              <div className={cx("category-form-input-group")}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 0.5,
                  }}
                >
                  <label className={cx("category-input-label label-with-help")}>
                    <span>Keywords</span>
                    <HelpHint text={FIELD_HELP.keywords} />
                  </label>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleSuggestKeywords}
                    disabled={suggestLoading || !formData.category?.trim()}
                    sx={{
                      fontSize: "0.75rem",
                      borderColor: "#ff8c00",
                      color: "#ff8c00",
                      "&:hover": {
                        borderColor: "#D97800",
                        color: "#D97800",
                        backgroundColor: "rgba(255,140,0,0.05)",
                      },
                      textTransform: "none",
                    }}
                  >
                    {suggestLoading ? (
                      <>
                        <CircularProgress
                          size={12}
                          sx={{
                            mr: 0.5,
                            color: "#ff8c00",
                          }}
                        />{" "}
                        Fetching…
                      </>
                    ) : (
                      "✨ Suggest Keywords"
                    )}
                  </Button>
                </Box>

                <Autocomplete
                  multiple
                  freeSolo
                  options={[]}
                  value={formData.keywords}
                  onChange={handleKeywordChange}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index });
                      return (
                        <Chip
                          key={key}
                          label={option}
                          {...tagProps}
                          onDelete={() => handleKeywordDelete(option)}
                          sx={{
                            backgroundColor: "#ff8c00",
                            color: "white",
                            fontWeight: 500,
                            "& .MuiChip-deleteIcon": {
                              color: "white",
                            },
                          }}
                        />
                      );
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      placeholder='e.g. "ac repair service", "split ac installation" — min 2 words'
                      value={inputKeyword}
                      onChange={(e) => {
                        setInputKeyword(e.target.value);
                        setKeywordInputError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                      error={!!keywordInputError || !!errors.keywords}
                      helperText={keywordInputError || errors.keywords}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={handleAddKeyword}
                              color="primary"
                              sx={{
                                color: "var(--color-primary-orange)",
                                "&:hover": {
                                  color: "var(--color-primary-hover)",
                                },
                              }}
                            >
                              <AddCircleOutlineIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />

                {/* Keyword Suggestions Panel */}
                {suggestedKeywords.length > 0 && (
                  <Box
                    sx={{
                      mt: 1.5,
                      p: 1.5,
                      border: "1px dashed #ff8c00",
                      borderRadius: 2,
                      backgroundColor: "rgba(255,140,0,0.03)",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#666",
                          fontWeight: 600,
                        }}
                      >
                        ✨ Suggested — click to add
                      </Typography>
                      <Button
                        size="small"
                        onClick={handleAddAllSuggestions}
                        sx={{
                          fontSize: "0.7rem",
                          color: "#ff8c00",
                          textTransform: "none",
                          p: "2px 8px",
                        }}
                      >
                        Add All ({suggestedKeywords.length})
                      </Button>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.75,
                      }}
                    >
                      {suggestedKeywords.map((kw) => (
                        <Chip
                          key={kw}
                          label={kw}
                          size="small"
                          onClick={() => handleAddSuggestion(kw)}
                          sx={{
                            cursor: "pointer",
                            backgroundColor: "white",
                            border: "1px solid #ff8c00",
                            color: "#ff8c00",
                            fontWeight: 500,
                            "&:hover": {
                              backgroundColor: "#ff8c00",
                              color: "white",
                            },
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </div>
              <div className={cx("category-form-input-group")}>
                <label className={cx("category-input-label")}>
                  SEO Description
                </label>
                <input
                  type="text"
                  name="seoDescription"
                  className={cx("category-text-input")}
                  value={formData.seoDescription}
                  onChange={handleChange}
                />
              </div>
              <div
                className={cx("category-form-input-group category-col-span-2")}
              >
                <label className={cx("category-input-label")}>
                  Description
                </label>
                <textarea
                  name="description"
                  className={cx(
                    `category-text-input category-text-area ${errors.description ? "category-error" : ""}`,
                  )}
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                />
                {errors.description && (
                  <p className={cx("category-error-text")}>
                    {errors.description}
                  </p>
                )}
              </div>

              <div className={cx("category-form-input-group")}>
                <label className={cx("category-input-label")}>SEO Title</label>
                <input
                  type="text"
                  name="seoTitle"
                  className={cx("category-text-input")}
                  value={formData.seoTitle}
                  onChange={handleChange}
                />
              </div>

              {/* Image Variants Upload Section - Compact Grid */}
              <div
                className={cx("category-section-title category-col-span-all")}
              >
                <span>Images</span>
              </div>

              <div
                className={cx(
                  "category-form-input-group category-col-span-all",
                )}
              >
                <label className={cx("category-input-label")}>
                  Image Variants
                </label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                    gap: "18px",
                    marginTop: "12px",
                  }}
                >
                  <div
                    style={{
                      flex: "1 1 420px",
                      minWidth: "320px",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(120px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      {Object.entries(IMAGE_VARIANTS).map(([key, variant]) => (
                        <div
                          key={key}
                          onClick={() =>
                            setImageModalOpen({
                              open: true,
                              variantKey: key,
                            })
                          }
                          style={{
                            position: "relative",
                            cursor: "pointer",
                            borderRadius: "8px",
                            overflow: "hidden",
                            border: imagePreviews[key]
                              ? "2px solid #4caf50"
                              : "2px dashed #bbb",
                            backgroundColor: "#f5f5f5",
                            aspectRatio: "1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s ease",
                            padding: "8px",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor =
                              "var(--color-primary-orange)";
                            e.currentTarget.style.backgroundColor = "#fff3e0";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = imagePreviews[
                              key
                            ]
                              ? "#4caf50"
                              : "#bbb";
                            e.currentTarget.style.backgroundColor = "#f5f5f5";
                          }}
                        >
                          {imagePreviews[key] ? (
                            <>
                              <img
                                src={imagePreviews[key]}
                                alt={variant.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                              <div
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  backgroundColor: "rgba(0,0,0,0.4)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "white",
                                  opacity: 0,
                                  transition: "opacity 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.opacity = "1";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = "0";
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    textAlign: "center",
                                  }}
                                >
                                  Edit
                                </span>
                              </div>
                            </>
                          ) : (
                            <div
                              style={{
                                textAlign: "center",
                              }}
                            >
                              <CloudUploadIcon
                                sx={{
                                  fontSize: "32px",
                                  color: "#999",
                                  mb: 1,
                                }}
                              />
                              <p
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  color: "#666",
                                  margin: "4px 0 0 0",
                                }}
                              >
                                {variant.name}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      flex: "0 0 240px",
                      width: "240px",
                      maxWidth: "100%",
                      padding: "14px",
                      borderRadius: "14px",
                      border: "1px solid #e2e2e2",
                      background:
                        "linear-gradient(180deg, #fffaf5 0%, #ffffff 100%)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#222",
                      }}
                    >
                      Mobile Trending Preview
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#777",
                        marginTop: "4px",
                        marginBottom: "12px",
                        lineHeight: 1.4,
                      }}
                    >
                      {mobilePreviewHint}
                    </div>

                    <div
                      style={{
                        width: "140px",
                        height: "180px",
                        margin: "0 auto",
                        borderRadius: "16px",
                        overflow: "hidden",
                        position: "relative",
                        background:
                          "linear-gradient(135deg, rgba(255,145,77,0.22) 0%, rgba(255,145,77,0.08) 100%)",
                        boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
                      }}
                    >
                      {mobilePreviewImage ? (
                        <img
                          src={mobilePreviewImage}
                          alt="Mobile trending preview"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#c07d41",
                            fontSize: "12px",
                            fontWeight: "600",
                            textAlign: "center",
                            padding: "16px",
                          }}
                        >
                          No mobile image yet
                        </div>
                      )}

                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(180deg, rgba(0,0,0,0) 28%, rgba(0,0,0,0.82) 100%)",
                        }}
                      />

                      <div
                        style={{
                          position: "absolute",
                          left: "12px",
                          right: "12px",
                          bottom: "12px",
                          color: "#fff",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: "700",
                            lineHeight: 1.2,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {mobilePreviewTitle}
                        </div>
                        <div
                          style={{
                            marginTop: "4px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "10px",
                            color: "rgba(255,255,255,0.72)",
                          }}
                        >
                          <span>Explore</span>
                          <span aria-hidden="true">&gt;</span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: "11px",
                        color: "#666",
                        marginTop: "10px",
                        lineHeight: 1.45,
                      }}
                    >
                      Best result: keep faces, logos, and text away from the top
                      and bottom edges because the mobile card uses cover
                      cropping.
                    </div>
                  </div>
                </div>
              </div>

              {/* Legacy Image Fields (for backward compatibility) */}
              <div
                className={cx(
                  "category-form-input-group category-col-span-all",
                )}
              >
                <label
                  className={cx("category-input-label")}
                  style={{
                    fontSize: "12px",
                    color: "#999",
                  }}
                >
                  Legacy Images (Optional - for backward compatibility)
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(100px, 1fr))",
                    gap: "10px",
                    marginTop: "10px",
                  }}
                >
                  {/* Legacy Category Image */}
                  <div
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.click();
                    }}
                    style={{
                      cursor: "pointer",
                      borderRadius: "6px",
                      overflow: "hidden",
                      border: preview ? "2px solid #4caf50" : "2px dashed #ccc",
                      backgroundColor: "#f9f9f9",
                      aspectRatio: "1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                      position: "relative",
                      padding: "6px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--color-primary-orange)";
                      e.currentTarget.style.backgroundColor = "#fff3e0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = preview
                        ? "#4caf50"
                        : "#ccc";
                      e.currentTarget.style.backgroundColor = "#f9f9f9";
                    }}
                  >
                    {preview ? (
                      <>
                        <img
                          src={preview}
                          alt="Category"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            fontSize: "9px",
                            color: "#666",
                            fontWeight: "600",
                            padding: "2px 4px",
                            backgroundColor: "rgba(255,255,255,0.9)",
                            borderRadius: "3px",
                          }}
                        >
                          Category
                        </div>
                      </>
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "10px",
                          color: "#999",
                          textAlign: "center",
                        }}
                      >
                        Category Image
                      </Typography>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async () => {
                          const base64Data = reader.result;
                          // For legacy images, store base64 in form (will be handled by backend on submit)
                          setFormData((prev) => ({
                            ...prev,
                            categoryImage: base64Data,
                          }));
                          setPreview(base64Data);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />

                  {/* Legacy Live Image */}
                  <div
                    onClick={() => {
                      if (liveImageInputRef.current)
                        liveImageInputRef.current.click();
                    }}
                    style={{
                      cursor: "pointer",
                      borderRadius: "6px",
                      overflow: "hidden",
                      border: liveImagePreview
                        ? "2px solid #4caf50"
                        : "2px dashed #ccc",
                      backgroundColor: "#f9f9f9",
                      aspectRatio: "1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                      position: "relative",
                      padding: "6px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--color-primary-orange)";
                      e.currentTarget.style.backgroundColor = "#fff3e0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = liveImagePreview
                        ? "#4caf50"
                        : "#ccc";
                      e.currentTarget.style.backgroundColor = "#f9f9f9";
                    }}
                  >
                    {liveImagePreview ? (
                      <>
                        <img
                          src={liveImagePreview}
                          alt="Live"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            fontSize: "9px",
                            color: "#666",
                            fontWeight: "600",
                            padding: "2px 4px",
                            backgroundColor: "rgba(255,255,255,0.9)",
                            borderRadius: "3px",
                          }}
                        >
                          Live
                        </div>
                      </>
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "10px",
                          color: "#999",
                          textAlign: "center",
                        }}
                      >
                        Live Image
                      </Typography>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    ref={liveImageInputRef}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async () => {
                          const base64Data = reader.result;
                          // For legacy images, store base64 in form (will be handled by backend on submit)
                          setFormData((prev) => ({
                            ...prev,
                            liveImage: base64Data,
                          }));
                          setLiveImagePreview(base64Data);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />

                  {/* Remove buttons in compact form */}
                  {(preview || liveImagePreview) && (
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        mt: 1,
                        gridColumn: "1 / -1",
                      }}
                    >
                      {preview && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          sx={{
                            flex: 1,
                          }}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              categoryImage: "",
                            }));
                            setPreview(null);
                            if (fileInputRef.current)
                              fileInputRef.current.value = "";
                          }}
                        >
                          Remove Category
                        </Button>
                      )}
                      {liveImagePreview && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          sx={{
                            flex: 1,
                          }}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              liveImage: "",
                            }));
                            setLiveImagePreview(null);
                            if (liveImageInputRef.current)
                              liveImageInputRef.current.value = "";
                          }}
                        >
                          Remove Live
                        </Button>
                      )}
                    </Box>
                  )}
                </div>
              </div>

              {/* Filter Configuration */}
              <div
                className={cx(
                  "category-form-input-group category-col-span-all",
                )}
              >
                <div className={cx("category-section-title")}>
                  <span className={cx("label-with-help")}>
                    <span>Customer filters</span>
                    <HelpHint text={FIELD_HELP.customer_filters} />
                  </span>
                  <small>{formData.filterConfig.length} configured</small>
                </div>

                <div className={cx("filter-studio")}>
                  <div className={cx("filter-builder-panel")}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        mb: 1.25,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <TuneRoundedIcon
                          fontSize="small"
                          sx={{ color: "var(--color-primary-orange)" }}
                        />
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.6,
                          }}
                        >
                          {editingFilterIndex === null
                            ? "Build filter"
                            : "Edit filter"}
                          <HelpHint text={FIELD_HELP.build_filter} />
                        </Typography>
                      </Box>
                      {editingFilterIndex !== null && (
                        <Chip
                          size="small"
                          label={`Editing #${editingFilterIndex + 1}`}
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.75,
                        mb: 1.5,
                      }}
                    >
                      {FILTER_PRESETS.map((preset) => (
                        <Button
                          key={preset.name}
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setFilterDraft({
                              ...preset.draft,
                              options: [...preset.draft.options],
                            });
                            setEditingFilterIndex(null);
                            setFilterDraftError("");
                          }}
                          sx={{
                            textTransform: "none",
                            borderColor: "#e5e7eb",
                            color: "#374151",
                            bgcolor: "#fff",
                          }}
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </Box>

                    <div className={cx("filter-control-grid")}>
                      <label className={cx("filter-field")}>
                        <span className={cx("label-with-help")}>
                          <span>Label</span>
                          <HelpHint text={FIELD_HELP.filter_label} />
                        </span>
                        <input
                          className={cx("filter-input")}
                          value={filterDraft.label}
                          onChange={(e) =>
                            setFilterDraft((p) => ({
                              ...p,
                              label: e.target.value,
                            }))
                          }
                          placeholder="Service Type"
                        />
                      </label>
                      <label className={cx("filter-field")}>
                        <span className={cx("label-with-help")}>
                          <span>Key</span>
                          <HelpHint text={FIELD_HELP.filter_key} />
                        </span>
                        <input
                          className={cx("filter-input")}
                          value={filterDraft.key}
                          onChange={(e) =>
                            setFilterDraft((p) => ({
                              ...p,
                              key: e.target.value
                                .replace(/\s+/g, "_")
                                .toLowerCase(),
                            }))
                          }
                          placeholder="service_type"
                        />
                      </label>
                      <label className={cx("filter-field filter-type-field")}>
                        <span className={cx("label-with-help")}>
                          <span>Type</span>
                          <HelpHint text={FIELD_HELP.filter_type} />
                        </span>
                        <select
                          className={cx("filter-select")}
                          value={filterDraft.type}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFilterDraft((p) => ({
                              ...p,
                              type: value,
                              options: ["multiselect", "radio"].includes(value)
                                ? p.options
                                : [],
                              min: value === "range" ? p.min : "",
                              max: value === "range" ? p.max : "",
                              unit: value === "range" ? p.unit : "",
                            }));
                          }}
                        >
                          <option value="multiselect">Multi select</option>
                          <option value="radio">Single select</option>
                          <option value="toggle">Toggle</option>
                          <option value="range">Range</option>
                        </select>
                      </label>
                    </div>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.75, mb: 1.1 }}
                    >
                      {filterDraftHelp}
                    </Typography>

                    {["multiselect", "radio"].includes(filterDraft.type) && (
                      <div className={cx("filter-options-field")}>
                        <span className={cx("label-with-help")}>
                          <span>Options</span>
                          <HelpHint text={FIELD_HELP.filter_options} />
                        </span>
                        <Autocomplete
                          multiple
                          freeSolo
                          options={[]}
                          value={filterDraft.options}
                          onChange={(_, val) =>
                            setFilterDraft((p) => ({ ...p, options: val }))
                          }
                          renderTags={(value, getTagProps) =>
                            value.map((opt, i) => {
                              const { key, ...tagProps } = getTagProps({
                                index: i,
                              });
                              return (
                                <Chip
                                  key={key}
                                  label={opt}
                                  size="small"
                                  {...tagProps}
                                />
                              );
                            })
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              size="small"
                              placeholder="Type an option and press Enter"
                            />
                          )}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              minHeight: 38,
                              alignItems: "center",
                              bgcolor: "#fff",
                              borderRadius: "8px",
                            },
                            "& .MuiOutlinedInput-input": {
                              fontSize: "0.88rem",
                            },
                          }}
                        />
                      </div>
                    )}

                    {filterDraft.type === "range" && (
                      <div className={cx("filter-range-grid")}>
                        <label className={cx("filter-field")}>
                          <span className={cx("label-with-help")}>
                            <span>Min</span>
                            <HelpHint text={FIELD_HELP.filter_min} />
                          </span>
                          <input
                            className={cx("filter-input")}
                            type="number"
                            value={filterDraft.min}
                            onChange={(e) =>
                              setFilterDraft((p) => ({
                                ...p,
                                min: e.target.value,
                              }))
                            }
                            placeholder="0"
                          />
                        </label>
                        <label className={cx("filter-field")}>
                          <span className={cx("label-with-help")}>
                            <span>Max</span>
                            <HelpHint text={FIELD_HELP.filter_max} />
                          </span>
                          <input
                            className={cx("filter-input")}
                            type="number"
                            value={filterDraft.max}
                            onChange={(e) =>
                              setFilterDraft((p) => ({
                                ...p,
                                max: e.target.value,
                              }))
                            }
                            placeholder="5000"
                          />
                        </label>
                        <label className={cx("filter-field")}>
                          <span className={cx("label-with-help")}>
                            <span>Unit</span>
                            <HelpHint text={FIELD_HELP.filter_unit} />
                          </span>
                          <input
                            className={cx("filter-input")}
                            value={filterDraft.unit}
                            onChange={(e) =>
                              setFilterDraft((p) => ({
                                ...p,
                                unit: e.target.value,
                              }))
                            }
                            placeholder="INR"
                          />
                        </label>
                      </div>
                    )}

                    <div className={cx("filter-builder-footer")}>
                      <div className={cx("filter-flags")}>
                        <label>
                          <Checkbox
                            size="small"
                            checked={filterDraft.isRequired}
                            onChange={(e) =>
                              setFilterDraft((p) => ({
                                ...p,
                                isRequired: e.target.checked,
                              }))
                            }
                            sx={{ p: 0.35 }}
                          />
                          <span className={cx("label-with-help")}>
                            <span>Required</span>
                            <HelpHint text={FIELD_HELP.filter_required} />
                          </span>
                        </label>
                        <label>
                          <Checkbox
                            size="small"
                            checked={filterDraft.enabled !== false}
                            onChange={(e) =>
                              setFilterDraft((p) => ({
                                ...p,
                                enabled: e.target.checked,
                              }))
                            }
                            sx={{
                              p: 0.35,
                              color: "#2f6f5e",
                              "&.Mui-checked": { color: "#2f6f5e" },
                            }}
                          />
                          <span className={cx("label-with-help")}>
                            <span>Visible</span>
                            <HelpHint text={FIELD_HELP.filter_visible} />
                          </span>
                        </label>
                      </div>

                      <div className={cx("filter-actions")}>
                        {editingFilterIndex === null ? (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddRoundedIcon />}
                            onClick={handleAddFilterField}
                            sx={{
                              bgcolor: "var(--color-primary-orange)",
                              "&:hover": { bgcolor: "#D97800" },
                              textTransform: "none",
                            }}
                          >
                            Add filter
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() =>
                                handleUpdateFilterField(editingFilterIndex)
                              }
                              sx={{
                                bgcolor: "#2f6f5e",
                                "&:hover": { bgcolor: "#265a4d" },
                                textTransform: "none",
                              }}
                            >
                              Update
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<CloseRoundedIcon />}
                              onClick={handleCancelEditFilter}
                              sx={{
                                color: "#4b5563",
                                borderColor: "#d1d5db",
                                textTransform: "none",
                              }}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {filterDraftError && (
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ display: "block", mt: 1 }}
                      >
                        {filterDraftError}
                      </Typography>
                    )}
                  </div>

                  <div className={cx("filter-list-panel")}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        mb: 1.25,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Active filter set
                      </Typography>
                      <Chip
                        size="small"
                        label={`${visibleFilterCount}/${formData.filterConfig.length} visible`}
                        sx={{
                          bgcolor: "#eef6f3",
                          color: "#2f6f5e",
                          fontWeight: 700,
                        }}
                      />
                    </Box>

                    {formData.filterConfig.length === 0 ? (
                      <Box
                        sx={{
                          p: 2,
                          border: "1px dashed #d1d5db",
                          borderRadius: 1.5,
                          bgcolor: "#fff",
                          color: "#6b7280",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, mb: 0.25 }}
                        >
                          No filters yet
                        </Typography>
                        <Typography variant="caption">
                          Add a preset or build a custom filter for this
                          category.
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.75,
                        }}
                      >
                        {formData.filterConfig.map((fc, i) => {
                          const isEnabled = fc.enabled !== false;
                          return (
                            <Box
                              key={i}
                              className={cx(
                                isEnabled
                                  ? "filter-row"
                                  : "filter-row filter-row-hidden",
                              )}
                            >
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.75,
                                    minWidth: 0,
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 700,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {fc.label}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={fc.type}
                                    sx={{
                                      height: 20,
                                      fontSize: 11,
                                      bgcolor: "#f3f4f6",
                                    }}
                                  />
                                  {fc.isRequired && (
                                    <Chip
                                      size="small"
                                      label="Required"
                                      color="warning"
                                      variant="outlined"
                                      sx={{ height: 20, fontSize: 11 }}
                                    />
                                  )}
                                </Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    display: "block",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {fc.key} - {getFilterSummary(fc)}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.25,
                                  flexShrink: 0,
                                }}
                              >
                                <Tooltip
                                  title={
                                    isEnabled ? "Hide from UI" : "Show in UI"
                                  }
                                >
                                  {isEnabled ? (
                                    <EyeOutlined
                                      onClick={() =>
                                        handleToggleFilterEnabled(i)
                                      }
                                      style={{
                                        fontSize: 16,
                                        color: "#22c55e",
                                        cursor: "pointer",
                                      }}
                                    />
                                  ) : (
                                    <EyeInvisibleOutlined
                                      onClick={() =>
                                        handleToggleFilterEnabled(i)
                                      }
                                      style={{
                                        fontSize: 16,
                                        color: "#9ca3af",
                                        cursor: "pointer",
                                      }}
                                    />
                                  )}
                                </Tooltip>
                                <Tooltip title="Move up">
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleMoveFilterField(i, -1)
                                      }
                                      disabled={i === 0}
                                    >
                                      <KeyboardArrowUpRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Move down">
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleMoveFilterField(i, 1)
                                      }
                                      disabled={
                                        i === formData.filterConfig.length - 1
                                      }
                                    >
                                      <KeyboardArrowDownRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Edit">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleEditFilterField(i)}
                                  >
                                    <EditOutlined style={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Remove">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleRemoveFilterField(i)}
                                  >
                                    <DeleteOutlined style={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </div>
                </div>
                <Box
                  sx={{
                    display: "none",
                    mt: 1,
                    p: 2,
                    border: "1px solid #e0e0e0",
                    borderRadius: 2,
                    bgcolor: "#fafafa",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1.5,
                      mb: filterDraftError ? 0.5 : 0,
                    }}
                  >
                    <TextField
                      size="small"
                      label="Key"
                      value={filterDraft.key}
                      onChange={(e) =>
                        setFilterDraft((p) => ({
                          ...p,
                          key: e.target.value
                            .replace(/\s+/g, "_")
                            .toLowerCase(),
                        }))
                      }
                      placeholder="e.g. cuisineType"
                      sx={{ flex: "1 1 120px" }}
                    />
                    <TextField
                      size="small"
                      label="Label"
                      value={filterDraft.label}
                      onChange={(e) =>
                        setFilterDraft((p) => ({ ...p, label: e.target.value }))
                      }
                      placeholder="e.g. Cuisine Type"
                      sx={{ flex: "1 1 130px" }}
                    />
                    <TextField
                      size="small"
                      select
                      label="Type"
                      value={filterDraft.type}
                      onChange={(e) =>
                        setFilterDraft((p) => ({
                          ...p,
                          type: e.target.value,
                          options: [],
                        }))
                      }
                      SelectProps={{ native: true }}
                      sx={{ flex: "0 0 120px" }}
                    >
                      <option value="multiselect">Multiselect</option>
                      <option value="radio">Radio</option>
                      <option value="toggle">Toggle</option>
                      <option value="range">Range</option>
                    </TextField>

                    {["multiselect", "radio"].includes(filterDraft.type) && (
                      <Autocomplete
                        multiple
                        freeSolo
                        options={[]}
                        value={filterDraft.options}
                        onChange={(_, val) =>
                          setFilterDraft((p) => ({ ...p, options: val }))
                        }
                        renderTags={(value, getTagProps) =>
                          value.map((opt, i) => {
                            const { key, ...tagProps } = getTagProps({
                              index: i,
                            });
                            return (
                              <Chip
                                key={key}
                                label={opt}
                                size="small"
                                {...tagProps}
                              />
                            );
                          })
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Options (Enter to add)"
                            placeholder="Add option"
                          />
                        )}
                        sx={{ flex: "1 1 200px" }}
                      />
                    )}

                    {filterDraft.type === "range" && (
                      <>
                        <TextField
                          size="small"
                          label="Min"
                          type="number"
                          value={filterDraft.min}
                          onChange={(e) =>
                            setFilterDraft((p) => ({
                              ...p,
                              min: e.target.value,
                            }))
                          }
                          sx={{ flex: "0 0 70px" }}
                        />
                        <TextField
                          size="small"
                          label="Max"
                          type="number"
                          value={filterDraft.max}
                          onChange={(e) =>
                            setFilterDraft((p) => ({
                              ...p,
                              max: e.target.value,
                            }))
                          }
                          sx={{ flex: "0 0 70px" }}
                        />
                        <TextField
                          size="small"
                          label="Unit"
                          value={filterDraft.unit}
                          onChange={(e) =>
                            setFilterDraft((p) => ({
                              ...p,
                              unit: e.target.value,
                            }))
                          }
                          placeholder="₹ / yrs"
                          sx={{ flex: "0 0 70px" }}
                        />
                      </>
                    )}

                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Checkbox
                        size="small"
                        checked={filterDraft.isRequired}
                        onChange={(e) =>
                          setFilterDraft((p) => ({
                            ...p,
                            isRequired: e.target.checked,
                          }))
                        }
                        sx={{ p: 0.5 }}
                      />
                      <Typography variant="caption">Required</Typography>
                    </Box>

                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Checkbox
                        size="small"
                        checked={filterDraft.enabled !== false}
                        onChange={(e) =>
                          setFilterDraft((p) => ({
                            ...p,
                            enabled: e.target.checked,
                          }))
                        }
                        sx={{
                          p: 0.5,
                          color: "#4caf50",
                          "&.Mui-checked": { color: "#4caf50" },
                        }}
                      />
                      <Typography variant="caption">Show in UI</Typography>
                    </Box>

                    {editingFilterIndex === null ? (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleAddFilterField}
                        sx={{
                          bgcolor: "var(--color-primary-orange)",
                          "&:hover": { bgcolor: "#D97800" },
                          alignSelf: "center",
                          flexShrink: 0,
                        }}
                      >
                        + Add
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() =>
                            handleUpdateFilterField(editingFilterIndex)
                          }
                          sx={{
                            bgcolor: "#4caf50",
                            "&:hover": { bgcolor: "#45a049" },
                            alignSelf: "center",
                            flexShrink: 0,
                          }}
                        >
                          ✓ Update
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleCancelEditFilter}
                          sx={{
                            color: "#666",
                            borderColor: "#ddd",
                            alignSelf: "center",
                            flexShrink: 0,
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </Box>

                  {filterDraftError && (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{ display: "block", mt: 0.5 }}
                    >
                      {filterDraftError}
                    </Typography>
                  )}
                </Box>

                {/* Saved filter fields list */}
                {formData.filterConfig.length > 0 && (
                  <Box
                    sx={{
                      mt: 1.5,
                      display: "none",
                      flexDirection: "column",
                      gap: 0.75,
                    }}
                  >
                    {formData.filterConfig.map((fc, i) => {
                      const isEnabled = fc.enabled !== false;
                      return (
                        <Box
                          key={i}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            p: 1.5,
                            border: `1px solid ${isEnabled ? "#e0e0e0" : "#f5c6c6"}`,
                            borderRadius: 1,
                            bgcolor: isEnabled ? "#fff" : "#fff8f8",
                            opacity: isEnabled ? 1 : 0.75,
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                              >
                                {fc.label}
                              </Typography>
                              <Chip
                                label={isEnabled ? "Visible" : "Hidden"}
                                size="small"
                                onClick={() => handleToggleFilterEnabled(i)}
                                sx={{
                                  height: 18,
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  bgcolor: isEnabled ? "#e8f5e9" : "#fce4ec",
                                  color: isEnabled ? "#2e7d32" : "#c62828",
                                  "& .MuiChip-label": { px: 0.75 },
                                  "&:hover": {
                                    bgcolor: isEnabled ? "#c8e6c9" : "#f8bbd0",
                                  },
                                }}
                              />
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              key: {fc.key} &nbsp;|&nbsp; {fc.type}
                              {fc.options?.length
                                ? ` | ${fc.options.join(", ")}`
                                : ""}
                              {fc.type === "range"
                                ? ` | ${fc.min}–${fc.max} ${fc.unit}`
                                : ""}
                              {fc.isRequired ? " | required" : ""}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => handleMoveFilterField(i, -1)}
                            disabled={i === 0}
                          >
                            ▲
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleMoveFilterField(i, 1)}
                            disabled={i === formData.filterConfig.length - 1}
                          >
                            ▼
                          </IconButton>
                          <EditOutlined
                            onClick={() => handleEditFilterField(i)}
                            style={{
                              fontSize: 17,
                              color: "#3b82f6",
                              cursor: "pointer",
                            }}
                          />
                          <DeleteOutlined
                            onClick={() => handleRemoveFilterField(i)}
                            style={{
                              fontSize: 17,
                              color: "#ef4444",
                              cursor: "pointer",
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </div>

              {/* Submit Button */}
              <div
                className={cx(
                  "category-form-input-group category-col-span-all",
                )}
              >
                <button
                  type="submit"
                  className={cx("category-submit-button")}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: loading
                      ? "#ccc"
                      : "var(--color-primary-orange)",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading || createWarningLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : editMode ? (
                    "Update Category"
                  ) : (
                    "Create Category"
                  )}
                </button>
              </div>
            </form>

            {errors._form && (
              <p
                className={cx("category-error-text")}
                style={{ marginTop: "16px", color: "#d32f2f" }}
              >
                {errors._form}
              </p>
            )}

            {error && (
              <p
                className={cx("category-error-text")}
                style={{
                  marginTop: "16px",
                }}
              >
                {" "}
                {(() => {
                  if (typeof error === "string") return error;
                  if (error instanceof Error) return error.message;
                  if (typeof error === "object")
                    return JSON.stringify(error, null, 2);
                  return String(error);
                })()}
              </p>
            )}
          </div>
        </>
      )}

      {activeView === "list" && (
        <>
          <div className={cx("category-list-shell")}>
            <div className={cx("category-list-header")}>
              <div>
                <span className={cx("category-kicker")}>Category library</span>
                <h2 className={cx("category-editor-title")}>
                  Manage categories
                </h2>
                <p className={cx("category-editor-subtitle")}>
                  Compact view for category details, SEO health, images, and
                  customer filters.
                </p>
              </div>
              <Button
                variant="outlined"
                color="warning"
                size="small"
                startIcon={
                  dupLoading ? (
                    <CircularProgress size={16} />
                  ) : (
                    <ContentCopyRoundedIcon />
                  )
                }
                onClick={findDuplicates}
                disabled={dupLoading}
                sx={{ textTransform: "none", alignSelf: "flex-start" }}
              >
                Find Duplicates
              </Button>
            </div>

              <CustomizedTable
                title="Categories"
                data={lookupRows}
                columns={categoryList}
                total={hasLookupFilter ? lookupRows.length : total}
                fetchData={(pageNo, pageSize, options) =>
                  dispatch(
                    getAllCategory({
                      pageNo,
                      pageSize,
                      options,
                    }),
                  )
                  
                }
              />
            </div>\
        </>
      )}

      {/* Duplicates Dialog */}
      <Dialog
        open={dupDialog.open}
        onClose={() =>
          setDupDialog({
            open: false,
            groups: [],
          })
        }
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <span>
              Duplicate Categories
              {dupDialog.groups.length === 0
                ? " — None Found"
                : ` — ${dupDialog.groups.length} group(s)`}
            </span>
            <ToggleButtonGroup
              value={dupMode}
              exclusive
              onChange={handleModeChange}
              size="small"
            >
              <ToggleButton value="exact">Exact Name</ToggleButton>
              <ToggleButton value="similar">Similar Name</ToggleButton>
              <ToggleButton value="semantic">Semantic</ToggleButton>
              <ToggleButton value="slug">Exact Slug</ToggleButton>
              <ToggleButton value="similar-slug">Similar Slug</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {dupDialog.groups.length === 0 ? (
            <Typography>No duplicate categories found.</Typography>
          ) : (
            dupDialog.groups.map((group, gi) => {
              const groupIds = group.map((c) => c._id);
              const allSelected = groupIds.every((id) =>
                selectedDups.includes(id),
              );
              return (
                <Box
                  key={gi}
                  sx={{
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 0.5,
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={allSelected}
                      indeterminate={
                        groupIds.some((id) => selectedDups.includes(id)) &&
                        !allSelected
                      }
                      onChange={() => toggleSelectGroup(group)}
                    />
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        textTransform: "capitalize",
                      }}
                    >
                      "{group[0].category}" — {group.length} entries
                    </Typography>
                  </Box>
                  {group.map((cat) => (
                    <Box
                      key={cat._id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        pl: 4,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: selectedDups.includes(cat._id)
                          ? "rgba(211,47,47,0.07)"
                          : "transparent",
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={selectedDups.includes(cat._id)}
                        onChange={() => toggleDupSelect(cat._id)}
                      />
                      {cat.categoryImage ? (
                        <Avatar
                          src={cat.categoryImage}
                          sx={{
                            width: 32,
                            height: 32,
                          }}
                        />
                      ) : (
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            fontSize: 14,
                          }}
                        >
                          {(cat.category || "?")[0].toUpperCase()}
                        </Avatar>
                      )}
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                          }}
                        >
                          {cat.category}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {cat.categoryType}
                          {cat.subCategoryType
                            ? ` › ${cat.subCategoryType}`
                            : ""}{" "}
                          &nbsp;|&nbsp; slug: {cat.slug || "—"} &nbsp;|&nbsp;
                          id: {cat._id}
                        </Typography>
                        {(() => {
                          const count =
                            businessUsage[(cat.category || "").toLowerCase()];
                          return count > 0 ? (
                            <Typography
                              variant="caption"
                              sx={{
                                color: "warning.main",
                                fontWeight: 600,
                              }}
                            >
                              ⚠ {count} business{count !== 1 ? "es" : ""} using
                              this category
                            </Typography>
                          ) : (
                            <Typography
                              variant="caption"
                              sx={{
                                color: "success.main",
                              }}
                            >
                              No businesses linked
                            </Typography>
                          );
                        })()}
                      </Box>
                    </Box>
                  ))}
                  {gi < dupDialog.groups.length - 1 && (
                    <Divider
                      sx={{
                        mt: 1.5,
                      }}
                    />
                  )}
                </Box>
              );
            })
          )}
        </DialogContent>
        <DialogActions
          sx={{
            justifyContent: "space-between",
            px: 3,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {selectedDups.length} selected
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 1,
            }}
          >
            <Button
              onClick={() =>
                setDupDialog({
                  open: false,
                  groups: [],
                })
              }
            >
              Close
            </Button>
            <Button
              color="warning"
              variant="outlined"
              disabled={selectedDups.length === 0 || !!dupDeleting}
              onClick={() => deleteSelectedDups(false)}
              startIcon={
                dupDeleting === "soft" ? (
                  <CircularProgress size={16} color="inherit" />
                ) : null
              }
            >
              Soft Delete ({selectedDups.length})
            </Button>
            {/* <Button
              color="error"
              variant="contained"
              disabled={selectedDups.length === 0 || !!dupDeleting}
              onClick={() => deleteSelectedDups(true)}
              startIcon={dupDeleting === "hard" ? <CircularProgress size={16} color="inherit" /> : null}
             >
              Hard Delete ({selectedDups.length})
             </Button> */}
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteConfirm.open}
        onClose={() =>
          setDeleteConfirm({
            open: false,
            id: null,
          })
        }
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this category?
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setDeleteConfirm({
                open: false,
                id: null,
              })
            }
            color="secondary"
          >
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Variant Modal */}
      {imageModalOpen.variantKey && (
        <Dialog
          open={imageModalOpen.open}
          onClose={() =>
            setImageModalOpen({
              open: false,
              variantKey: null,
            })
          }
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle
            sx={{
              pb: 1,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{IMAGE_VARIANTS[imageModalOpen.variantKey]?.name}</span>
              <IconButton
                size="small"
                onClick={() =>
                  setImageModalOpen({
                    open: false,
                    variantKey: null,
                  })
                }
              >
                ×
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent
            dividers
            sx={{
              py: 2,
            }}
          >
            {/* Image Specs */}
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                backgroundColor: "#f5f5f5",
                borderRadius: "6px",
              }}
            >
              <Typography
                variant="caption"
                display="block"
                sx={{
                  color: "#666",
                  mb: 0.5,
                }}
              >
                {IMAGE_VARIANTS[imageModalOpen.variantKey]?.description}
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 1,
                  fontSize: "12px",
                  color: "#888",
                }}
              >
                <div>
                  Size: {IMAGE_VARIANTS[imageModalOpen.variantKey]?.minWidth}x
                  {IMAGE_VARIANTS[imageModalOpen.variantKey]?.minHeight} -{" "}
                  {IMAGE_VARIANTS[imageModalOpen.variantKey]?.maxWidth}x
                  {IMAGE_VARIANTS[imageModalOpen.variantKey]?.maxHeight}px
                </div>
                <div>
                  Aspect:{" "}
                  {IMAGE_VARIANTS[imageModalOpen.variantKey]?.aspectRatio}
                </div>
                <div>
                  Max File:{" "}
                  {IMAGE_VARIANTS[imageModalOpen.variantKey]?.maxFileSize}MB
                </div>
              </Box>
            </Box>

            {/* Preview */}
            {imagePreviews[imageModalOpen.variantKey] && (
              <Box
                sx={{
                  mb: 2,
                  textAlign: "center",
                }}
              >
                <img
                  src={imagePreviews[imageModalOpen.variantKey]}
                  alt={IMAGE_VARIANTS[imageModalOpen.variantKey]?.name}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "300px",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                  }}
                />
                {imageDimensions[imageModalOpen.variantKey] && (
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{
                      mt: 1,
                      color: "#666",
                    }}
                  >
                    ✓ {imageDimensions[imageModalOpen.variantKey].width}x
                    {imageDimensions[imageModalOpen.variantKey].height}px
                  </Typography>
                )}
              </Box>
            )}

            {/* Upload Button */}
            <Button
              variant="contained"
              component="label"
              fullWidth
              startIcon={
                uploadingImageVariant === imageModalOpen.variantKey ? (
                  <CircularProgress size={20} />
                ) : (
                  <CloudUploadIcon />
                )
              }
              sx={{
                mb: 2,
              }}
              disabled={uploadingImageVariant === imageModalOpen.variantKey}
            >
              {uploadingImageVariant === imageModalOpen.variantKey
                ? "Uploading..."
                : imagePreviews[imageModalOpen.variantKey]
                  ? "Replace Image"
                  : "Upload Image"}
              <input
                type="file"
                accept="image/*"
                hidden
                ref={imageInputRefs[imageModalOpen.variantKey]}
                onChange={(e) => {
                  handleImageChange(e, imageModalOpen.variantKey);
                }}
                disabled={uploadingImageVariant === imageModalOpen.variantKey}
              />
            </Button>
          </DialogContent>
          <DialogActions
            sx={{
              p: 2,
            }}
          >
            {imagePreviews[imageModalOpen.variantKey] && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    categoryImages: {
                      ...prev.categoryImages,
                      [imageModalOpen.variantKey]: "",
                    },
                  }));
                  setImagePreviews((prev) => ({
                    ...prev,
                    [imageModalOpen.variantKey]: null,
                  }));
                  if (imageInputRefs[imageModalOpen.variantKey].current) {
                    imageInputRefs[imageModalOpen.variantKey].current.value =
                      "";
                  }
                }}
              >
                Remove
              </Button>
            )}
            <Box
              sx={{
                flex: 1,
              }}
            />
            <Button
              onClick={() =>
                setImageModalOpen({
                  open: false,
                  variantKey: null,
                })
              }
            >
              Done
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Create duplicate warning dialog */}
      <Dialog
        open={createWarning.open}
        onClose={() =>
          setCreateWarning({
            open: false,
            matches: [],
          })
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            color: "warning.main",
          }}
        >
          ⚠ Similar Categories Already Exist
        </DialogTitle>
        <DialogContent dividers>
          <Typography
            variant="body2"
            sx={{
              mb: 2,
            }}
          >
            The category <strong>"{formData.category}"</strong> is similar to{" "}
            {createWarning.matches.length} existing{" "}
            {createWarning.matches.length === 1 ? "category" : "categories"}:
          </Typography>
          {createWarning.matches.map((cat) => {
            const count = businessUsage[(cat.category || "").toLowerCase()];
            return (
              <Box
                key={cat._id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  py: 0.75,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                {cat.categoryImage ? (
                  <Avatar
                    src={cat.categoryImage}
                    sx={{
                      width: 32,
                      height: 32,
                    }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: 14,
                    }}
                  >
                    {(cat.category || "?")[0].toUpperCase()}
                  </Avatar>
                )}
                <Box
                  sx={{
                    flex: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                    }}
                  >
                    {cat.category}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cat.categoryType}
                    {cat.subCategoryType
                      ? ` › ${cat.subCategoryType}`
                      : ""}{" "}
                    &nbsp;|&nbsp; slug: {cat.slug || "—"}
                  </Typography>
                  <br />
                  {count > 0 ? (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "warning.main",
                        fontWeight: 600,
                      }}
                    >
                      ⚠ {count} business{count !== 1 ? "es" : ""} using this
                      category
                    </Typography>
                  ) : (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "success.main",
                      }}
                    >
                      No businesses linked
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </DialogContent>
        <DialogActions
          sx={{
            justifyContent: "space-between",
            px: 3,
          }}
        >
          <Button
            onClick={() =>
              setCreateWarning({
                open: false,
                matches: [],
              })
            }
          >
            Cancel
          </Button>
          <Button
            color="warning"
            variant="contained"
            onClick={() => {
              setCreateWarning({
                open: false,
                matches: [],
              });
              doSave();
            }}
          >
            Allow — Create Anyway
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Cropper Modal */}
      <Dialog
        open={cropperOpen}
        onClose={() => setCropperOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Crop Image - {IMAGE_VARIANTS[cropData.variantKey]?.name}</span>
          <IconButton size="small" onClick={() => setCropperOpen(false)}>
            ×
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: 2,
          }}
        >
          {cropData.image && (
            <>
              <Box
                sx={{
                  mb: 2,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "#666",
                  }}
                >
                  Drag to move • Scroll to zoom • Resize handles to adjust crop
                  area
                </Typography>
              </Box>
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: "400px",
                  backgroundColor: "#f0f0f0",
                }}
              >
                <Cropper
                  image={cropData.image}
                  crop={cropData.crop}
                  zoom={cropData.zoom}
                  aspect={cropData.aspect}
                  onCropChange={(crop) =>
                    setCropData((prev) => ({
                      ...prev,
                      crop,
                    }))
                  }
                  onCropComplete={(croppedArea, croppedAreaPixels) =>
                    setCropData((prev) => ({
                      ...prev,
                      croppedAreaPixels,
                    }))
                  }
                  onZoomChange={(zoom) =>
                    setCropData((prev) => ({
                      ...prev,
                      zoom,
                    }))
                  }
                />
              </Box>
              <Box
                sx={{
                  mt: 2,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "#666",
                    display: "block",
                    mb: 1,
                  }}
                >
                  Zoom: {(cropData.zoom * 100).toFixed(0)}%
                </Typography>
                <Slider
                  value={cropData.zoom}
                  onChange={(e, zoom) =>
                    setCropData((prev) => ({
                      ...prev,
                      zoom,
                    }))
                  }
                  min={1}
                  max={3}
                  step={0.1}
                  valueLabelDisplay="auto"
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
          }}
        >
          <Button
            onClick={() => setCropperOpen(false)}
            disabled={uploadingImageVariant}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCropSave}
            disabled={uploadingImageVariant}
            startIcon={
              uploadingImageVariant ? <CircularProgress size={20} /> : null
            }
          >
            {uploadingImageVariant ? "Uploading..." : "Save Crop"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Detail Drawer */}
      <Drawer anchor="right" open={Boolean(detailRow)} onClose={() => setDetailRow(null)}
        PaperProps={{ sx: { width: 460, p: 0 } }}>
        {detailRow && (() => {
          const row = detailRow;
          const SLabel = ({ children }) => (
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.25 }}>
              {children}
            </Typography>
          );
          const DRow = ({ label, value }) => {
            if (!value || value === "-") return null;
            return (
              <Box sx={{ mb: 1.5 }}>
                <SLabel>{label}</SLabel>
                <Typography sx={{ fontSize: "0.85rem", color: "#1f2937" }}>{value}</Typography>
              </Box>
            );
          };
          const images = row.categoryImages || {};
          const imageEntries = Object.entries(images).filter(([, url]) => url);
          return (
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
              {/* Header */}
              <Box sx={{ p: 2.5, bgcolor: "#fff7ed", borderBottom: "1px solid #e0e6ed", display: "flex", gap: 2, alignItems: "center", flexShrink: 0 }}>
                <Avatar src={row.categoryImage || images.webCard || images.webThumbnail} alt={row.category}
                  sx={{ width: 52, height: 52, borderRadius: 1.5 }} variant="square" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#1f2937" }}>{row.category}</Typography>
                  <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 0.5 }}>
                    {row.categoryType && <Chip label={row.categoryType} size="small" sx={{ fontSize: "0.7rem", bgcolor: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }} />}
                    {row.subCategoryType && <Chip label={row.subCategoryType} size="small" sx={{ fontSize: "0.7rem" }} />}
                  </Box>
                </Box>
                <Button size="small" variant="outlined" onClick={() => { setDetailRow(null); handleEdit(row); }}
                  sx={{ fontSize: "0.75rem", textTransform: "none", borderColor: "#ff7a00", color: "#ff7a00", "&:hover": { borderColor: "#d46900", bgcolor: "#fff7ed" }, flexShrink: 0 }}>
                  Edit
                </Button>
              </Box>

              <Box sx={{ flex: 1, overflowY: "auto", p: 2.5 }}>
                {/* Basic Info */}
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#ff7a00", textTransform: "uppercase", letterSpacing: "0.08em", mb: 1.5 }}>Basic Info</Typography>
                <DRow label="Display Title" value={row.title} />
                <DRow label="Slug" value={row.slug} />
                <DRow label="Description" value={row.description} />
                <Divider sx={{ my: 2 }} />

                {/* SEO */}
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#ff7a00", textTransform: "uppercase", letterSpacing: "0.08em", mb: 1.5 }}>SEO</Typography>
                <DRow label="SEO Title" value={row.seoTitle} />
                <DRow label="SEO Description" value={row.seoDescription} />
                {row.keywords && row.keywords !== "-" && (
                  <Box sx={{ mb: 1.5 }}>
                    <SLabel>Keywords</SLabel>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                      {row.keywords.split(",").map((k, i) => (
                        <Chip key={i} label={k.trim()} size="small" sx={{ fontSize: "0.7rem" }} />
                      ))}
                    </Box>
                  </Box>
                )}
                {Array.isArray(row.filterConfig) && row.filterConfig.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#ff7a00", textTransform: "uppercase", letterSpacing: "0.08em", mb: 1.5 }}>Filters ({row.filterConfig.length})</Typography>
                    {row.filterConfig.map((f, i) => (
                      <Box key={i} sx={{ mb: 1, px: 1.5, py: 1, bgcolor: "#f9fafb", borderRadius: 1, border: "0.5px solid #e5e7eb" }}>
                        <Typography sx={{ fontSize: "0.82rem", fontWeight: 500, color: "#1f2937" }}>{f.label || f.key}</Typography>
                        {f.type && <Typography sx={{ fontSize: "0.72rem", color: "#6b7280" }}>{f.type}</Typography>}
                      </Box>
                    ))}
                  </>
                )}
                {imageEntries.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#ff7a00", textTransform: "uppercase", letterSpacing: "0.08em", mb: 1.5 }}>Images</Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                      {imageEntries.map(([variant, url]) => (
                        <Box key={variant} sx={{ textAlign: "center" }}>
                          <img src={url} alt={variant} style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 6, border: "0.5px solid #e5e7eb" }} />
                          <Typography sx={{ fontSize: "0.68rem", color: "#9ca3af", mt: 0.5 }}>{variant}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          );
        })()}
      </Drawer>
    </div>
  );
}
