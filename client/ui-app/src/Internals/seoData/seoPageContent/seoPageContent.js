import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { viewAllSeoPageContent, createSeoPageContent, updateSeoPageContent, deleteSeoPageContent } from "../../../redux/actions/seoPageContentAction.js";
import { getAllLocation, createLocation } from "../../../redux/actions/locationAction.js";
import { Box, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import CustomizedTable from "../../../components/Table/CustomizedTable.js";
import styles from "./seoPageContent.module.css";
import { fetchSeoCategorySuggestions } from "../../../redux/actions/seoAction.js";
import AdminViewTabs from "../../../components/AdminViewTabs.js";
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
    pageContent: "",
    faq: []
  });
  const [editingId, setEditingId] = useState(null);
  const [activeView, setActiveView] = useState("list");
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
  const addFaq = () => {
    setFormData((prev) => ({
      ...prev,
      faq: [...(prev.faq || []), { question: "", answer: "", links: [] }]
    }));
  };
  const updateFaq = (index, key, value) => {
    setFormData((prev) => {
      const updatedFaq = [...(prev.faq || [])];
      updatedFaq[index] = {
        ...(updatedFaq[index] || {}),
        [key]: value
      };
      return {
        ...prev,
        faq: updatedFaq
      };
    });
  };
  const addFaqLink = faqIndex => {
    setFormData(prev => {
      const updatedFaq = [...(prev.faq || [])];
      const currentFaq = {
        question: "",
        answer: "",
        links: [],
        ...(updatedFaq[faqIndex] || {})
      };
      currentFaq.links = [...(currentFaq.links || []), {
        linkText: "",
        url: ""
      }];
      updatedFaq[faqIndex] = currentFaq;
      return {
        ...prev,
        faq: updatedFaq
      };
    });
  };
  const updateFaqLink = (faqIndex, linkIndex, key, value) => {
    setFormData(prev => {
      const updatedFaq = [...(prev.faq || [])];
      const currentFaq = {
        question: "",
        answer: "",
        links: [],
        ...(updatedFaq[faqIndex] || {})
      };
      const updatedLinks = [...(currentFaq.links || [])];
      updatedLinks[linkIndex] = {
        ...(updatedLinks[linkIndex] || {}),
        [key]: value
      };
      currentFaq.links = updatedLinks;
      updatedFaq[faqIndex] = currentFaq;
      return {
        ...prev,
        faq: updatedFaq
      };
    });
  };
  const removeFaqLink = (faqIndex, linkIndex) => {
    setFormData(prev => {
      const updatedFaq = [...(prev.faq || [])];
      const currentFaq = {
        question: "",
        answer: "",
        links: [],
        ...(updatedFaq[faqIndex] || {})
      };
      currentFaq.links = (currentFaq.links || []).filter((_, idx) => idx !== linkIndex);
      updatedFaq[faqIndex] = currentFaq;
      return {
        ...prev,
        faq: updatedFaq
      };
    });
  };
  const removeFaq = index => {
    setFormData(prev => ({
      ...prev,
      faq: (prev.faq || []).filter((_, idx) => idx !== index)
    }));
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
        pageContent: "",
        faq: []
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
    pageContent: seo.pageContent,
    faq: seo.faq || []
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
    renderCell: (_, row) => (
      <Box sx={{ display: "flex", gap: "14px", alignItems: "center" }}>
        <EditOutlined onClick={() => { setEditingId(row.id); setFormData(row); setCategoryInput(row.category || ""); setShowLocationSuggest(false); setLocationSuggestions([]); setActiveView("form"); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ fontSize: 17, color: "#3b82f6", cursor: "pointer" }} />
        <DeleteOutlined onClick={() => { setSelectedRow(row); setDeleteDialogOpen(true); }} style={{ fontSize: 17, color: "#ef4444", cursor: "pointer" }} />
      </Box>
    )
  }];
  return <div className={cx("seo-shell")}>
            <div className={cx("seo-container")}>
                <header className={cx("seo-header")}>
                    <h1>{editingId ? "Edit Page Content" : "Create Page Content"}</h1>
                    <p>Manage structured SEO page content</p>
                </header>

                <AdminViewTabs activeView={activeView} onChange={setActiveView} isEditing={Boolean(editingId)} createLabel="Page Content" listLabel="Content List" listCount={rows.length} />

                {activeView === "form" && <>
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

                        <div className={cx("meta-field category-search")}>
                            <label>Category</label>

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
                            {errors.category && <span>{errors.category}</span>}

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
                                            {loc.city || loc.district}
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

                    <section className={cx("editor-card")}>
                        <div className={cx("editor-title")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3>FAQ (optional)</h3>
                            <button type="button" onClick={addFaq} style={{ fontSize: 13, padding: "4px 12px", cursor: "pointer", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6 }}>
                                + Add FAQ
                            </button>
                        </div>
                        {(formData.faq || []).map((item, i) => (
                            <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 10, position: "relative" }}>
                                <button type="button" onClick={() => removeFaq(i)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>✕</button>
                                <div style={{ marginBottom: 8 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Question</label>
                                    <input
                                        value={item.question}
                                        onChange={e => updateFaq(i, "question", e.target.value)}
                                        placeholder="e.g. What are the best hospitals in Trichy?"
                                        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Answer</label>
                                    <textarea
                                        value={item.answer}
                                        onChange={e => updateFaq(i, "answer", e.target.value)}
                                        placeholder="Provide a clear, complete answer..."
                                        rows={3}
                                        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, resize: "vertical" }}
                                    />
                                </div>
                                <div style={{ marginTop: 14, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, display: "block" }}>Answer Links</label>
                                        <button type="button" onClick={() => addFaqLink(i)} style={{ fontSize: 12, padding: "4px 10px", cursor: "pointer", background: "#0f172a", color: "#fff", border: "none", borderRadius: 6 }}>
                                            + Add Link
                                        </button>
                                    </div>
                                    {(item.links || []).map((link, linkIndex) => (
                                        <div key={linkIndex} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "start" }}>
                                            <input
                                                value={link.linkText}
                                                onChange={e => updateFaqLink(i, linkIndex, "linkText", e.target.value)}
                                                placeholder="Link text (exact match)"
                                                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}
                                            />
                                            <input
                                                value={link.url}
                                                onChange={e => updateFaqLink(i, linkIndex, "url", e.target.value)}
                                                placeholder="URL"
                                                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}
                                            />
                                            <button type="button" onClick={() => removeFaqLink(i, linkIndex)} style={{ width: 34, height: 34, borderRadius: 6, border: "1px solid #fecaca", background: "#fff1f2", color: "#ef4444", cursor: "pointer" }}>
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    {(!item.links || item.links.length === 0) && (
                                        <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                                            No links added yet. Add a link to make matching words in the answer clickable.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {(formData.faq || []).length === 0 && (
                            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>No FAQs added yet. Click "+ Add FAQ" to add question-answer pairs.</p>
                        )}
                    </section>

                    <div className={cx("action-bar")}>
                        <button type="submit" disabled={loading}>
                            {loading ? <CircularProgress size={22} /> : editingId ? "Update Content" : "Publish Content"}
                        </button>
                    </div>
                </form>
                </>}

                {activeView === "list" && <>
                <Box sx={{
        mt: 0
      }}>
                    <CustomizedTable data={rows} columns={columns} total={total} fetchData={(pageNo, pageSize, options) => dispatch(viewAllSeoPageContent({
          pageNo,
          pageSize,
          options
        }))} />
                </Box>
                </>}

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
