// FILE: SeoPageContentForm.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill";
import {
  Button,
  Avatar,
  CircularProgress,
  IconButton,
  Chip,
  TextField,
  Tooltip,
} from "@mui/material";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PreviewIcon from "@mui/icons-material/Preview";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import { useDispatch, useSelector } from "react-redux";
import { fetchBusinessSuggestion } from "state/actions/seoPageContentBlogAction.js";
import { getAllLocation } from "state/actions/locationAction.js";
import { fetchSeoCategorySuggestions } from "state/actions/seoAction.js";
import { fetchAllAuthors } from "state/actions/authorMasterAction.js";

import "react-quill/dist/quill.snow.css";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import styles from "features/admin/seo/seoPageContentBlog/seoPageContentBlog.module.css";

const cx = createScopedClassNames(styles);

const DEFAULT_TABLE_ROWS = 3;
const DEFAULT_TABLE_COLS = 3;

const makeTableRow = (cols) => ({
  cells: Array.from({ length: cols }, () => ""),
});

const makeTableBlock = () => ({
  id: Date.now(),
  type: "table",
  caption: "",
  hasHeaderRow: true,
  rows: Array.from({ length: DEFAULT_TABLE_ROWS }, () => makeTableRow(DEFAULT_TABLE_COLS)),
});

const getRowCells = (row) => {
  if (Array.isArray(row)) return row;
  return Array.isArray(row?.cells) ? row.cells : [];
};

const normalizeTableBlock = (block = {}) => {
  const rawRows = Array.isArray(block.rows) && block.rows.length > 0
    ? block.rows
    : [makeTableRow(DEFAULT_TABLE_COLS)];
  const width = rawRows.reduce((max, row) => Math.max(max, getRowCells(row).length), 0) || DEFAULT_TABLE_COLS;

  return {
    id: block.id || block._id || Date.now(),
    type: "table",
    caption: block.caption || "",
    hasHeaderRow: block.hasHeaderRow !== false,
    rows: rawRows.map((row) => {
      const cells = getRowCells(row);
      return {
        cells: [
          ...cells,
          ...Array.from({ length: width - cells.length }, () => ""),
        ],
      };
    }),
  };
};

const getColumnCount = (table) =>
  (table?.rows || []).reduce((max, row) => Math.max(max, getRowCells(row).length), 0);

export default function SeoPageContentForm({
  formData,
  setFormData,
  handleSubmit,
  loading,
  editingId,
  modules,
  formats,
}) {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const { suggestions = [] } = useSelector(
    (state) => state.seoPageContentBlogReducer
  ) || {};
  const { location = [] } = useSelector((state) => state.locationReducer || {});
  const { categorySuggestions: seoCategorySuggestions = [] } = useSelector(
    (state) => state.seoReducer || {}
  ) || {};
  const { list: authors = [] } = useSelector(
    (state) => state.authorMasterReducer || {}
  ) || {};

  const [searchTerm, setSearchTerm] = useState("");
  const [preview, setPreview] = useState([]);
  const [profilePreview, setProfilePreview] = useState("");
  const [ogImagePreview, setOgImagePreview] = useState("");
  const [showLocationSuggest, setShowLocationSuggest] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  const [contentBlocks, setContentBlocks] = useState(
    (formData.contentBlocks || [])
      .filter((block) => block?.type === "table")
      .map(normalizeTableBlock)
  );
  const [previewMode, setPreviewMode] = useState(false);

  const slugPreview = useMemo(() => {
    return (formData.heading || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }, [formData.heading]);

  const updateField = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateLocationSuggestions = (value) => {
    const query = value.trim().toLowerCase();

    if (!query) {
      setLocationSuggestions([]);
      setShowLocationSuggest(false);
      return;
    }

    const filtered = location.filter(
      (loc) =>
        loc.city?.toLowerCase().includes(query) ||
        loc.district?.toLowerCase().includes(query)
    );

    setLocationSuggestions(filtered);
    setShowLocationSuggest(filtered.length > 0);
  };

  /* ======================================
     BUSINESS SEARCH
  ====================================== */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        dispatch(fetchBusinessSuggestion(searchTerm));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, dispatch]);

  useEffect(() => {
    dispatch(getAllLocation({ pageNo: 1, pageSize: 1000 }));
    dispatch(fetchAllAuthors());
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

  /* ======================================
     IMAGE PREVIEW SYNC
  ====================================== */
  useEffect(() => {
    setPreview(formData.pageImages || []);
  }, [formData.pageImages]);

  useEffect(() => {
    setProfilePreview(formData.profileImage || "");
  }, [formData.profileImage]);

  useEffect(() => {
    setOgImagePreview(formData.ogImage || "");
  }, [formData.ogImage]);

  /* ======================================
     PROFILE IMAGE
  ====================================== */
  const handleProfileImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setProfilePreview(previewUrl);

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        profileImage: reader.result,
        pageImages: prev.pageImages || [],
      }));
    };
    reader.readAsDataURL(file);
  };

  /* ======================================
     OG IMAGE
  ====================================== */
  const handleOgImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setOgImagePreview(previewUrl);

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        ogImage: reader.result,
        pageImages: prev.pageImages || [],
      }));
    };
    reader.readAsDataURL(file);
  };

  /* ======================================
     PAGE IMAGES
  ====================================== */
  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const tempPreview = [];
    const base64List = [];
    let done = 0;

    files.forEach((file) => {
      tempPreview.push(URL.createObjectURL(file));

      const reader = new FileReader();
      reader.onloadend = () => {
        base64List.push(reader.result);
        done++;

        if (done === files.length) {
          setPreview((prev) => [...prev, ...tempPreview]);

          setFormData((prev) => ({
            ...prev,
            pageImages: [...(prev.pageImages || []), ...base64List],
          }));
        }
      };

      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setPreview((prev) => prev.filter((_, i) => i !== index));

    setFormData((prev) => ({
      ...prev,
      pageImages: prev.pageImages.filter((_, i) => i !== index),
    }));
  };

  /* ======================================
     TAGS
  ====================================== */
  const addTag = (value) => {
    const val = value.trim();
    if (!val) return;

    const exists = (formData.tags || []).includes(val);
    if (exists) return;

    updateField("tags", [...(formData.tags || []), val]);
  };

  const removeTag = (tag) => {
    updateField(
      "tags",
      (formData.tags || []).filter((x) => x !== tag)
    );
  };

  const addListItem = (key, value) => {
    const val = value.trim();
    if (!val) return;

    const exists = (formData[key] || []).includes(val);
    if (exists) return;

    updateField(key, [...(formData[key] || []), val]);
  };

  const removeListItem = (key, value) => {
    updateField(
      key,
      (formData[key] || []).filter((item) => item !== value)
    );
  };

  /* ======================================
     FAQ
  ====================================== */
  const addFaq = () => {
    updateField("faq", [
      ...(formData.faq || []),
      { question: "", answer: "", links: [] },
    ]);
  };

  const updateFaq = (index, key, value) => {
    const updated = [...(formData.faq || [])];
    updated[index][key] = value;
    updateField("faq", updated);
  };

  const addFaqLink = (faqIndex) => {
    const updated = [...(formData.faq || [])];
    if (!updated[faqIndex].links) {
      updated[faqIndex].links = [];
    }
    updated[faqIndex].links.push({ linkText: "", url: "" });
    updateField("faq", updated);
  };

  const updateFaqLink = (faqIndex, linkIndex, key, value) => {
    const updated = [...(formData.faq || [])];
    updated[faqIndex].links[linkIndex][key] = value;
    updateField("faq", updated);
  };

  const removeFaqLink = (faqIndex, linkIndex) => {
    const updated = [...(formData.faq || [])];
    updated[faqIndex].links.splice(linkIndex, 1);
    updateField("faq", updated);
  };

  const removeFaq = (index) => {
    updateField(
      "faq",
      formData.faq.filter((_, i) => i !== index)
    );
  };

  useEffect(() => {
    const normalizedTables = (formData.contentBlocks || [])
      .filter((block) => block?.type === "table")
      .map(normalizeTableBlock);

    setContentBlocks(normalizedTables);

    if (JSON.stringify(formData.contentBlocks || []) !== JSON.stringify(normalizedTables)) {
      updateField("contentBlocks", normalizedTables);
    }
  }, [editingId, formData.contentBlocks]);

  // Sync category input when editing or form data changes
  useEffect(() => {
    setCategoryInput(formData.category || "");
  }, [editingId, formData.category]);

  const updateContentBlocks = (updated) => {
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
  };

  const updateTableBlock = (blockId, updater) => {
    updateContentBlocks(
      contentBlocks.map((block) =>
        block.id === blockId ? updater(normalizeTableBlock(block)) : block
      )
    );
  };

  const addTable = () => {
    updateContentBlocks([...contentBlocks, makeTableBlock()]);
  };

  const removeContentBlock = (blockId) => {
    updateContentBlocks(contentBlocks.filter((block) => block.id !== blockId));
  };

  const updateTableCell = (blockId, rowIndex, colIndex, value) => {
    updateTableBlock(blockId, (table) => ({
      ...table,
      rows: table.rows.map((row, currentRowIndex) => (
        currentRowIndex === rowIndex
          ? {
              ...row,
              cells: row.cells.map((cell, currentColIndex) =>
                currentColIndex === colIndex ? value : cell
              ),
            }
          : row
      )),
    }));
  };

  const addTableRow = (blockId) => {
    updateTableBlock(blockId, (table) => ({
      ...table,
      rows: [...table.rows, makeTableRow(getColumnCount(table) || DEFAULT_TABLE_COLS)],
    }));
  };

  const removeTableRow = (blockId, rowIndex) => {
    updateTableBlock(blockId, (table) => ({
      ...table,
      rows: table.rows.filter((_, index) => index !== rowIndex),
    }));
  };

  const addTableColumn = (blockId) => {
    updateTableBlock(blockId, (table) => ({
      ...table,
      rows: table.rows.map((row) => ({
        ...row,
        cells: [...row.cells, ""],
      })),
    }));
  };

  const removeTableColumn = (blockId, colIndex) => {
    updateTableBlock(blockId, (table) => ({
      ...table,
      rows: table.rows.map((row) => ({
        ...row,
        cells: row.cells.filter((_, index) => index !== colIndex),
      })),
    }));
  };

  /* ======================================
     FIELDS
  ====================================== */
  const fields = [
    { label: "Meta Title", key: "metaTitle", limit: 60 },
    { label: "Meta Description", key: "metaDescription", limit: 160 },
    { label: "Meta Keywords", key: "metaKeywords" },
    { label: "Page Type", key: "pageType" },
    { label: "Category", key: "category" },
    { label: "Location", key: "location" },
    { label: "Heading", key: "heading" },
    { label: "Excerpt", key: "excerpt" },
    { label: "Quick Summary (2-3 sentences, AI-citable answer)", key: "quickSummary", multiline: true },
    { label: "Author", key: "authorId", type: "select" },
    { label: "Experience", key: "experience" },
    { label: "Expert Category", key: "expertCategory" },
    { label: "Email", key: "email", type: "email" },
    { label: "Website", key: "website" },
    { label: "LinkedIn", key: "linkedin" },
  ];

  return (
    <form className={cx("seo-form")} onSubmit={handleSubmit}>
      {/* ======================================
          META CARD
      ====================================== */}
      <section className={cx("meta-card", "premium-card")}>
        <h2 className={cx("section-title", "full-row")}>
          SEO Settings
        </h2>

        {fields.map((field) => (
          <div className={cx("floating-field")} key={field.key}>
            {field.key === "category" ? (
              <>
                <input
                  value={categoryInput}
                  placeholder=" "
                  className={cx("seo-text-input")}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCategoryInput(value);
                    setShowCategorySuggestions(true);
                    updateField(field.key, value);
                  }}
                  onFocus={() => setShowCategorySuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowCategorySuggestions(false), 150);
                  }}
                  required
                />
                <label>{field.label}</label>
                {showCategorySuggestions && seoCategorySuggestions.length > 0 && (
                  <ul className={cx("category-suggestion-list")}>
                    {seoCategorySuggestions.map((item) => (
                      <li
                        key={item._id}
                        className={cx("category-suggestion-item")}
                        onClick={() => {
                          setCategoryInput(item.category);
                          updateField("category", item.category);
                          setShowCategorySuggestions(false);
                        }}
                      >
                        {item.category}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : field.key === "location" ? (
              <>
                <input
                  value={formData[field.key] || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateField(field.key, value);
                    updateLocationSuggestions(value);
                  }}
                  onFocus={() => updateLocationSuggestions(formData[field.key] || "")}
                  onBlur={() => {
                    updateField(field.key, (formData[field.key] || "").trim());
                    setTimeout(() => setShowLocationSuggest(false), 150);
                  }}
                  placeholder=" "
                />

                <label>{field.label}</label>

                {showLocationSuggest && locationSuggestions.length > 0 && (
                  <ul className={cx("category-suggestion-list")}>
                    {locationSuggestions.map((loc) => (
                      <li
                        key={loc._id}
                        onClick={() => {
                          updateField("location", loc.city || loc.district || "");
                          setShowLocationSuggest(false);
                          setLocationSuggestions([]);
                        }}
                      >
                        {loc.city}
                        {loc.district && loc.district !== loc.city ? `, ${loc.district}` : ""}
                        {loc.state ? ` - ${loc.state}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : field.type === "select" ? (
              <>
                <select
                  value={formData[field.key] || ""}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className={cx("seo-text-input")}
                >
                  <option value="">Select {field.label}</option>
                  {authors.map((author) => (
                    <option key={author._id} value={author._id}>
                      {author.displayName}
                    </option>
                  ))}
                </select>
                <label>{field.label}</label>
              </>
            ) : field.multiline ? (
              <>
                <textarea
                  value={formData[field.key] || ""}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder=" "
                  rows={3}
                  style={{ resize: "vertical", width: "100%", padding: "12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}
                />
                <label>{field.label}</label>
              </>
            ) : (
              <>
                <input
                  type={field.type || "text"}
                  value={formData[field.key] || ""}
                  onChange={(e) =>
                    updateField(field.key, e.target.value)
                  }
                  placeholder=" "
                  required={
                    ["metaTitle", "metaDescription", "pageType", "heading"].includes(
                      field.key
                    )
                  }
                />

                <label>{field.label}</label>

                {field.limit && (
                  <span className={cx("char-count")}>
                    {(formData[field.key] || "").length}/{field.limit}
                  </span>
                )}
              </>
            )}
          </div>
        ))}

        <div className={cx("slug-preview", "full-row")}>
          <strong>Slug:</strong> {slugPreview || "-"}
        </div>

        <div className={cx("full-row")}>
          <div className={cx("tags-box")}>
            <input
              placeholder="Add Best For item and press Enter"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addListItem("bestFor", e.target.value);
                  e.target.value = "";
                }
              }}
            />

            <div className={cx("selected-tags")}>
              {(formData.bestFor || []).map((item) => (
                <Chip
                  key={item}
                  label={item}
                  onDelete={() => removeListItem("bestFor", item)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={cx("full-row")}>
          <div className={cx("tags-box")}>
            <input
              placeholder="Add Feature item and press Enter"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addListItem("features", e.target.value);
                  e.target.value = "";
                }
              }}
            />

            <div className={cx("selected-tags")}>
              {(formData.features || []).map((item) => (
                <Chip
                  key={item}
                  label={item}
                  onDelete={() => removeListItem("features", item)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={cx("floating-field", "full-row")}>
          <div className={cx("category-input-wrapper")}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder=" "
            />
            <label>Popular Business</label>

            {(formData.popularBusiness || []).length > 0 && (
              <div className={cx("selected-tags")}>
                {formData.popularBusiness.map((item, i) => (
                  <span className={cx("tag")} key={i}>
                    {item.businessName}
                    <span
                      className={cx("remove")}
                      onClick={() => {
                        const updated = formData.popularBusiness.filter(
                          (_, index) => index !== i
                        );

                        updateField("popularBusiness", updated);
                      }}
                    >
                      x
                    </span>
                  </span>
                ))}
              </div>
            )}

            {searchTerm && suggestions.length > 0 && (
              <ul className={cx("category-suggestion-list")}>
                {suggestions.map((b, i) => (
                  <li
                    key={i}
                    onClick={() => {
                      const exists = (formData.popularBusiness || []).some(
                        (x) => x.businessName === b.businessName
                      );

                      if (!exists) {
                        updateField("popularBusiness", [
                          ...(formData.popularBusiness || []),
                          b,
                        ]);
                      }

                      setSearchTerm("");
                    }}
                  >
                    {b.businessName}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={cx("full-row")}>
          <div className={cx("tags-box")}>
            <input
              placeholder="Add tag and press Enter"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(e.target.value);
                  e.target.value = "";
                }
              }}
            />

            <div className={cx("selected-tags")}>
              {(formData.tags || []).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => removeTag(tag)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={cx("upload-row")}>
          <div className={cx("upload-box")}>
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUploadIcon />}
              className={cx("upload-btn", "primary")}
            >
              Upload Images
              <input
                hidden
                multiple
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImages}
              />
            </Button>

            <div className={cx("preview-row")}>
              {preview.map((img, i) => (
                <div className={cx("preview-item")} key={i}>
                  <Avatar src={img} />
                  <span onClick={() => removeImage(i)}>
                    x
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={cx("upload-box")}>
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUploadIcon />}
              className={cx("upload-btn", "secondary")}
            >
              Upload Profile
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={handleProfileImage}
              />
            </Button>

            {profilePreview && (
              <Avatar
                src={profilePreview}
                className={cx("profile-avatar")}
              />
            )}
          </div>

          <div className={cx("upload-box")}>
            <Tooltip title="Recommended size: 1200x630px for social media sharing">
              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUploadIcon />}
                className={cx("upload-btn", "secondary")}
              >
                Upload OG Image
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={handleOgImage}
                />
              </Button>
            </Tooltip>

            {ogImagePreview && (
              <Avatar
                src={ogImagePreview}
                className={cx("profile-avatar")}
              />
            )}
          </div>
        </div>
      </section>

      <section className={cx("editor-card", "premium-card")}>
        <h2 className={cx("section-title")}>
          Header Content
        </h2>

        <div className={cx("editor-wrapper")}>
          <ReactQuill
            value={formData.headerContent || ""}
            onChange={(val) =>
              updateField("headerContent", val)
            }
            modules={modules}
            formats={formats}
          />
        </div>
      </section>

      <section className={cx("editor-card", "premium-card")}>
        <div className={cx("editor-header")}>
          <h2 className={cx("section-title")}>Page Content</h2>
          <div className={cx("editor-controls")}>
            <Tooltip title={previewMode ? "Edit Mode" : "Preview Mode"}>
              <IconButton size="small" onClick={() => setPreviewMode(!previewMode)} color={previewMode ? "primary" : "default"}>
                {previewMode ? <VisibilityOffIcon /> : <PreviewIcon />}
              </IconButton>
            </Tooltip>
          </div>
        </div>
        {!previewMode ? (
          <div className={cx("editor-wrapper")}>
            <ReactQuill
              value={formData.pageContent || ""}
              onChange={(val) => updateField("pageContent", val)}
              modules={modules}
              formats={formats}
            />
          </div>
        ) : (
          <div className={cx("preview-content")} dangerouslySetInnerHTML={{ __html: formData.pageContent || "" }} />
        )}
      </section>

      <section className={cx("editor-card", "premium-card")}>
        <div className={cx("content-blocks-header")}>
          <div>
            <h2 className={cx("section-title")}>Body Tables</h2>
            <p className={cx("section-helper")}>Add tables that will appear after the main blog content.</p>
          </div>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addTable}>
            Add Table
          </Button>
        </div>
        {contentBlocks.length === 0 ? (
          <p className={cx("empty-state")}>No tables added yet.</p>
        ) : (
          <div className={cx("content-blocks-list")}>
            {contentBlocks.map((rawBlock, idx) => {
              const block = normalizeTableBlock(rawBlock);
              const cols = getColumnCount(block) || DEFAULT_TABLE_COLS;

              return (
              <div key={block.id} className={cx("content-block")}>
                <div className={cx("block-header")}>
                  <div>
                    <span className={cx("block-type")}>TABLE {idx + 1}</span>
                    <p className={cx("block-helper")}>First row can be used as the table header.</p>
                  </div>
                  <div className={cx("block-actions-inline")}>
                    <IconButton size="small" color="error" onClick={() => removeContentBlock(block.id)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </div>
                </div>
                <div className={cx("block-content")}>
                  <div className={cx("table-options")}>
                    <label>
                      Caption
                      <input
                        value={block.caption}
                        onChange={(e) => updateTableBlock(block.id, (table) => ({ ...table, caption: e.target.value }))}
                        placeholder="Optional table caption"
                      />
                    </label>
                    <label className={cx("checkbox-field")}>
                      <input
                        type="checkbox"
                        checked={block.hasHeaderRow}
                        onChange={(e) => updateTableBlock(block.id, (table) => ({ ...table, hasHeaderRow: e.target.checked }))}
                      />
                      First row is header
                    </label>
                  </div>

                  <div className={cx("table-controls")}>
                    <button type="button" onClick={() => addTableRow(block.id)}>+ Row</button>
                    <button type="button" onClick={() => addTableColumn(block.id)}>+ Column</button>
                  </div>

                  <div className={cx("table-container")}>
                    <table className={cx("data-table")}>
                        <tbody>
                          {block.rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {Array.from({ length: cols }).map((_, cIdx) => (
                                <td key={cIdx}>
                                  <textarea
                                    value={row.cells[cIdx] || ""}
                                    onChange={(e) => updateTableCell(block.id, rIdx, cIdx, e.target.value)}
                                    placeholder={rIdx === 0 && block.hasHeaderRow ? `Heading ${cIdx + 1}` : `Row ${rIdx + 1}, Col ${cIdx + 1}`}
                                    rows={2}
                                  />
                                </td>
                              ))}
                              <td className={cx("table-row-actions")}>
                                <button
                                  type="button"
                                  onClick={() => removeTableRow(block.id, rIdx)}
                                  disabled={block.rows.length <= 1}
                                  aria-label={`Remove row ${rIdx + 1}`}
                                >
                                  x
                                </button>
                              </td>
                            </tr>
                          ))}
                          <tr className={cx("table-column-actions")}>
                            {Array.from({ length: cols }).map((_, cIdx) => (
                              <td key={cIdx}>
                                <button
                                  type="button"
                                  onClick={() => removeTableColumn(block.id, cIdx)}
                                  disabled={cols <= 1}
                                >
                                  Remove col
                                </button>
                              </td>
                            ))}
                            <td />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      <section className={cx("editor-card", "premium-card")}>
        <div className={cx("faq-head")}>
          <h2 className={cx("section-title")}>FAQs</h2>

          <Button
            startIcon={<AddIcon />}
            onClick={addFaq}
          >
            Add FAQ
          </Button>
        </div>

        {(formData.faq || []).map((item, faqIndex) => (
          <div className={cx("faq-item")} key={faqIndex}>
            <input
              placeholder="Question"
              value={item.question}
              onChange={(e) =>
                updateFaq(
                  faqIndex,
                  "question",
                  e.target.value
                )
              }
            />

            <textarea
              placeholder="Answer (plain text)"
              value={item.answer}
              onChange={(e) =>
                updateFaq(
                  faqIndex,
                  "answer",
                  e.target.value
                )
              }
            />

            {/* Links Section */}
            <div className={cx("faq-links-section")}>
              <div className={cx("faq-links-header")}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                  🔗 Add Links in Answer
                </label>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => addFaqLink(faqIndex)}
                  sx={{ fontSize: "12px" }}
                >
                  Add Link
                </Button>
              </div>

              {(item.links || []).map((link, linkIndex) => (
                <div
                  key={linkIndex}
                  className={cx("faq-link-row")}
                >
                  <TextField
                    size="small"
                    placeholder="Link text (exact match)"
                    value={link.linkText}
                    onChange={(e) =>
                      updateFaqLink(faqIndex, linkIndex, "linkText", e.target.value)
                    }
                    helperText="Text to make clickable"
                    fullWidth
                  />

                  <TextField
                    size="small"
                    placeholder="URL"
                    value={link.url}
                    onChange={(e) =>
                      updateFaqLink(faqIndex, linkIndex, "url", e.target.value)
                    }
                    helperText="https://massclick.in/..."
                    fullWidth
                  />

                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeFaqLink(faqIndex, linkIndex)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </div>
              ))}

              {(!item.links || item.links.length === 0) && (
                <div className={cx("faq-no-links")}>
                  No links added. Click "Add Link" to make words in the answer clickable.
                </div>
              )}
            </div>

            <IconButton
              color="error"
              onClick={() => removeFaq(faqIndex)}
              sx={{ mt: 1 }}
            >
              <DeleteOutlineIcon />
            </IconButton>
          </div>
        ))}
      </section>

      <div className={cx("action-bar")}>
        <button type="submit" disabled={loading}>
          {loading ? (
            <CircularProgress size={20} />
          ) : editingId ? (
            "Update Blog"
          ) : (
            "Publish Blog"
          )}
        </button>
      </div>
    </form>
  );
}
