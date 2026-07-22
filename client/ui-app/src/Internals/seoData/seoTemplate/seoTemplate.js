import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { viewAllSeoTemplate, createSeoTemplate, updateSeoTemplate, deleteSeoTemplate } from "../../../redux/actions/seoTemplateAction.js";
import { Box, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import CustomizedTable from "../../../components/Table/CustomizedTable.js";
import styles from "./seoTemplate.module.css";
import { fetchSeoCategorySuggestions } from "../../../redux/actions/seoAction.js";
import AdminViewTabs from "../../../components/AdminViewTabs.js";
import {
  checkBlockBalance,
  renderTemplateString,
  PREVIEW_TOKENS_WITH_ZONES,
  PREVIEW_TOKENS_WITHOUT_ZONES,
} from "./templateTokenUtils.js";

const cx = createScopedClassNames(styles);

const TITLE_TARGET = 60;
const DESCRIPTION_TARGET_MIN = 140;
const DESCRIPTION_TARGET_MAX = 160;

const emptyFormData = {
  category: "",
  titleTemplate: "",
  descriptionTemplate: "",
  keywordsTemplate: "",
  headerTemplate: "",
  bodyTemplate: "",
  faqTemplate: [],
};

const truncate = (str = "", n = 60) => (str.length > n ? `${str.slice(0, n)}…` : str);
const formatDate = (value) => (value ? new Date(value).toLocaleString() : "-");

export default function SeoTemplate() {
  const dispatch = useDispatch();
  const seoTemplateState = useSelector(state => state.seoTemplateReducer);
  const {
    categorySuggestions = []
  } = useSelector(state => state.seoReducer || {});
  const {
    list = [],
    total = 0,
    loading = false
  } = seoTemplateState || {};

  const [formData, setFormData] = useState(emptyFormData);
  const [editingId, setEditingId] = useState(null);
  const [activeView, setActiveView] = useState("list");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
    if (!categoryInput || categoryInput.length < 1) return;
    const delay = setTimeout(() => {
      dispatch(fetchSeoCategorySuggestions({
        query: categoryInput,
        limit: 10
      }));
    }, 300);
    return () => clearTimeout(delay);
  }, [categoryInput, dispatch]);

  const validateForm = () => {
    const e = {};
    if (!formData.category.trim()) e.category = "Required";
    if (!formData.titleTemplate.trim()) e.titleTemplate = "Required";
    if (!formData.descriptionTemplate.trim()) e.descriptionTemplate = "Required";
    if (!formData.headerTemplate.trim()) e.headerTemplate = "Required";
    if (!formData.bodyTemplate.trim()) e.bodyTemplate = "Required";

    const hasIncompleteFaq = (formData.faqTemplate || []).some(
      item => !item.question?.trim() || !item.answer?.trim()
    );
    if (hasIncompleteFaq) e.faqTemplate = "Every FAQ needs both a question and an answer.";

    const blockErrors = checkBlockBalance(formData);
    if (blockErrors.length > 0) e.tokenBalance = blockErrors;

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addFaq = () => {
    setFormData(prev => ({
      ...prev,
      faqTemplate: [...(prev.faqTemplate || []), { question: "", answer: "" }]
    }));
  };
  const updateFaq = (index, key, value) => {
    setFormData(prev => {
      const updated = [...(prev.faqTemplate || [])];
      updated[index] = { ...(updated[index] || {}), [key]: value };
      return { ...prev, faqTemplate: updated };
    });
  };
  const removeFaq = index => {
    setFormData(prev => ({
      ...prev,
      faqTemplate: (prev.faqTemplate || []).filter((_, idx) => idx !== index)
    }));
  };

  const resetForm = () => {
    setFormData(emptyFormData);
    setCategoryInput("");
    setEditingId(null);
    setErrors({});
    setSubmitError("");
    setShowPreview(false);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitError("");
    if (!validateForm()) return;

    const action = editingId ? updateSeoTemplate(editingId, formData) : createSeoTemplate(formData);
    try {
      await dispatch(action);
      resetForm();
      dispatch(viewAllSeoTemplate());
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Something went wrong. Please try again.";
      setSubmitError(message);
    }
  };

  const rows = list.map(t => ({
    id: t._id,
    category: t.category,
    titleTemplate: t.titleTemplate,
    descriptionTemplate: t.descriptionTemplate,
    keywordsTemplate: t.keywordsTemplate || "",
    headerTemplate: t.headerTemplate,
    bodyTemplate: t.bodyTemplate,
    faqTemplate: t.faqTemplate || [],
    templateVersion: t.templateVersion,
    updatedAt: t.updatedAt,
  }));

  const columns = [{
    id: "category",
    label: "Category"
  }, {
    id: "titleTemplate",
    label: "Title Template",
    renderCell: value => truncate(value, 60)
  }, {
    id: "templateVersion",
    label: "Version"
  }, {
    id: "updatedAt",
    label: "Updated",
    renderCell: value => formatDate(value)
  }, {
    id: "action",
    label: "Action",
    renderCell: (_, row) => (
      <Box sx={{ display: "flex", gap: "14px", alignItems: "center" }}>
        <EditOutlined onClick={() => {
          setEditingId(row.id);
          setFormData({
            category: row.category || "",
            titleTemplate: row.titleTemplate || "",
            descriptionTemplate: row.descriptionTemplate || "",
            keywordsTemplate: row.keywordsTemplate || "",
            headerTemplate: row.headerTemplate || "",
            bodyTemplate: row.bodyTemplate || "",
            faqTemplate: row.faqTemplate || [],
          });
          setCategoryInput(row.category || "");
          setErrors({});
          setSubmitError("");
          setActiveView("form");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }} style={{ fontSize: 17, color: "#3b82f6", cursor: "pointer" }} />
        <DeleteOutlined onClick={() => { setSelectedRow(row); setDeleteDialogOpen(true); }} style={{ fontSize: 17, color: "#ef4444", cursor: "pointer" }} />
      </Box>
    )
  }];

  return <div className={cx("seo-shell")}>
            <div className={cx("seo-container")}>
                <header className={cx("seo-header")}>
                    <h1>{editingId ? "Edit SEO Template" : "Create SEO Template"}</h1>
                    <p>Manage token-based SEO templates rendered per category + location</p>
                </header>

                <AdminViewTabs activeView={activeView} onChange={setActiveView} isEditing={Boolean(editingId)} createLabel="SEO Template" listLabel="Template List" listCount={rows.length} />

                {activeView === "form" && <>
                <form className={cx("seo-form")} onSubmit={handleSubmit}>
                    {submitError && <div className={cx("submit-error-banner")}>{submitError}</div>}

                    {errors.tokenBalance && <div className={cx("token-errors-banner")}>
                        <h4>Fix these token issues before saving:</h4>
                        <ul>
                            {errors.tokenBalance.map((msg, i) => <li key={i}>{msg}</li>)}
                        </ul>
                    </div>}

                    <section className={cx("cheatsheet-card")}>
                        <h4>Token Cheatsheet</h4>
                        <ul>
                            <li><code>{"{location}"}</code> — resolved district name (e.g. "Trichy")</li>
                            <li><code>{"{{#zone1}}...{{/zone1}}"}</code> — kept only when a first zone is available</li>
                            <li><code>{"{{#zone2}}...{{/zone2}}"}</code> — kept only when a second zone is available</li>
                        </ul>
                        <p>Each conditional block must be a complete, self-contained clause — dropping it should never leave a dangling comma or broken grammar behind.</p>
                    </section>

                    <section className={cx("meta-card")}>
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
                            {errors.category && <span className={cx("field-error")}>{errors.category}</span>}

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
                            <label>Title Template</label>
                            <input value={formData.titleTemplate} onChange={e => setFormData(p => ({
              ...p,
              titleTemplate: e.target.value
            }))} placeholder="e.g. {category} in {location} {{#zone1}}near {zone1}{{/zone1}}" />
                            <span className={cx("char-counter", formData.titleTemplate.length > TITLE_TARGET ? "over-limit" : "")}>{formData.titleTemplate.length} / {TITLE_TARGET} target</span>
                            {errors.titleTemplate && <span className={cx("field-error")}>{errors.titleTemplate}</span>}
                        </div>

                        <div className={cx("meta-field")}>
                            <label>Description Template</label>
                            <textarea rows={3} value={formData.descriptionTemplate} onChange={e => setFormData(p => ({
              ...p,
              descriptionTemplate: e.target.value
            }))} placeholder="e.g. Find the best {category} in {location}. {{#zone1}}Serving {zone1} and nearby areas.{{/zone1}}" />
                            <span className={cx("char-counter", (formData.descriptionTemplate.length < DESCRIPTION_TARGET_MIN || formData.descriptionTemplate.length > DESCRIPTION_TARGET_MAX) ? "over-limit" : "")}>{formData.descriptionTemplate.length} / {DESCRIPTION_TARGET_MIN}-{DESCRIPTION_TARGET_MAX} target</span>
                            {errors.descriptionTemplate && <span className={cx("field-error")}>{errors.descriptionTemplate}</span>}
                        </div>

                        <div className={cx("meta-field")}>
                            <label>Keywords Template (optional)</label>
                            <textarea rows={2} value={formData.keywordsTemplate} onChange={e => setFormData(p => ({
              ...p,
              keywordsTemplate: e.target.value
            }))} placeholder="e.g. {category}, {category} in {location}{{#zone1}}, {category} near {zone1}{{/zone1}}" />
                        </div>
                    </section>

                    <section className={cx("editor-card")}>
                        <div className={cx("editor-title")}>
                            <h3>Header Template</h3>
                        </div>
                        <div className={cx("editor-wrapper")}>
                            <ReactQuill value={formData.headerTemplate} onChange={v => setFormData(p => ({
              ...p,
              headerTemplate: v
            }))} modules={modules} formats={formats} />
                        </div>
                        {errors.headerTemplate && <span className={cx("field-error")}>{errors.headerTemplate}</span>}
                    </section>

                    <section className={cx("editor-card")}>
                        <div className={cx("editor-title")}>
                            <h3>Body Template</h3>
                        </div>
                        <div className={cx("editor-wrapper")}>
                            <ReactQuill value={formData.bodyTemplate} onChange={v => setFormData(p => ({
              ...p,
              bodyTemplate: v
            }))} modules={modules} formats={formats} />
                        </div>
                        {errors.bodyTemplate && <span className={cx("field-error")}>{errors.bodyTemplate}</span>}
                    </section>

                    <section className={cx("editor-card")}>
                        <div className={cx("editor-title")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3>FAQ Template (optional)</h3>
                            <button type="button" onClick={addFaq} style={{ fontSize: 13, padding: "4px 12px", cursor: "pointer", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6 }}>
                                + Add FAQ
                            </button>
                        </div>
                        {errors.faqTemplate && <span className={cx("field-error")}>{errors.faqTemplate}</span>}
                        {(formData.faqTemplate || []).map((item, i) => (
                            <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 10, marginTop: 10, position: "relative" }}>
                                <button type="button" onClick={() => removeFaq(i)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>✕</button>
                                <div style={{ marginBottom: 8 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Question</label>
                                    <input
                                        value={item.question}
                                        onChange={e => updateFaq(i, "question", e.target.value)}
                                        placeholder="e.g. Do you offer {category} in {location}?"
                                        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Answer</label>
                                    <textarea
                                        value={item.answer}
                                        onChange={e => updateFaq(i, "answer", e.target.value)}
                                        placeholder="Provide a clear, complete answer..."
                                        rows={3}
                                        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
                                    />
                                </div>
                            </div>
                        ))}
                        {(formData.faqTemplate || []).length === 0 && (
                            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>No FAQs added yet. Click "+ Add FAQ" to add question-answer pairs.</p>
                        )}
                    </section>

                    <button type="button" className={cx("preview-toggle")} onClick={() => setShowPreview(v => !v)}>
                        {showPreview ? "Hide Preview" : "Show Preview"}
                    </button>

                    {showPreview && <section className={cx("preview-card")}>
                        <h3>Live Preview</h3>
                        <div className={cx("preview-columns")}>
                            <div className={cx("preview-col")}>
                                <h4>With zone data (Cantonment / Thillai Nagar)</h4>
                                <div className={cx("preview-title")}>{renderTemplateString(formData.titleTemplate, PREVIEW_TOKENS_WITH_ZONES)}</div>
                                <div className={cx("preview-body")} dangerouslySetInnerHTML={{ __html: renderTemplateString(formData.headerTemplate, PREVIEW_TOKENS_WITH_ZONES) }} />
                                <div className={cx("preview-body")} dangerouslySetInnerHTML={{ __html: renderTemplateString(formData.bodyTemplate, PREVIEW_TOKENS_WITH_ZONES) }} />
                            </div>
                            <div className={cx("preview-col")}>
                                <h4>Without zone data</h4>
                                <div className={cx("preview-title")}>{renderTemplateString(formData.titleTemplate, PREVIEW_TOKENS_WITHOUT_ZONES)}</div>
                                <div className={cx("preview-body")} dangerouslySetInnerHTML={{ __html: renderTemplateString(formData.headerTemplate, PREVIEW_TOKENS_WITHOUT_ZONES) }} />
                                <div className={cx("preview-body")} dangerouslySetInnerHTML={{ __html: renderTemplateString(formData.bodyTemplate, PREVIEW_TOKENS_WITHOUT_ZONES) }} />
                            </div>
                        </div>
                    </section>}

                    <div className={cx("action-bar")}>
                        <button type="submit" disabled={loading}>
                            {loading ? <CircularProgress size={22} /> : editingId ? "Update Template" : "Publish Template"}
                        </button>
                    </div>
                </form>
                </>}

                {activeView === "list" && <>
                <Box sx={{
        mt: 0
      }}>
                    <CustomizedTable title="SEO Templates" data={rows} columns={columns} total={total} loading={loading} fetchData={(pageNo, pageSize, options) => dispatch(viewAllSeoTemplate({
          pageNo,
          pageSize,
          options
        }))} />
                </Box>
                </>}

                <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                    <DialogTitle>Confirm Delete</DialogTitle>
                    <DialogContent>
                        Are you sure you want to deactivate this template?
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button color="error" variant="contained" onClick={() => dispatch(deleteSeoTemplate(selectedRow.id)).then(() => {
            setDeleteDialogOpen(false);
            dispatch(viewAllSeoTemplate());
          })}>
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        </div>;
}
