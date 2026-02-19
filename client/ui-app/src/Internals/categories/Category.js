import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllCategory,
  createCategory,
  editCategory,
  deleteCategory,
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
} from "@mui/material";

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CustomizedTable from "../../components/Table/CustomizedTable";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const action = editMode
      ? editCategory(formData._id, formData)
      : createCategory(formData);

    dispatch(action)
      .then(() => {
        setFormData({
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
        setPreview(null);
        setEditMode(false);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        dispatch(getAllCategory());
      })
      .catch((err) =>
        console.error(
          editMode ? "Update category failed:" : "Create category failed:",
          err
        )
      );
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
                  {loading ? (
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

      <Typography variant="h6" gutterBottom sx={{ textAlign: "center" }}>
        Category Table
      </Typography>
      <Box sx={{ width: "100%" }}>
        <CustomizedTable data={rows}
          columns={categoryList}
          total={total}
          fetchData={(pageNo, pageSize, options) =>
            dispatch(getAllCategory({ pageNo, pageSize, options }))
          }
        />
      </Box>

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
    </div>
  );
}