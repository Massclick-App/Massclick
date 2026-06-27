import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSeo, editSeo, deleteSeo, getAllSeo } from "../../redux/actions/seoAction.js";
import { getAllLocation, createLocation } from "../../redux/actions/locationAction.js";
import { useSnackbar } from "notistack";
import { Box, Button, Typography, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { fetchSeoCategorySuggestions } from "../../redux/actions/seoAction.js";
import CustomizedTable from "../../components/Table/CustomizedTable.js";
import styles from "./seoData.module.css";
import AdminViewTabs from "../../components/AdminViewTabs.js";
const cx = createScopedClassNames(styles);
export default function SeoData() {
  const dispatch = useDispatch();
  const {
    enqueueSnackbar
  } = useSnackbar();
  const {
    list: seoList = [],
    total = 0,
    loading = false,
    error = null,
    categorySuggestions = []
  } = useSelector(state => state.seoReducer || {});
  const {
    location = []
  } = useSelector(state => state.locationReducer || {});
  const [formData, setFormData] = useState({
    pageType: "",
    location: "",
    title: "",
    description: "",
    keywords: "",
    canonical: "",
    robots: "index, follow"
  });
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [activeView, setActiveView] = useState("list");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showLocationSuggest, setShowLocationSuggest] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  useEffect(() => {
    dispatch(getAllSeo());
    dispatch(getAllLocation({
      pageNo: 1,
      pageSize: 1000
    }));
  }, [dispatch]);
  useEffect(() => {
    if (!categoryInput || categoryInput.length < 1) return;
    const delay = setTimeout(() => {
      dispatch(fetchSeoCategorySuggestions({
        query: categoryInput,
        limit: 10
      }));
    }, 300);
    return () => clearTimeout(delay);
  }, [categoryInput, dispatch]);
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const updateLocationSuggestions = value => {
    const query = value.trim().toLowerCase();
    if (!query) {
      setLocationSuggestions([]);
      setShowLocationSuggest(false);
      return;
    }
    const filtered = location.filter(loc => loc.city?.toLowerCase().includes(query) || loc.district?.toLowerCase().includes(query));
    setLocationSuggestions(filtered);
    setShowLocationSuggest(filtered.length > 0);
  };
  const validateForm = () => {
    const newErrors = {};
    if (!formData.pageType) newErrors.pageType = "Page type required";
    if (!formData.title.trim()) newErrors.title = "Meta title required";
    if (!formData.description.trim()) newErrors.description = "Meta description required";
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
      robots: "index, follow"
    });
    setCategoryInput("");
    setShowLocationSuggest(false);
    setLocationSuggestions([]);
    setEditingId(null);
    setErrors({});
  };
  const handleSubmit = async e => {
    e.preventDefault();
    const locationExists = location.some(loc => loc.city?.toLowerCase() === formData.location?.toLowerCase() || loc.district?.toLowerCase() === formData.location?.toLowerCase());
    const finalData = {
      ...formData,
      category: categoryInput
    };
    if (!validateForm()) return;
    try {
      if (!locationExists && formData.location) {
        await dispatch(createLocation({
          city: formData.location,
          district: formData.location,
          state: "N/A",
          country: "N/A"
        }));
      }
      if (editingId) {
        await dispatch(editSeo(editingId, finalData));
        enqueueSnackbar("SEO updated successfully", {
          variant: "success"
        });
      } else {
        await dispatch(createSeo(finalData));
        enqueueSnackbar("SEO created successfully", {
          variant: "success"
        });
      }
      resetForm();
      setCategoryInput("");
      dispatch(getAllSeo());
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Failed to save SEO data";
      enqueueSnackbar(message, {
        variant: "error"
      });
    }
  };
  const handleEdit = row => {
    setEditingId(row.id);
    setFormData({
      pageType: row.pageType || "",
      category: row.category || "",
      location: row.location || "",
      title: row.title || "",
      description: row.description || "",
      keywords: row.keywords || "",
      canonical: row.canonical || "",
      robots: row.robots || "index, follow"
    });
    setCategoryInput(row.category || "");
    setShowLocationSuggest(false);
    setLocationSuggestions([]);
    setActiveView("form");
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };
  const handleDeleteClick = row => {
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
  const rows = seoList.filter(seo => seo.isActive).map(seo => ({
    id: seo._id,
    pageType: seo.pageType,
    category: seo.category || "",
    location: seo.location || "",
    title: seo.title || "",
    description: seo.description || "",
    keywords: seo.keywords || "",
    canonical: seo.canonical || "",
    robots: seo.robots || "index, follow"
  }));
  const columns = [{
    id: "pageType",
    label: "Page Type"
  }, {
    id: "category",
    label: "Category"
  }, {
    id: "location",
    label: "Location"
  }, {
    id: "title",
    label: "Meta Title"
  }, {
    id: "robots",
    label: "Robots"
  }, {
    id: "action",
    label: "Action",
    renderCell: (_, row) => (
      <Box sx={{ display: "flex", gap: "14px", alignItems: "center" }}>
        <EditOutlined onClick={() => handleEdit(row)} style={{ fontSize: 17, color: "#3b82f6", cursor: "pointer" }} />
        <DeleteOutlined onClick={() => handleDeleteClick(row)} style={{ fontSize: 17, color: "#ef4444", cursor: "pointer" }} />
      </Box>
    )
  }];
  const fields = [{
    label: "Page Type",
    name: "pageType"
  },
  // { label: "Category", name: "category" },
  {
    label: "Meta Title",
    name: "title"
  }, {
    label: "Meta Description",
    name: "description"
  }, {
    label: "Keywords",
    name: "keywords"
  }, {
    label: "Canonical URL",
    name: "canonical"
  }, {
    label: "Robots",
    name: "robots"
  }];
  return <div className={cx("seo-page")}>
      <AdminViewTabs activeView={activeView} onChange={setActiveView} isEditing={Boolean(editingId)} createLabel="SEO Meta" listLabel="SEO Entries" listCount={rows.length} />

      <div className={cx("seo-card")}>
        {activeView === "form" && <>
        <h2 className={cx("seo-card-title")}>
          {editingId ? "Edit SEO Meta" : "Add SEO Meta"}
        </h2>
        <form onSubmit={handleSubmit} className={cx("seo-form-grid")}>
          <div className={cx("seo-form-input-group category-search")}>
            <label className="form-input-label">Category</label>
            <input type="text" value={categoryInput} placeholder="Search category" className="form-text-input" onChange={e => {
            const value = e.target.value;
            setCategoryInput(value);
            setShowSuggestions(true);
            setFormData(prev => ({
              ...prev,
              category: value
            }));
          }} onFocus={() => setShowSuggestions(true)} onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 150);
          }} />
            {showSuggestions && categorySuggestions.length > 0 && <ul className={cx("category-suggestion-list")}>
                {categorySuggestions.map(item => <li key={item._id} className={cx("category-suggestion-item")} onClick={() => {
              setCategoryInput(item.category);
              setFormData(prev => ({
                ...prev,
                category: item.category
              }));
              setShowSuggestions(false);
            }}>
                    {item.category}
                  </li>)}
              </ul>}
          </div>
          <div className={cx("seo-form-input-group category-search")}>
            <label className="form-input-label">Location</label>
            <input type="text" name="location" value={formData.location} placeholder="Search location" className={`form-text-input ${errors.location ? "error" : ""}`} onChange={e => {
            handleChange(e);
            updateLocationSuggestions(e.target.value);
          }} onFocus={() => updateLocationSuggestions(formData.location)} onBlur={() => setTimeout(() => setShowLocationSuggest(false), 150)} />
            {showLocationSuggest && locationSuggestions.length > 0 && <ul className={cx("category-suggestion-list")}>
                {locationSuggestions.map(loc => <li key={loc._id} className={cx("category-suggestion-item")} onClick={() => {
              setFormData(prev => ({
                ...prev,
                location: loc.city || loc.district || ""
              }));
              setShowLocationSuggest(false);
              setLocationSuggestions([]);
            }}>
                    {loc.city}
                    {loc.district && loc.district !== loc.city ? `, ${loc.district}` : ""}
                    {loc.state ? ` - ${loc.state}` : ""}
                  </li>)}
              </ul>}
            {errors.location && <p className="form-error-text">{errors.location}</p>}
          </div>
          {fields.map(({
          label,
          name
        }) => <div key={name} className={cx("seo-form-input-group")}>
              <label className="form-input-label">{label}</label>
              {name === "description" ? <textarea name={name} value={formData[name]} onChange={handleChange} className={`form-textarea ${errors[name] ? "error" : ""}`} /> : <input type="text" name={name} value={formData[name]} onChange={handleChange} className={`form-text-input ${errors[name] ? "error" : ""}`} />}

              {errors[name] && <p className="form-error-text">{errors[name]}</p>}
            </div>)}

          <div className={cx("seo-actions")}>
            <button type="submit" disabled={loading}>
              {loading ? <CircularProgress size={22} /> : editingId ? "Update SEO" : "Create SEO"}
            </button>

            {editingId && <button type="button" onClick={resetForm}>
                Cancel
              </button>}
          </div>
        </form>

        {error && <p className="form-error-text">
            {typeof error === "string" ? error : JSON.stringify(error)}
          </p>}
        </>}

        {activeView === "list" && <>
        <Typography variant="h6" align="center" sx={{
        mt: 0
      }}>
          SEO Metadata Table
        </Typography>

        <Box sx={{
        mt: 2
      }}>
          <CustomizedTable data={rows} columns={columns} total={total} fetchData={(pageNo, pageSize, options) => dispatch(getAllSeo({
          pageNo,
          pageSize,
          options
        }))} />
        </Box>
        </>}

        <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            Are you sure you want to delete this SEO entry?
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDelete}>Cancel</Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>;
}
