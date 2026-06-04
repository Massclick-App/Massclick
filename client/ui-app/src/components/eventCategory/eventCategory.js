import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  getAllEventCategory,
  createEventCategory,
  updateEventCategory,
  deleteEventCategory,
} from "../../redux/actions/eventAction";

import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  Typography,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  InputAdornment,
  TextField,
} from "@mui/material";

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

import CustomizedTable from "../../components/Table/CustomizedTable";
import { createScopedClassNames } from "../../utils/createScopedClassNames";

import styles from "./eventCategory.module.css";

const cx = createScopedClassNames(styles);

const initialFormData = {
  categoryName: "",
  description: "",
  categoryImage: "",
  slug: "",
  keywords: [],
  seoTitle: "",
  seoDescription: "",
  isActive: true,
  sortOrder: 0,
};

const toKeywordList = (keywords) => {
  if (Array.isArray(keywords)) return keywords;
  if (!keywords) return [];
  return keywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
};

const parseKeywords = (keywords) =>
  (Array.isArray(keywords) ? keywords : keywords.split(","))
    .map((keyword) => keyword.trim())
    .filter(Boolean);

export default function EventCategory() {
  const dispatch = useDispatch();

  const {
    data = [],
    total = 0,
    loading,
    error,
  } = useSelector((state) => state.event.eventCategory);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [inputKeyword, setInputKeyword] = useState("");
  const [errors, setErrors] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    dispatch(getAllEventCategory());
  }, [dispatch]);

  const validateForm = () => {
    const newErrors = {};
    const keywords = parseKeywords(formData.keywords);
    const sortOrder = Number(formData.sortOrder);

    if (!formData.categoryName.trim()) {
      newErrors.categoryName = "Category name is required";
    }

    if (formData.categoryName.trim().length > 120) {
      newErrors.categoryName = "Category name cannot exceed 120 characters";
    }

    if (formData.description.trim().length > 1000) {
      newErrors.description = "Description cannot exceed 1000 characters";
    }

    if (formData.seoTitle.trim().length > 180) {
      newErrors.seoTitle = "SEO title cannot exceed 180 characters";
    }

    if (formData.seoDescription.trim().length > 320) {
      newErrors.seoDescription = "SEO description cannot exceed 320 characters";
    }

    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      newErrors.sortOrder = "Sort order must be zero or a positive number";
    }

    if (keywords.some((keyword) => !keyword.trim())) {
      newErrors.keywords = "Each keyword must be a non-empty string";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = () => ({
    categoryName: formData.categoryName.trim(),
    description: formData.description.trim(),
    categoryImage: formData.categoryImage.trim(),
    keywords: parseKeywords(formData.keywords),
    seoTitle: formData.seoTitle.trim(),
    seoDescription: formData.seoDescription.trim(),
    isActive: formData.isActive,
    sortOrder: Number(formData.sortOrder) || 0,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleImageUpload = (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: reader.result || "",
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAddKeyword = () => {
    const keyword = inputKeyword.trim();
    if (!keyword) return;

    setFormData((prev) => ({
      ...prev,
      keywords: Array.from(
        new Set([
          ...(Array.isArray(prev.keywords) ? prev.keywords : []),
          keyword,
        ])
      ),
    }));
    setInputKeyword("");
    setErrors((prev) => ({
      ...prev,
      keywords: "",
    }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setInputKeyword("");
    setEditId(null);
    setIsEditMode(false);
    setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const payload = buildPayload();
    const action = isEditMode
      ? updateEventCategory(editId, payload)
      : createEventCategory(payload);

    dispatch(action)
      .then(() => {
        setSuccessMessage(
          isEditMode
            ? "Event category updated successfully"
            : "Event category created successfully"
        );
        dispatch(getAllEventCategory());
        resetForm();
      })
      .catch(console.error);

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  const handleEdit = (row) => {
    setFormData({
      categoryName: row.categoryName || "",
      description: row.description || "",
      categoryImage: row.categoryImage || "",
      slug: row.slug || "",
      keywords: toKeywordList(row.rawKeywords),
      seoTitle: row.seoTitle || "",
      seoDescription: row.seoDescription || "",
      isActive: row.isActive,
      sortOrder: row.sortOrder ?? 0,
    });

    setEditId(row.id);
    setIsEditMode(true);
    setErrors({});
  };

  const handleDeleteClick = (row) => {
    setSelectedCategory(row);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedCategory?.id) return;

    dispatch(deleteEventCategory(selectedCategory.id))
      .then(() => {
        dispatch(getAllEventCategory());
        setDeleteDialogOpen(false);
        setSelectedCategory(null);
        setSuccessMessage("Event category deleted successfully");
      })
      .catch(console.error);
  };

  const rows = data.map((item) => ({
    _id: item._id,
    id: item._id,
    categoryName: item.categoryName || "",
    description: item.description || "",
    categoryImage: item.categoryImage || "",
    slug: item.slug || "",
    rawKeywords: Array.isArray(item.keywords) ? item.keywords : [],
    keywords:
      Array.isArray(item.keywords) && item.keywords.length
        ? item.keywords.join(", ")
        : "-",
    seoTitle: item.seoTitle || "-",
    seoDescription: item.seoDescription || "",
    isActive: item.isActive !== false,
    status: item.isActive !== false ? "Active" : "Inactive",
    sortOrder: item.sortOrder ?? 0,
  }));

  const columns = [
    {
      id: "categoryImage",
      label: "Image",
      renderCell: (value, row) =>
        value ? (
          <img
            className={cx("event-category-thumb")}
            src={value}
            alt={row.categoryName}
          />
        ) : (
          "-"
        ),
    },
    {
      id: "categoryName",
      label: "Category Name",
    },
    {
      id: "slug",
      label: "Slug",
    },
    {
      id: "keywords",
      label: "Keywords",
    },
    {
      id: "seoTitle",
      label: "SEO Title",
    },
    {
      id: "sortOrder",
      label: "Sort Order",
    },
    {
      id: "status",
      label: "Status",
      renderCell: (value, row) => (
        <span
          className={cx(`event-category-status ${
            row.isActive
              ? "event-category-status--active"
              : "event-category-status--inactive"
          }`)}
        >
          {value}
        </span>
      ),
    },
    {
      id: "action",
      label: "Action",
      renderCell: (_, row) => (
        <div className={cx("event-category-actions")}>
          <IconButton
            color="primary"
            onClick={() => handleEdit(row)}
            aria-label="Edit event category"
          >
            <EditRoundedIcon />
          </IconButton>

          <IconButton
            color="error"
            onClick={() => handleDeleteClick(row)}
            aria-label="Delete event category"
          >
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className={cx("event-category-page")}>
      <div className={cx("event-category-card")}>
        <h2>
          {isEditMode
            ? "Edit Event Category"
            : "Create Event Category"}
        </h2>

        {successMessage && (
          <Alert severity="success">
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className={cx("event-category-grid")}>
            <div>
              <label>Category Name *</label>

              <input
                type="text"
                name="categoryName"
                value={formData.categoryName}
                onChange={handleChange}
              />

              {errors.categoryName && (
                <p className={cx("eventCategory-error-text")}>
                  {errors.categoryName}
                </p>
              )}
            </div>

            <div>
              <label>Slug</label>

              <input
                type="text"
                name="slug"
                value={formData.slug}
                readOnly
                placeholder="Auto generated from category name"
              />
            </div>

            <div className={cx("eventCategory-upload-field")}>
              <label>Category Image</label>

              <div className={cx("eventCategory-upload-content")}>
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  component="label"
                  className={cx("eventCategory-upload-button")}
                >
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => handleImageUpload(e, "categoryImage")}
                  />
                </Button>

                {formData.categoryImage && (
                  <Avatar
                    src={formData.categoryImage}
                    variant="rounded"
                    sx={{ width: 56, height: 56 }}
                    className={cx("eventCategory-preview-avatar")}
                  />
                )}
              </div>
            </div>

            <div>
              <label>Sort Order</label>

              <input
                type="number"
                name="sortOrder"
                min="0"
                value={formData.sortOrder}
                onChange={handleChange}
              />

              {errors.sortOrder && (
                <p className={cx("eventCategory-error-text")}>
                  {errors.sortOrder}
                </p>
              )}
            </div>

            <div className={cx("event-category-field--full")}>
              <label>Description</label>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
              />

              {errors.description && (
                <p className={cx("eventCategory-error-text")}>
                  {errors.description}
                </p>
              )}
            </div>

            <div className={cx("event-category-field--full eventCategory-keywords-field")}>
              <label>Keywords</label>

              <Autocomplete
                multiple
                freeSolo
                options={[]}
                inputValue={inputKeyword}
                value={Array.isArray(formData.keywords) ? formData.keywords : []}
                onInputChange={(event, newInputValue) => {
                  setInputKeyword(newInputValue);
                }}
                onChange={(event, newValue) => {
                  setFormData((prev) => ({
                    ...prev,
                    keywords: newValue,
                  }));
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      key={option}
                      label={option}
                      {...getTagProps({ index })}
                      sx={{
                        backgroundColor: "#ff8c00",
                        color: "#fff",
                        fontWeight: 500,
                        "& .MuiChip-deleteIcon": { color: "#fff" },
                      }}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    placeholder="Add keywords"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          <InputAdornment position="end">
                            <IconButton
                              onClick={handleAddKeyword}
                              aria-label="Add keyword"
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
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />

              {errors.keywords && (
                <p className={cx("eventCategory-error-text")}>
                  {errors.keywords}
                </p>
              )}
            </div>

            <div>
              <label>SEO Title</label>

              <input
                type="text"
                name="seoTitle"
                value={formData.seoTitle}
                onChange={handleChange}
              />

              {errors.seoTitle && (
                <p className={cx("eventCategory-error-text")}>
                  {errors.seoTitle}
                </p>
              )}
            </div>

            <div>
              <label>SEO Description</label>

              <textarea
                name="seoDescription"
                value={formData.seoDescription}
                onChange={handleChange}
                rows="3"
              />

              {errors.seoDescription && (
                <p className={cx("eventCategory-error-text")}>
                  {errors.seoDescription}
                </p>
              )}
            </div>

            <div className={cx("event-category-toggle")}>
              <label htmlFor="isActive">
                Active Category
              </label>

              <input
                id="isActive"
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={cx("eventCategory-button-group")}>
            <button
              type="submit"
              className={cx("eventCategory-save-btn")}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress
                  size={20}
                  color="inherit"
                />
              ) : isEditMode ? (
                "Update Category"
              ) : (
                "Create Category"
              )}
            </button>

            {isEditMode && (
              <button
                type="button"
                className={cx("eventCategory-cancel-btn")}
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <Typography
        variant="h6"
        sx={{
          textAlign: "center",
          marginBottom: "20px",
        }}
      >
        Event Category Table
      </Typography>

      <Box>
        <CustomizedTable
          title="Event Categories"
          data={rows}
          columns={columns}
          total={total}
          fetchData={(pageNo, pageSize, options) =>
            dispatch(
              getAllEventCategory({
                pageNo,
                pageSize,
                options,
              })
            )
          }
        />
      </Box>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>
          Confirm Delete
        </DialogTitle>

        <DialogContent>
          Are you sure you want to delete this event category?
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
