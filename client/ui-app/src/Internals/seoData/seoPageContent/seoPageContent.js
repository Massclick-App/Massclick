import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { viewAllSeoPageContent, createSeoPageContent, updateSeoPageContent, deleteSeoPageContent } from "../../../redux/actions/seoPageContentAction.js";
import { getAllLocation, createLocation } from "../../../redux/actions/locationAction.js";
import { Box, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import CustomizedTable from "../../../components/Table/CustomizedTable.js";
import styles from "./seoPageContent.module.css";
import { fetchSeoCategorySuggestions } from "../../../redux/actions/seoAction.js";
const cx = createScopedClassNames(styles);
export default function SeoPageContent() {
  const dispatch = useDispatch();
  const seoPageContentState = useSelector(state => state.seoPageContentReducer);
  const {
    categorySuggestions = []
  } = useSelector(state => state.seoReducer || {});
  const {
    location = []
  } = useSelector(state => state.locationReducer || {});
  const {
    list = [],
    total = 0,
    loading = false
  } = seoPageContentState || {};
  const [formData, setFormData] = useState({
    pageType: "",
    category: "",
    location: "",
    headerContent: "",
    pageContent: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showLocationSuggest, setShowLocationSuggest] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const modules = {
    toolbar: [[{
      header: [1, 2, 3, false]
    }], ["bold", "italic", "underline"], [{
      list: "ordered"
    }, {
      list: "bullet"
    }], ["link"], ["clean"]]
  };
  const formats = ["header", "bold", "italic", "underline", "list", "bullet", "link"];
  useEffect(() => {
    dispatch(viewAllSeoPageContent());
    dispatch(getAllLocation({
      pageNo: 1,
      pageSize: 1000
    }));
  }, [dispatch]);
  const validateForm = () => {
    const e = {};
    if (!formData.pageType.trim()) e.pageType = "Required";
    if (!formData.category.trim()) e.category = "Required";
    if (!formData.location.trim()) e.location = "Required";
    if (!formData.headerContent.trim()) e.headerContent = "Required";
    if (!formData.pageContent.trim()) e.pageContent = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
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
  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateForm()) return;
    const locationExists = location.some(loc => loc.city?.toLowerCase() === formData.location?.toLowerCase() || loc.district?.toLowerCase() === formData.location?.toLowerCase());
    if (!locationExists && formData.location) {
      await dispatch(createLocation({
        city: formData.location,
        district: formData.location,
        state: "N/A",
        country: "N/A"
      }));
    }
    const action = editingId ? updateSeoPageContent(editingId, formData) : createSeoPageContent(formData);
    dispatch(action).then(() => {
      setFormData({
        pageType: "",
        category: "",
        location: "",
        headerContent: "",
        pageContent: ""
      });
      setCategoryInput("");
      setEditingId(null);
      setErrors({});
      setShowLocationSuggest(false);
      setLocationSuggestions([]);
      dispatch(viewAllSeoPageContent());
    });
  };
  const rows = list.map(seo => ({
    id: seo._id,
    pageType: seo.pageType,
    category: seo.category,
    location: seo.location,
    headerContent: seo.headerContent,
    pageContent: seo.pageContent
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
    id: "action",
    label: "Action",
    renderCell: (_, row) => <>
                    <IconButton onClick={() => {
        setEditingId(row.id);
        setFormData(row);
        setCategoryInput(row.category || "");
        setShowLocationSuggest(false);
        setLocationSuggestions([]);
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }}>
                        <EditRoundedIcon />
                    </IconButton>

                    <IconButton color="error" onClick={() => {
        setSelectedRow(row);
        setDeleteDialogOpen(true);
      }}>
                        <DeleteOutlineRoundedIcon />
                    </IconButton>
                </>
  }];
  return <div className={cx("seo-shell")}>
            <div className={cx("seo-container")}>
                <header className={cx("seo-header")}>
                    <h1>{editingId ? "Edit Page Content" : "Create Page Content"}</h1>
                    <p>Manage structured SEO page content</p>
                </header>
                <form className={cx("seo-form")} onSubmit={handleSubmit}>
                    <section className={cx("meta-card")}>
                        <div className={cx("meta-field")}>
                            <label>Page Type</label>
                            <input value={formData.pageType} onChange={e => setFormData(p => ({
              ...p,
              pageType: e.target.value
            }))} />
                            {errors.pageType && <span>{errors.pageType}</span>}
                        </div>

                        <div className={cx("field-shell category-search")}>
                            <label className={cx("field-label")}>Category</label>

                            <div className={cx("category-input-wrapper")}>
                                <input type="text" value={categoryInput} placeholder="Search category…" onChange={e => {
                const value = e.target.value;
                setCategoryInput(value);
                setShowSuggestions(true);
                setFormData(p => ({
                  ...p,
                  category: value
                }));
              }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
                                <span className={cx("search-icon")}>⌕</span>
                            </div>

                            {showSuggestions && categorySuggestions.length > 0 && <ul className={cx("category-suggestion-list")}>
                                    {categorySuggestions.map(item => <li key={item._id} onClick={() => {
                setCategoryInput(item.category);
                setFormData(p => ({
                  ...p,
                  category: item.category
                }));
                setShowSuggestions(false);
              }}>
                                            {item.category}
                                        </li>)}
                                </ul>}
                        </div>

                        <div className={cx("meta-field")}>
                            <label>Location</label>
                            <input value={formData.location} onChange={e => {
              const value = e.target.value;
              setFormData(p => ({
                ...p,
                location: value
              }));
              updateLocationSuggestions(value);
            }} onFocus={() => updateLocationSuggestions(formData.location)} onBlur={() => setTimeout(() => setShowLocationSuggest(false), 150)} />
                            {errors.location && <span>{errors.location}</span>}
                            {showLocationSuggest && locationSuggestions.length > 0 && <ul className={cx("category-suggestion-list")}>
                                    {locationSuggestions.map(loc => <li key={loc._id} onClick={() => {
                setFormData(p => ({
                  ...p,
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
                        </div>
                    </section>

                    <section className={cx("editor-card")}>
                        <div className={cx("editor-title")}>
                            <h3>Header Content</h3>
                        </div>
                        <div className={cx("editor-wrapper")}>
                            <ReactQuill value={formData.headerContent} onChange={v => setFormData(p => ({
              ...p,
              headerContent: v
            }))} modules={modules} formats={formats} />
                        </div>
                    </section>

                    <section className={cx("editor-card")}>
                        <div className={cx("editor-title")}>
                            <h3>Page Content</h3>
                        </div>
                        <div className={cx("editor-wrapper")}>
                            <ReactQuill value={formData.pageContent} onChange={v => setFormData(p => ({
              ...p,
              pageContent: v
            }))} modules={modules} formats={formats} />
                        </div>
                    </section>

                    <div className={cx("action-bar")}>
                        <button type="submit" disabled={loading}>
                            {loading ? <CircularProgress size={22} /> : editingId ? "Update Content" : "Publish Content"}
                        </button>
                    </div>
                </form>

                <Box sx={{
        mt: 6
      }}>
                    <CustomizedTable data={rows} columns={columns} total={total} fetchData={(pageNo, pageSize, options) => dispatch(viewAllSeoPageContent({
          pageNo,
          pageSize,
          options
        }))} />
                </Box>

                <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                    <DialogTitle>Confirm Delete</DialogTitle>
                    <DialogContent>
                        Are you sure you want to delete this content?
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button color="error" variant="contained" onClick={() => dispatch(deleteSeoPageContent(selectedRow.id)).then(() => {
            setDeleteDialogOpen(false);
            dispatch(viewAllSeoPageContent());
          })}>
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        </div>;
}
