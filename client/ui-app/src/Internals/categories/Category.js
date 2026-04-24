import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  getAllCategory,
  createCategory,
  editCategory,
  deleteCategory,
  hardDeleteCategory,
} from "../../redux/actions/categoryAction";
import "./categories.css";
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
  TextField,
  Autocomplete,
  Chip,
  InputAdornment,
  Checkbox,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CustomizedTable from "../../components/Table/CustomizedTable";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";

const API_URL = process.env.REACT_APP_API_URL;

const NOISE_WORDS = new Set([
  "and", "the", "near", "me", "center", "centre",
  "service", "services", "solution", "solutions",
  "provider", "providers",
]);

const SYNONYM_MAP = (() => {
  const groups = {
    repair:   ["repair", "repairs", "maintenance", "fix", "fixing", "servicing"],
    computer: ["computer", "computers", "pc", "desktop", "desktops"],
    laptop:   ["laptop", "laptops"],
  };
  const map = {};
  for (const [canonical, words] of Object.entries(groups)) {
    for (const w of words) map[w] = canonical;
  }
  return map;
})();

const SPLIT_DICT = [
  "laptop", "computer", "desktop", "mobile", "phone", "printer",
  "repair", "service", "maintenance", "camera", "ac", "tv",
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
        .filter((w) => !NOISE_WORDS.has(w) && w.length > 1)
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
    return (text || "").toLowerCase().trim().replace(/e?s$/i, "").replace(/[^a-z0-9]+/g, " ").trim();
  return (text || "").toLowerCase().trim();
};

export default function Category() {
  const dispatch = useDispatch();
  const { category = [], total = 0, loading, error } = useSelector(
    (state) => state.categoryReducer || {}
  );
  const fileInputRef = useRef();
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    _id: null,
    categoryImage: "",
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
  });

  const [preview, setPreview] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [inputKeyword, setInputKeyword] = useState("");
  const [dupDialog, setDupDialog] = useState({ open: false, groups: [] });
  const [selectedDups, setSelectedDups] = useState([]);
  const [dupLoading, setDupLoading] = useState(false);
  const [dupDeleting, setDupDeleting] = useState(false);
  const [dupMode, setDupMode] = useState("exact");
  const [allCatsCache, setAllCatsCache] = useState([]);
  const [businessUsage, setBusinessUsage] = useState({});
  const [createWarning, setCreateWarning] = useState({ open: false, matches: [] });
  const [createWarningLoading, setCreateWarningLoading] = useState(false);

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
      setFormData((prev) => ({ ...prev, slug }));
    }
  }, [formData.category]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleKeywordChange = (event, newValue) => {
    setFormData((prev) => ({ ...prev, keywords: newValue }));
  };

  const handleEdit = (row) => {
    setEditMode(true);
    setFormData({
      _id: row._id,
      categoryImage: row.categoryImage || "",
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
    });
    setPreview(row.categoryImage || null);
  };

  const handleDelete = (row) => {
    setDeleteConfirm({ open: true, id: row.id });
  };

  const confirmDelete = () => {
    if (deleteConfirm.id) {
      dispatch(deleteCategory(deleteConfirm.id))
        .then(() => dispatch(getAllCategory()))
        .catch((err) => console.error("Delete failed:", err))
        .finally(() => setDeleteConfirm({ open: false, id: null }));
    }
  };

  const handleAddKeyword = () => {
    const trimmed = inputKeyword.trim();
    if (trimmed && !formData.keywords.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        keywords: [...prev.keywords, trimmed],
      }));
      setInputKeyword("");
    }
  };

  const handleKeywordDelete = (keywordToDelete) => {
    setFormData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((k) => k !== keywordToDelete),
    }));
  };

  const validateForm = () => {
    let newErrors = {};

    if (!formData.category.trim()) newErrors.category = "Category is required";
    if (!formData.categoryType)
      newErrors.categoryType = "Category Type is required";
    if (formData.categoryType === "Sub Category" && !formData.subCategoryType)
      newErrors.subCategoryType = "Sub Category Type is required";
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.keywords.length)
      newErrors.keywords = "At least one keyword is required";
    if (!formData.description.trim())
      newErrors.description = "Description is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, categoryImage: reader.result }));
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
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
      const params = names.map((n) => `names=${encodeURIComponent(n)}`).join("&");
      const res = await axios.get(`${API_URL}/category/business-usage?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(
        `${API_URL}/category/viewall?pageNo=1&pageSize=9999&status=active`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const allCats = response.data.data || [];
      setAllCatsCache(allCats);
      const groups = computeDupGroups(allCats, dupMode);
      setDupDialog({ open: true, groups });
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
    setDupDialog((prev) => ({ ...prev, groups }));
    setSelectedDups([]);
  };

  const toggleDupSelect = (id) => {
    setSelectedDups((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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
      const remaining = allCatsCache.filter((c) => !selectedDups.includes(c._id));
      setAllCatsCache(remaining);
      const groups = computeDupGroups(remaining, dupMode);
      setDupDialog((prev) => ({ ...prev, groups }));
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
      _id: null, categoryImage: "", category: "", categoryType: "",
      subCategoryType: "", parentCategoryId: "", title: "", keywords: [],
      description: "", seoTitle: "", seoDescription: "", slug: "",
    });
    setPreview(null);
    setEditMode(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const doSave = () => {
    const action = editMode ? editCategory(formData._id, formData) : createCategory(formData);
    dispatch(action)
      .then(() => { resetForm(); dispatch(getAllCategory()); })
      .catch((err) => console.error(editMode ? "Update failed:" : "Create failed:", err));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!editMode) {
      setCreateWarningLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        const res = await axios.get(
          `${API_URL}/category/viewall?pageNo=1&pageSize=9999&status=active`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const allCats = res.data.data || [];
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
          setCreateWarning({ open: true, matches });
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

  const rows = category
    .filter((c) => c.isActive)
    .map((cat, index) => ({
      id: cat._id || index,
      _id: cat._id,
      categoryImage: cat.categoryImage,
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
    }));

  const categoryList = [
    {
      id: "categoryImage",
      label: "Image",
      renderCell: (value) =>
        value ? <Avatar src={value} alt="Category" /> : "-",
    },
    { id: "category", label: "Category" },
    { id: "categoryType", label: "Type" },
    { id: "subCategoryType", label: "Sub Type" },
    { id: "title", label: "Title" },
    { id: "keywords", label: "Keywords" },
    { id: "description", label: "Description" },
    { id: "seoTitle", label: "SEO Title" },
    { id: "seoDescription", label: "SEO Description" },
    { id: "slug", label: "Slug" },
    {
      id: "action",
      label: "Action",
      renderCell: (_, row) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <IconButton color="primary" size="small" onClick={() => handleEdit(row)}>
            <EditRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton color="error" size="small" onClick={() => handleDelete(row)}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="category-page-container">
      {/* Category Form */}
      <div className="category-form-section">
        <h2 className="category-card-title">
          {editMode ? "Edit Category" : "Add New Category"}
        </h2>
        <form onSubmit={handleSubmit} className="category-form-grid">
          <div className="category-form-input-group">
            <label className="category-input-label">Category</label>
            <input
              type="text"
              name="category"
              className={`category-text-input ${errors.category ? "category-error" : ""}`}
              value={formData.category}
              onChange={handleChange}
            />
            {errors.category && (
              <p className="category-error-text">{errors.category}</p>
            )}
          </div>

          <div className="category-form-input-group">
            <label className="category-input-label">Slug (Auto)</label>
            <input
              type="text"
              name="slug"
              className="category-text-input"
              value={formData.slug}
              readOnly
            />
          </div>

          <div className="category-form-input-group"> 
            <label className="category-input-label">Category Type</label>
            <select
              name="categoryType"
              className={`category-select-input ${errors.categoryType ? "category-error" : ""}`}
              value={formData.categoryType}
              onChange={handleChange}
            >
              <option value="">-- Select Type --</option>
              <option value="Primary Category">Primary Category</option>
              <option value="Sub Category">Sub Category</option>
            </select>
            {errors.categoryType && (
              <p className="category-error-text">{errors.categoryType}</p>
            )}
          </div>

          {formData.categoryType === "Sub Category" && (
            <div className="category-form-input-group"> 
              <label className="category-input-label">Sub Category Type</label>
              <select
                name="subCategoryType"
                className={`category-select-input ${errors.subCategoryType ? "category-error" : ""
                  }`}
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
              {errors.subCategoryType && (
                <p className="category-error-text">{errors.subCategoryType}</p>
              )}
            </div>
          )}

          <div className="category-form-input-group">
            <label className="category-input-label">Title</label>
            <input
              type="text"
              name="title"
              className={`category-text-input ${errors.title ? "category-error" : ""}`}
              value={formData.title}
              onChange={handleChange}
            />
            {errors.title && <p className="category-error-text">{errors.title}</p>}
          </div>

          <div className="category-form-input-group">
            <label className="category-input-label">Keywords</label>
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={formData.keywords}
              onChange={handleKeywordChange}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    key={index}
                    label={option}
                    {...getTagProps({ index })}
                    onDelete={() => handleKeywordDelete(option)}
                    sx={{
                      backgroundColor: "#ff8c00",
                      color: "white",
                      fontWeight: 500,
                      "& .MuiChip-deleteIcon": { color: "white" },
                    }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  placeholder="Add keywords"
                  value={inputKeyword}
                  onChange={(e) => setInputKeyword(e.target.value)}
                  error={!!errors.keywords}
                  helperText={errors.keywords}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleAddKeyword}
                          color="primary"
                          sx={{
                            color: "var(--color-primary-orange)",
                            "&:hover": { color: "var(--color-primary-hover)" },
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
          </div>
          <div className="category-form-input-group">
            <label className="category-input-label">SEO Description</label>
            <input
              type="text"
              name="seoDescription"
              className="category-text-input"
              value={formData.seoDescription}
              onChange={handleChange}
            />
          </div>
          <div className="category-form-input-group category-col-span-2">
            <label className="category-input-label">Description</label>
            <textarea
              name="description"
              className={`category-text-input category-text-area ${errors.description ? "category-error" : ""
                }`}
              value={formData.description}
              onChange={handleChange}
              rows="3"
            />
            {errors.description && (
              <p className="category-error-text">{errors.description}</p>
            )}
          </div>

          <div className="category-form-input-group">
            <label className="category-input-label">SEO Title</label>
            <input
              type="text"
              name="seoTitle"
              className="category-text-input"
              value={formData.seoTitle}
              onChange={handleChange}
            />
          </div>

          <div className="category-form-input-group category-col-span-all category-upload-section">
            <div className="category-upload-content">
              <Button
                variant="contained"
                startIcon={<CloudUploadIcon />}
                component="label"
                className="category-upload-button"
              >
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
              </Button>
              {preview && (
                <Avatar
                  src={preview}
                  sx={{ width: 56, height: 56 }}
                  className="category-preview-avatar"
                />
              )}
              <div>
                <button
                  type="submit"
                  className="category-submit-button"
                  disabled={loading}
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
            </div>
          </div>
        </form>

        {error && (
          <p className="category-error-text" style={{ marginTop: "16px" }}>
            {" "}
            {(() => {
              if (typeof error === "string") return error;
              if (error instanceof Error) return error.message;
              if (typeof error === "object") return JSON.stringify(error, null, 2);
              return String(error);
            })()}
          </p>
        )}
      </div>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, mb: 1 }}>
        <Typography variant="h6">Category Table</Typography>
        <Button
          variant="outlined"
          color="warning"
          size="small"
          startIcon={dupLoading ? <CircularProgress size={16} /> : <ContentCopyRoundedIcon />}
          onClick={findDuplicates}
          disabled={dupLoading}
        >
          Find Duplicates
        </Button>
      </Box>
      <Box sx={{ width: "100%" }}>
        <CustomizedTable data={rows}
          columns={categoryList}
          total={total}
          fetchData={(pageNo, pageSize, options) =>
            dispatch(getAllCategory({ pageNo, pageSize, options }))
          }
        />
      </Box>

      {/* Duplicates Dialog */}
      <Dialog
        open={dupDialog.open}
        onClose={() => setDupDialog({ open: false, groups: [] })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
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
              const allSelected = groupIds.every((id) => selectedDups.includes(id));
              return (
                <Box key={gi} sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Checkbox
                      size="small"
                      checked={allSelected}
                      indeterminate={groupIds.some((id) => selectedDups.includes(id)) && !allSelected}
                      onChange={() => toggleSelectGroup(group)}
                    />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "capitalize" }}>
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
                        bgcolor: selectedDups.includes(cat._id) ? "rgba(211,47,47,0.07)" : "transparent",
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={selectedDups.includes(cat._id)}
                        onChange={() => toggleDupSelect(cat._id)}
                      />
                      {cat.categoryImage ? (
                        <Avatar src={cat.categoryImage} sx={{ width: 32, height: 32 }} />
                      ) : (
                        <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                          {(cat.category || "?")[0].toUpperCase()}
                        </Avatar>
                      )}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {cat.category}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {cat.categoryType}{cat.subCategoryType ? ` › ${cat.subCategoryType}` : ""} &nbsp;|&nbsp; slug: {cat.slug || "—"} &nbsp;|&nbsp; id: {cat._id}
                        </Typography>
                        {(() => {
                          const count = businessUsage[(cat.category || "").toLowerCase()];
                          return count > 0 ? (
                            <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 600 }}>
                              ⚠ {count} business{count !== 1 ? "es" : ""} using this category
                            </Typography>
                          ) : (
                            <Typography variant="caption" sx={{ color: "success.main" }}>
                              No businesses linked
                            </Typography>
                          );
                        })()}
                      </Box>
                    </Box>
                  ))}
                  {gi < dupDialog.groups.length - 1 && <Divider sx={{ mt: 1.5 }} />}
                </Box>
              );
            })
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {selectedDups.length} selected
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={() => setDupDialog({ open: false, groups: [] })}>Close</Button>
            <Button
              color="warning"
              variant="outlined"
              disabled={selectedDups.length === 0 || !!dupDeleting}
              onClick={() => deleteSelectedDups(false)}
              startIcon={dupDeleting === "soft" ? <CircularProgress size={16} color="inherit" /> : null}
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
        onClose={() => setDeleteConfirm({ open: false, id: null })}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this category?
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteConfirm({ open: false, id: null })}
            color="secondary"
          >
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create duplicate warning dialog */}
      <Dialog
        open={createWarning.open}
        onClose={() => setCreateWarning({ open: false, matches: [] })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: "warning.main" }}>
          ⚠ Similar Categories Already Exist
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            The category <strong>"{formData.category}"</strong> is similar to {createWarning.matches.length} existing {createWarning.matches.length === 1 ? "category" : "categories"}:
          </Typography>
          {createWarning.matches.map((cat) => {
            const count = businessUsage[(cat.category || "").toLowerCase()];
            return (
              <Box
                key={cat._id}
                sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}
              >
                {cat.categoryImage ? (
                  <Avatar src={cat.categoryImage} sx={{ width: 32, height: 32 }} />
                ) : (
                  <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                    {(cat.category || "?")[0].toUpperCase()}
                  </Avatar>
                )}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{cat.category}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cat.categoryType}{cat.subCategoryType ? ` › ${cat.subCategoryType}` : ""} &nbsp;|&nbsp; slug: {cat.slug || "—"}
                  </Typography>
                  <br />
                  {count > 0 ? (
                    <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 600 }}>
                      ⚠ {count} business{count !== 1 ? "es" : ""} using this category
                    </Typography>
                  ) : (
                    <Typography variant="caption" sx={{ color: "success.main" }}>No businesses linked</Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3 }}>
          <Button onClick={() => setCreateWarning({ open: false, matches: [] })}>
            Cancel
          </Button>
          <Button
            color="warning"
            variant="contained"
            onClick={() => {
              setCreateWarning({ open: false, matches: [] });
              doSave();
            }}
          >
            Allow — Create Anyway
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}