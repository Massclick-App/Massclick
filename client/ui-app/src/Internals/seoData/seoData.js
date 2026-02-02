import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import {
  createSeo,
  editSeo,
  deleteSeo,
  getAllSeo,
} from "../../redux/actions/seoAction.js";

import {
  Box,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { fetchSeoCategorySuggestions } from "../../redux/actions/seoAction.js";

import CustomizedTable from "../../components/Table/CustomizedTable.js";
import "./seoData.css";

export default function SeoData() {
  const dispatch = useDispatch();

  const {
    list: seoList = [],
    total = 0,
    loading = false,
    error = null,
    categorySuggestions = [],
  } = useSelector((state) => state.seoReducer || {});

  const [formData, setFormData] = useState({
    pageType: "",
    category: "",
    location: "",
    title: "",
    description: "",
    keywords: "",
    canonical: "",
    robots: "index, follow",
  });

  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);


  useEffect(() => {
    dispatch(getAllSeo());
  }, [dispatch]);

  useEffect(() => {
    if (!categoryInput || categoryInput.length < 1) return;

    const delay = setTimeout(() => {
      dispatch(
        fetchSeoCategorySuggestions({
          query: categoryInput,
          limit: 10,
        })
      );
    }, 300);

    return () => clearTimeout(delay);
  }, [categoryInput, dispatch]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.pageType) newErrors.pageType = "Page type required";
    if (!formData.title.trim()) newErrors.title = "Meta title required";
    if (!formData.description.trim())
      newErrors.description = "Meta description required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      pageType: "",
      category: "",
      location: "",
      title: "",
      description: "",
      keywords: "",
      canonical: "",
      robots: "index, follow",
    });
    setEditingId(null);
    setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingId) {
      dispatch(editSeo(editingId, formData)).then(() => {
        resetForm();
        dispatch(getAllSeo());
      });
    } else {
      dispatch(createSeo(formData)).then(() => {
        resetForm();
        dispatch(getAllSeo());
      });
    }
  };

  const handleEdit = (row) => {
    setEditingId(row.id);

    setFormData({
      pageType: row.pageType || "",
      category: row.category || "",
      location: row.location || "",
      title: row.title || "",
      description: row.description || "",
      keywords: row.keywords || "",
      canonical: row.canonical || "",
      robots: row.robots || "index, follow",
    });
    setCategoryInput(row.category || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (row) => {
    setSelectedRow(row);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedRow?.id) return;

    dispatch(deleteSeo(selectedRow.id)).then(() => {
      dispatch(getAllSeo());
      setDeleteDialogOpen(false);
      setSelectedRow(null);
    });
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedRow(null);
  };


  const rows = seoList
    .filter((seo) => seo.isActive)
    .map((seo) => ({
      id: seo._id,
      pageType: seo.pageType,
      category: seo.category || "",
      location: seo.location || "",
      title: seo.title || "",
      description: seo.description || "",
      keywords: seo.keywords || "",
      canonical: seo.canonical || "",
      robots: seo.robots || "index, follow",
    }));

  const columns = [
    { id: "pageType", label: "Page Type" },
    { id: "category", label: "Category" },
    { id: "location", label: "Location" },
    { id: "title", label: "Meta Title" },
    { id: "robots", label: "Robots" },
    {
      id: "action",
      label: "Action",
      renderCell: (_, row) => (
        <>
          <IconButton color="primary" onClick={() => handleEdit(row)}>
            <EditRoundedIcon />
          </IconButton>
          <IconButton color="error" onClick={() => handleDeleteClick(row)}>
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </>
      ),
    },
  ];

  const fields = [
    { label: "Page Type", name: "pageType" },
    // { label: "Category", name: "category" },
    { label: "Location", name: "location" },
    { label: "Meta Title", name: "title" },
    { label: "Meta Description", name: "description" },
    { label: "Keywords", name: "keywords" },
    { label: "Canonical URL", name: "canonical" },
    { label: "Robots", name: "robots" },
  ];


  return (
    <div className="seo-page">
      <div className="seo-card">
        <h2 className="seo-card-title">
          {editingId ? "Edit SEO Meta" : "Add SEO Meta"}
        </h2>

        <form onSubmit={handleSubmit} className="seo-form-grid">
          <div className="seo-form-input-group category-search">
            <label className="seo-input-label">Category</label>
            <input
              type="text"
              value={categoryInput}
              placeholder="Search category"
              className="seo-text-input"
              onChange={(e) => {
                setCategoryInput(e.target.value);
                setShowSuggestions(true);
                setFormData((prev) => ({
                  ...prev,
                  category: "",
                }));
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 150);
              }}
            />

            {showSuggestions && categorySuggestions.length > 0 && (
              <ul className="category-suggestion-list">
                {categorySuggestions.map((item) => (
                  <li
                    key={item._id}
                    className="category-suggestion-item"
                    onClick={() => {
                      setCategoryInput(item.category);
                      setFormData((prev) => ({
                        ...prev,
                        category: item.category,
                      }));
                      setShowSuggestions(false);
                    }}
                  >
                    {item.category}
                  </li>
                ))}
              </ul>
            )}
          </div>



          {fields.map(({ label, name }) => (
            <div key={name} className="seo-form-input-group">
              <label className="seo-input-label">{label}</label>

              {name === "description" ? (
                <textarea
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  className={`seo-textarea ${errors[name] ? "error" : ""
                    }`}
                />
              ) : (
                <input
                  type="text"
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  className={`seo-text-input ${errors[name] ? "error" : ""
                    }`}
                />
              )}

              {errors[name] && (
                <p className="seo-error-text">{errors[name]}</p>
              )}
            </div>
          ))}

          <div className="seo-actions">
            <button type="submit" disabled={loading}>
              {loading ? (
                <CircularProgress size={22} />
              ) : editingId ? (
                "Update SEO"
              ) : (
                "Create SEO"
              )}
            </button>

            {editingId && (
              <button type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>

        {error && (
          <p className="seo-error-text">
            {typeof error === "string" ? error : JSON.stringify(error)}
          </p>
        )}

        <Typography variant="h6" align="center" sx={{ mt: 4 }}>
          SEO Metadata Table
        </Typography>

        <Box sx={{ mt: 2 }}>
          <CustomizedTable
            data={rows}
            columns={columns}
            total={total}
            fetchData={(pageNo, pageSize, options) =>
              dispatch(getAllSeo({ pageNo, pageSize,options }))
            }
          />
        </Box>

        <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            Are you sure you want to delete this SEO entry?
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDelete}>Cancel</Button>
            <Button
              onClick={confirmDelete}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}
