// FILE: SeoPageContentForm.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill";
import {
  Button,
  Avatar,
  CircularProgress,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Box,
  Tooltip,
} from "@mui/material";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import PreviewIcon from "@mui/icons-material/Preview";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import { useDispatch, useSelector } from "react-redux";
import { fetchBusinessSuggestion } from "../../../redux/actions/seoPageContentBlogAction";
import { getAllLocation } from "../../../redux/actions/locationAction.js";
import { fetchSeoCategorySuggestions } from "../../../redux/actions/seoAction.js";

import "react-quill/dist/quill.snow.css";

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

  const [searchTerm, setSearchTerm] = useState("");
  const [preview, setPreview] = useState([]);
  const [profilePreview, setProfilePreview] = useState("");
  const [ogImagePreview, setOgImagePreview] = useState("");
  const [showLocationSuggest, setShowLocationSuggest] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [categorySuggestions, setCategorySuggestions] = useState([]);

  // Content Blocks State
  const [contentBlocks, setContentBlocks] = useState(formData.contentBlocks || []);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showCalloutDialog, setShowCalloutDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [showTestimonialDialog, setShowTestimonialDialog] = useState(false);
  const [showStepsDialog, setShowStepsDialog] = useState(false);
  const [showAccordionDialog, setShowAccordionDialog] = useState(false);
  const [showButtonDialog, setShowButtonDialog] = useState(false);
  const [showFeatureDialog, setShowFeatureDialog] = useState(false);
  const [showProsCons, setShowProsCons] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [codeContent, setCodeContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [calloutType, setCalloutType] = useState("info");
  const [calloutText, setCalloutText] = useState("");
  const [statsItems, setStatsItems] = useState([{ label: "", value: "" }]);
  const [testimonialData, setTestimonialData] = useState({ name: "", role: "", text: "", image: "" });
  const [stepsData, setStepsData] = useState([{ title: "", description: "" }]);
  const [accordionItems, setAccordionItems] = useState([{ title: "", content: "" }]);
  const [buttonData, setButtonData] = useState({ text: "Learn More", url: "", style: "primary" });
  const [featureItems, setFeatureItems] = useState([{ icon: "⭐", title: "", description: "" }]);
  const [prosConsData, setProsConsData] = useState({ pros: [""], cons: [""] });

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
      updateField("profileImage", reader.result);
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
      updateField("ogImage", reader.result);
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

  // Sync content blocks from formData
  useEffect(() => {
    if (formData.contentBlocks && formData.contentBlocks.length > 0) {
      setContentBlocks(formData.contentBlocks);
    }
  }, [editingId]);

  // Sync category input when editing or form data changes
  useEffect(() => {
    setCategoryInput(formData.category || "");
  }, [editingId, formData.category]);

  const addStatistics = () => {
    const newStats = {
      id: Date.now(),
      type: "statistics",
      items: statsItems.filter((s) => s.label && s.value),
    };
    if (newStats.items.length === 0) return;
    const updated = [...contentBlocks, newStats];
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
    setShowStatsDialog(false);
    setStatsItems([{ label: "", value: "" }]);
  };

  const addTestimonial = () => {
    if (!testimonialData.name || !testimonialData.text) return;
    const newTestimonial = {
      id: Date.now(),
      type: "testimonial",
      ...testimonialData,
    };
    const updated = [...contentBlocks, newTestimonial];
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
    setShowTestimonialDialog(false);
    setTestimonialData({ name: "", role: "", text: "", image: "" });
  };

  const addSteps = () => {
    const validSteps = stepsData.filter((s) => s.title);
    if (validSteps.length === 0) return;
    const newSteps = {
      id: Date.now(),
      type: "steps",
      items: validSteps,
    };
    const updated = [...contentBlocks, newSteps];
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
    setShowStepsDialog(false);
    setStepsData([{ title: "", description: "" }]);
  };

  const addAccordion = () => {
    const validAccordions = accordionItems.filter((a) => a.title);
    if (validAccordions.length === 0) return;
    const newAccordion = {
      id: Date.now(),
      type: "accordion",
      items: validAccordions,
    };
    const updated = [...contentBlocks, newAccordion];
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
    setShowAccordionDialog(false);
    setAccordionItems([{ title: "", content: "" }]);
  };

  const addButton = () => {
    if (!buttonData.text) return;
    const newButton = {
      id: Date.now(),
      type: "button",
      ...buttonData,
    };
    const updated = [...contentBlocks, newButton];
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
    setShowButtonDialog(false);
    setButtonData({ text: "Learn More", url: "", style: "primary" });
  };

  const addFeatures = () => {
    const validFeatures = featureItems.filter((f) => f.title);
    if (validFeatures.length === 0) return;
    const newFeatures = {
      id: Date.now(),
      type: "features",
      items: validFeatures,
    };
    const updated = [...contentBlocks, newFeatures];
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
    setShowFeatureDialog(false);
    setFeatureItems([{ icon: "⭐", title: "", description: "" }]);
  };

  const addProsCons = () => {
    const validPros = prosConsData.pros.filter((p) => p.trim());
    const validCons = prosConsData.cons.filter((c) => c.trim());
    if (validPros.length === 0 && validCons.length === 0) return;
    const newProsCons = {
      id: Date.now(),
      type: "prosCons",
      pros: validPros,
      cons: validCons,
    };
    const updated = [...contentBlocks, newProsCons];
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
    setShowProsCons(false);
    setProsConsData({ pros: [""], cons: [""] });
  };

  const addTable = () => {
    const newTable = {
      id: Date.now(),
      type: "table",
      rows: Array(tableRows)
        .fill(null)
        .map(() => Array(tableCols).fill("")),
      cols: tableCols,
    };
    const updated = [...contentBlocks, newTable];
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
    setShowTableDialog(false);
    setTableRows(3);
    setTableCols(3);
  };

  const addCodeBlock = () => {
    if (!codeContent.trim()) return;
    const newCode = {
      id: Date.now(),
      type: "code",
      language: codeLanguage,
      content: codeContent,
    };
    const updated = [...contentBlocks, newCode];
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
    setShowCodeDialog(false);
    setCodeContent("");
    setCodeLanguage("javascript");
  };

  const addVideoEmbed = () => {
    if (!videoUrl.trim()) return;
    const newVideo = {
      id: Date.now(),
      type: "video",
      url: videoUrl,
    };
    const updated = [...contentBlocks, newVideo];
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
    setShowVideoDialog(false);
    setVideoUrl("");
  };

  const addCallout = () => {
    if (!calloutText.trim()) return;
    const newCallout = {
      id: Date.now(),
      type: "callout",
      calloutType,
      text: calloutText,
    };
    const updated = [...contentBlocks, newCallout];
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
    setShowCalloutDialog(false);
    setCalloutText("");
    setCalloutType("info");
  };

  const updateTableCell = (blockId, rowIdx, colIdx, value) => {
    const updated = contentBlocks.map((block) => {
      if (block.id === blockId && block.type === "table") {
        const newRows = block.rows.map((row, rIdx) =>
          rIdx === rowIdx
            ? row.map((cell, cIdx) => (cIdx === colIdx ? value : cell))
            : row
        );
        return { ...block, rows: newRows };
      }
      return block;
    });
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
  };

  const removeContentBlock = (blockId) => {
    const updated = contentBlocks.filter((block) => block.id !== blockId);
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
  };

  const moveBlock = (fromIdx, toIdx) => {
    const updated = [...contentBlocks];
    [updated[fromIdx], updated[toIdx]] = [updated[toIdx], updated[fromIdx]];
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
  };

  const duplicateBlock = (blockId) => {
    const block = contentBlocks.find((b) => b.id === blockId);
    if (!block) return;
    const duplicate = { ...JSON.parse(JSON.stringify(block)), id: Date.now() };
    const updated = [...contentBlocks, duplicate];
    setContentBlocks(updated);
    updateField("contentBlocks", updated);
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
    { label: "Author", key: "author" },
  ];

  return (
    <form className="seo-form" onSubmit={handleSubmit}>
      {/* ======================================
          META CARD
      ====================================== */}
      <section className="meta-card premium-card">
        <h2 className="section-title full-row">
          SEO Settings
        </h2>

        {fields.map((field) => (
          <div className="floating-field" key={field.key}>
            {field.key === "category" ? (
              <>
                <input
                  value={categoryInput}
                  placeholder=" "
                  className="seo-text-input"
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
                  <ul className="category-suggestion-list">
                    {seoCategorySuggestions.map((item) => (
                      <li
                        key={item._id}
                        className="category-suggestion-item"
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
                  onBlur={() => setTimeout(() => setShowLocationSuggest(false), 150)}
                  placeholder=" "
                />

                <label>{field.label}</label>

                {showLocationSuggest && locationSuggestions.length > 0 && (
                  <ul className="category-suggestion-list">
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
            ) : (
              <>
                <input
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
                  <span className="char-count">
                    {(formData[field.key] || "").length}/{field.limit}
                  </span>
                )}
              </>
            )}
          </div>
        ))}

        <div className="slug-preview full-row">
          <strong>Slug:</strong> {slugPreview || "-"}
        </div>

        <div className="floating-field full-row">
          <div className="category-input-wrapper">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder=" "
            />
            <label>Popular Business</label>

            {(formData.popularBusiness || []).length > 0 && (
              <div className="selected-tags">
                {formData.popularBusiness.map((item, i) => (
                  <span className="tag" key={i}>
                    {item.businessName}
                    <span
                      className="remove"
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
              <ul className="category-suggestion-list">
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

        <div className="full-row">
          <div className="tags-box">
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

            <div className="selected-tags">
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

        <div className="upload-row">
          <div className="upload-box">
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUploadIcon />}
              className="upload-btn primary"
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

            <div className="preview-row">
              {preview.map((img, i) => (
                <div className="preview-item" key={i}>
                  <Avatar src={img} />
                  <span onClick={() => removeImage(i)}>
                    x
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="upload-box">
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUploadIcon />}
              className="upload-btn secondary"
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
                className="profile-avatar"
              />
            )}
          </div>

          <div className="upload-box">
            <Tooltip title="Recommended size: 1200x630px for social media sharing">
              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUploadIcon />}
                className="upload-btn secondary"
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
                className="profile-avatar"
              />
            )}
          </div>
        </div>
      </section>

      <section className="editor-card premium-card">
        <h2 className="section-title">
          Header Content
        </h2>

        <div className="editor-wrapper">
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

      <section className="editor-card premium-card">
        <div className="editor-header">
          <h2 className="section-title">Page Content</h2>
          <div className="editor-controls">
            <Tooltip title={previewMode ? "Edit Mode" : "Preview Mode"}>
              <IconButton size="small" onClick={() => setPreviewMode(!previewMode)} color={previewMode ? "primary" : "default"}>
                {previewMode ? <VisibilityOffIcon /> : <PreviewIcon />}
              </IconButton>
            </Tooltip>
          </div>
        </div>
        {!previewMode ? (
          <div className="editor-wrapper">
            <ReactQuill
              value={formData.pageContent || ""}
              onChange={(val) => updateField("pageContent", val)}
              modules={modules}
              formats={formats}
            />
          </div>
        ) : (
          <div className="preview-content" dangerouslySetInnerHTML={{ __html: formData.pageContent || "" }} />
        )}
      </section>

      {/* CONTENT BLOCKS SECTION */}
      <section className="editor-card premium-card">
        <div className="content-blocks-header">
          <h2 className="section-title">Rich Content Blocks</h2>
          <div className="block-actions">
            <Button size="small" variant="outlined" onClick={() => setShowTableDialog(true)}>📊 Table</Button>
            <Button size="small" variant="outlined" onClick={() => setShowCodeDialog(true)}>💻 Code</Button>
            <Button size="small" variant="outlined" onClick={() => setShowVideoDialog(true)}>🎬 Video</Button>
            <Button size="small" variant="outlined" onClick={() => setShowCalloutDialog(true)}>💬 Callout</Button>
            <Button size="small" variant="outlined" onClick={() => setShowStatsDialog(true)}>📈 Stats</Button>
            <Button size="small" variant="outlined" onClick={() => setShowTestimonialDialog(true)}>⭐ Testimonial</Button>
            <Button size="small" variant="outlined" onClick={() => setShowStepsDialog(true)}>📍 Steps</Button>
            <Button size="small" variant="outlined" onClick={() => setShowAccordionDialog(true)}>📂 Accordion</Button>
            <Button size="small" variant="outlined" onClick={() => setShowButtonDialog(true)}>🔘 Button</Button>
            <Button size="small" variant="outlined" onClick={() => setShowFeatureDialog(true)}>✨ Features</Button>
            <Button size="small" variant="outlined" onClick={() => setShowProsCons(true)}>✅ Pros/Cons</Button>
          </div>
        </div>
        {contentBlocks.length === 0 ? (
          <p className="empty-state">No content blocks yet. Add tables, code, videos, or callouts above.</p>
        ) : (
          <div className="content-blocks-list">
            {contentBlocks.map((block, idx) => (
              <div key={block.id} className="content-block">
                <div className="block-header">
                  <DragIndicatorIcon className="drag-handle" />
                  <span className="block-type">{block.type.toUpperCase()}</span>
                  <div className="block-actions-inline">
                    {idx > 0 && <IconButton size="small" onClick={() => moveBlock(idx, idx - 1)}>↑</IconButton>}
                    {idx < contentBlocks.length - 1 && <IconButton size="small" onClick={() => moveBlock(idx, idx + 1)}>↓</IconButton>}
                    <IconButton size="small" onClick={() => duplicateBlock(block.id)}>📋</IconButton>
                    <IconButton size="small" color="error" onClick={() => removeContentBlock(block.id)}><DeleteOutlineIcon /></IconButton>
                  </div>
                </div>
                <div className="block-content">
                  {block.type === "table" && (
                    <div className="table-container">
                      <table className="data-table">
                        <tbody>
                          {block.rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx}>
                                  <input type="text" value={cell} onChange={(e) => updateTableCell(block.id, rIdx, cIdx, e.target.value)} placeholder={`Cell ${rIdx + 1}-${cIdx + 1}`} />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {block.type === "code" && (
                    <div className="code-block-display">
                      <div className="code-label">{block.language}</div>
                      <pre><code>{block.content}</code></pre>
                    </div>
                  )}
                  {block.type === "video" && (
                    <div className="video-embed">
                      <iframe width="100%" height="400" src={block.url.includes("youtube.com") || block.url.includes("youtu.be") ? `https://www.youtube.com/embed/${block.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1]}` : block.url.includes("vimeo.com") ? `https://player.vimeo.com/video/${block.url.match(/vimeo\.com\/(\d+)/)?.[1]}` : block.url} frameBorder="0" allowFullScreen title="Embedded Video"></iframe>
                    </div>
                  )}
                  {block.type === "callout" && (
                    <div className={`callout callout-${block.calloutType}`}>
                      <span className="callout-icon">{block.calloutType === "info" && "ℹ️"}{block.calloutType === "warning" && "⚠️"}{block.calloutType === "success" && "✅"}{block.calloutType === "error" && "❌"}{block.calloutType === "tip" && "💡"}</span>
                      <p>{block.text}</p>
                    </div>
                  )}
                  {block.type === "statistics" && (
                    <div className="statistics-grid">
                      {block.items.map((stat, idx) => (
                        <div key={idx} className="stat-card">
                          <div className="stat-value">{stat.value}</div>
                          <div className="stat-label">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {block.type === "testimonial" && (
                    <div className="testimonial-card">
                      <div className="testimonial-text">"{block.text}"</div>
                      <div className="testimonial-author">
                        {block.image && <img src={block.image} alt={block.name} />}
                        <div>
                          <div className="author-name">{block.name}</div>
                          {block.role && <div className="author-role">{block.role}</div>}
                        </div>
                      </div>
                    </div>
                  )}
                  {block.type === "steps" && (
                    <div className="steps-container">
                      {block.items.map((step, idx) => (
                        <div key={idx} className="step-item">
                          <div className="step-number">{idx + 1}</div>
                          <div className="step-content">
                            <h4>{step.title}</h4>
                            {step.description && <p>{step.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {block.type === "accordion" && (
                    <div className="accordion-container">
                      {block.items.map((item, idx) => (
                        <div key={idx} className="accordion-item">
                          <div className="accordion-title"><span>{item.title}</span><span>▼</span></div>
                          <div className="accordion-content">{item.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {block.type === "button" && (
                    <div className="button-container">
                      <button className={`cta-button btn-${block.style}`}>{block.text}</button>
                      {block.url && <code>{block.url}</code>}
                    </div>
                  )}
                  {block.type === "features" && (
                    <div className="features-grid">
                      {block.items.map((feature, idx) => (
                        <div key={idx} className="feature-card">
                          <div className="feature-icon">{feature.icon}</div>
                          <h4>{feature.title}</h4>
                          {feature.description && <p>{feature.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {block.type === "prosCons" && (
                    <div className="proscons-container">
                      <div className="pros-column">
                        <h4>✅ Pros</h4>
                        <ul>
                          {block.pros.map((pro, idx) => (<li key={idx}>{pro}</li>))}
                        </ul>
                      </div>
                      <div className="cons-column">
                        <h4>❌ Cons</h4>
                        <ul>
                          {block.cons.map((con, idx) => (<li key={idx}>{con}</li>))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="editor-card premium-card">
        <div className="faq-head">
          <h2 className="section-title">FAQs</h2>

          <Button
            startIcon={<AddIcon />}
            onClick={addFaq}
          >
            Add FAQ
          </Button>
        </div>

        {(formData.faq || []).map((item, faqIndex) => (
          <div className="faq-item" key={faqIndex}>
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
            <div className="faq-links-section">
              <div className="faq-links-header">
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
                  className="faq-link-row"
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
                <div className="faq-no-links">
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

      {/* DIALOGS */}
      <Dialog open={showTableDialog} onClose={() => setShowTableDialog(false)}>
        <DialogTitle>Create Table</DialogTitle>
        <DialogContent sx={{ display: "flex", gap: 2, py: 3 }}>
          <TextField type="number" label="Rows" value={tableRows} onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value)))} inputProps={{ min: 1, max: 20 }} />
          <TextField type="number" label="Columns" value={tableCols} onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value)))} inputProps={{ min: 1, max: 10 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTableDialog(false)}>Cancel</Button>
          <Button onClick={addTable} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showCodeDialog} onClose={() => setShowCodeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Code Block</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, py: 2 }}>
          <Select value={codeLanguage} onChange={(e) => setCodeLanguage(e.target.value)}>
            <MenuItem value="javascript">JavaScript</MenuItem>
            <MenuItem value="python">Python</MenuItem>
            <MenuItem value="html">HTML</MenuItem>
            <MenuItem value="css">CSS</MenuItem>
            <MenuItem value="sql">SQL</MenuItem>
            <MenuItem value="bash">Bash</MenuItem>
            <MenuItem value="json">JSON</MenuItem>
            <MenuItem value="typescript">TypeScript</MenuItem>
            <MenuItem value="jsx">JSX</MenuItem>
            <MenuItem value="java">Java</MenuItem>
          </Select>
          <TextField label="Code Content" multiline rows={8} value={codeContent} onChange={(e) => setCodeContent(e.target.value)} placeholder="Paste your code here..." variant="outlined" fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCodeDialog(false)}>Cancel</Button>
          <Button onClick={addCodeBlock} variant="contained" disabled={!codeContent.trim()}>Add Code</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showVideoDialog} onClose={() => setShowVideoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Embed Video</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <TextField label="Video URL" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." variant="outlined" fullWidth sx={{ mt: 2 }} helperText="Supports YouTube and Vimeo" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVideoDialog(false)}>Cancel</Button>
          <Button onClick={addVideoEmbed} variant="contained" disabled={!videoUrl.trim()}>Embed Video</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showCalloutDialog} onClose={() => setShowCalloutDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Callout</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, py: 2 }}>
          <Select value={calloutType} onChange={(e) => setCalloutType(e.target.value)}>
            <MenuItem value="info">ℹ️ Info</MenuItem>
            <MenuItem value="warning">⚠️ Warning</MenuItem>
            <MenuItem value="success">✅ Success</MenuItem>
            <MenuItem value="error">❌ Error</MenuItem>
            <MenuItem value="tip">💡 Tip</MenuItem>
          </Select>
          <TextField label="Callout Text" multiline rows={4} value={calloutText} onChange={(e) => setCalloutText(e.target.value)} placeholder="Enter your callout message..." variant="outlined" fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCalloutDialog(false)}>Cancel</Button>
          <Button onClick={addCallout} variant="contained" disabled={!calloutText.trim()}>Add Callout</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showStatsDialog} onClose={() => setShowStatsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Statistics</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          {statsItems.map((item, idx) => (
            <Box key={idx} sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField label="Value (e.g., 100+)" value={item.value} onChange={(e) => { const updated = [...statsItems]; updated[idx].value = e.target.value; setStatsItems(updated); }} sx={{ flex: 1 }} />
              <TextField label="Label (e.g., Customers)" value={item.label} onChange={(e) => { const updated = [...statsItems]; updated[idx].label = e.target.value; setStatsItems(updated); }} sx={{ flex: 1 }} />
              <IconButton onClick={() => setStatsItems(statsItems.filter((_, i) => i !== idx))} color="error"><DeleteOutlineIcon /></IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={() => setStatsItems([...statsItems, { label: "", value: "" }])}>Add More</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStatsDialog(false)}>Cancel</Button>
          <Button onClick={addStatistics} variant="contained">Add Stats</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showTestimonialDialog} onClose={() => setShowTestimonialDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Testimonial</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, py: 2 }}>
          <TextField label="Author Name *" value={testimonialData.name} onChange={(e) => setTestimonialData({...testimonialData, name: e.target.value})} fullWidth />
          <TextField label="Author Role" value={testimonialData.role} onChange={(e) => setTestimonialData({...testimonialData, role: e.target.value})} fullWidth />
          <TextField label="Testimonial Text *" multiline rows={4} value={testimonialData.text} onChange={(e) => setTestimonialData({...testimonialData, text: e.target.value})} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTestimonialDialog(false)}>Cancel</Button>
          <Button onClick={addTestimonial} variant="contained" disabled={!testimonialData.name || !testimonialData.text}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showStepsDialog} onClose={() => setShowStepsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Steps/Timeline</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          {stepsData.map((step, idx) => (
            <Box key={idx} sx={{ mb: 2 }}>
              <TextField label={`Step ${idx + 1} Title *`} value={step.title} onChange={(e) => { const updated = [...stepsData]; updated[idx].title = e.target.value; setStepsData(updated); }} fullWidth sx={{ mb: 1 }} />
              <TextField label="Description" value={step.description} onChange={(e) => { const updated = [...stepsData]; updated[idx].description = e.target.value; setStepsData(updated); }} multiline rows={2} fullWidth />
              <IconButton onClick={() => setStepsData(stepsData.filter((_, i) => i !== idx))} color="error" sx={{ mt: 1 }}><DeleteOutlineIcon /></IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={() => setStepsData([...stepsData, { title: "", description: "" }])}>Add Step</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStepsDialog(false)}>Cancel</Button>
          <Button onClick={addSteps} variant="contained">Add Steps</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showAccordionDialog} onClose={() => setShowAccordionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Accordion/FAQ</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          {accordionItems.map((item, idx) => (
            <Box key={idx} sx={{ mb: 2 }}>
              <TextField label={`Item ${idx + 1} Title *`} value={item.title} onChange={(e) => { const updated = [...accordionItems]; updated[idx].title = e.target.value; setAccordionItems(updated); }} fullWidth sx={{ mb: 1 }} />
              <TextField label="Content" value={item.content} onChange={(e) => { const updated = [...accordionItems]; updated[idx].content = e.target.value; setAccordionItems(updated); }} multiline rows={3} fullWidth />
              <IconButton onClick={() => setAccordionItems(accordionItems.filter((_, i) => i !== idx))} color="error" sx={{ mt: 1 }}><DeleteOutlineIcon /></IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={() => setAccordionItems([...accordionItems, { title: "", content: "" }])}>Add Item</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAccordionDialog(false)}>Cancel</Button>
          <Button onClick={addAccordion} variant="contained">Add Accordion</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showButtonDialog} onClose={() => setShowButtonDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Button / Call-to-Action</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, py: 3 }}>
          <Box>
            <TextField
              label="Button Text *"
              value={buttonData.text}
              onChange={(e) => setButtonData({...buttonData, text: e.target.value})}
              fullWidth
              placeholder="e.g., Learn More, Get Started"
            />
          </Box>

          <Box>
            <TextField
              label="Button URL (Optional)"
              value={buttonData.url}
              onChange={(e) => setButtonData({...buttonData, url: e.target.value})}
              fullWidth
              placeholder="https://example.com"
              helperText="Leave empty for button without link"
            />
          </Box>

          <Box>
            <Box sx={{ mb: 1.5 }}>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 8, fontSize: "14px", color: "#0f172a" }}>
                Button Style
              </label>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
              {[
                { value: "primary", label: "🟠 Primary", desc: "Orange gradient - Main CTA" },
                { value: "secondary", label: "⚪ Secondary", desc: "White with border" },
                { value: "outline", label: "🟦 Outline", desc: "Transparent with border" },
                { value: "success", label: "🟢 Success", desc: "Green - For positive actions" },
              ].map((style) => (
                <Box
                  key={style.value}
                  onClick={() => setButtonData({...buttonData, style: style.value})}
                  sx={{
                    padding: "12px 14px",
                    border: buttonData.style === style.value ? "2px solid #ff6b00" : "2px solid #e2e8f0",
                    borderRadius: "10px",
                    cursor: "pointer",
                    background: buttonData.style === style.value ? "#fff4ea" : "#f8fafc",
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: "#ff6b00",
                      background: "#fff4ea",
                    },
                  }}
                >
                  <Box sx={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>
                    {style.label}
                  </Box>
                  <Box sx={{ fontSize: "12px", color: "#64748b" }}>
                    {style.desc}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Live Preview */}
          <Box sx={{
            borderTop: "2px solid #e8ecf1",
            paddingTop: 2.5,
            backgroundColor: "#f8fafc",
            padding: "16px",
            borderRadius: "12px"
          }}>
            <Box sx={{ mb: 1.5, fontWeight: 700, fontSize: "13px", color: "#64748b", textTransform: "uppercase" }}>
              Preview
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <button
                className={`cta-button btn-${buttonData.style}`}
                style={{
                  padding: "12px 28px",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "14px",
                  ...(buttonData.style === "primary" && {
                    background: "linear-gradient(135deg, #ff6b00, #ffad5e)",
                    color: "#fff",
                    boxShadow: "0 8px 24px rgba(255, 107, 0, 0.3)",
                  }),
                  ...(buttonData.style === "secondary" && {
                    background: "#fff",
                    color: "#ff6b00",
                    border: "2px solid #ff6b00",
                  }),
                  ...(buttonData.style === "outline" && {
                    background: "transparent",
                    color: "#ff6b00",
                    border: "2px solid #ff6b00",
                  }),
                }}
              >
                {buttonData.text || "Learn More"}
              </button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: 2 }}>
          <Button onClick={() => setShowButtonDialog(false)}>Cancel</Button>
          <Button onClick={addButton} variant="contained" disabled={!buttonData.text}>
            Add Button
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showFeatureDialog} onClose={() => setShowFeatureDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Features/Highlights</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          {featureItems.map((feature, idx) => (
            <Box key={idx} sx={{ mb: 2 }}>
              <TextField label="Icon (emoji)" value={feature.icon} onChange={(e) => { const updated = [...featureItems]; updated[idx].icon = e.target.value; setFeatureItems(updated); }} fullWidth sx={{ mb: 1 }} />
              <TextField label={`Feature ${idx + 1} Title *`} value={feature.title} onChange={(e) => { const updated = [...featureItems]; updated[idx].title = e.target.value; setFeatureItems(updated); }} fullWidth sx={{ mb: 1 }} />
              <TextField label="Description" value={feature.description} onChange={(e) => { const updated = [...featureItems]; updated[idx].description = e.target.value; setFeatureItems(updated); }} multiline rows={2} fullWidth />
              <IconButton onClick={() => setFeatureItems(featureItems.filter((_, i) => i !== idx))} color="error" sx={{ mt: 1 }}><DeleteOutlineIcon /></IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={() => setFeatureItems([...featureItems, { icon: "⭐", title: "", description: "" }])}>Add Feature</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFeatureDialog(false)}>Cancel</Button>
          <Button onClick={addFeatures} variant="contained">Add Features</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showProsCons} onClose={() => setShowProsCons(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Pros & Cons</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Box sx={{ mb: 2 }}>
            <h4>✅ Pros</h4>
            {prosConsData.pros.map((pro, idx) => (
              <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1 }}>
                <TextField value={pro} onChange={(e) => { const updated = [...prosConsData.pros]; updated[idx] = e.target.value; setProsConsData({...prosConsData, pros: updated}); }} fullWidth size="small" />
                <IconButton onClick={() => setProsConsData({...prosConsData, pros: prosConsData.pros.filter((_, i) => i !== idx)})} color="error"><DeleteOutlineIcon /></IconButton>
              </Box>
            ))}
            <Button startIcon={<AddIcon />} onClick={() => setProsConsData({...prosConsData, pros: [...prosConsData.pros, ""]})}>Add Pro</Button>
          </Box>
          <Box>
            <h4>❌ Cons</h4>
            {prosConsData.cons.map((con, idx) => (
              <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1 }}>
                <TextField value={con} onChange={(e) => { const updated = [...prosConsData.cons]; updated[idx] = e.target.value; setProsConsData({...prosConsData, cons: updated}); }} fullWidth size="small" />
                <IconButton onClick={() => setProsConsData({...prosConsData, cons: prosConsData.cons.filter((_, i) => i !== idx)})} color="error"><DeleteOutlineIcon /></IconButton>
              </Box>
            ))}
            <Button startIcon={<AddIcon />} onClick={() => setProsConsData({...prosConsData, cons: [...prosConsData.cons, ""]})}>Add Con</Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProsCons(false)}>Cancel</Button>
          <Button onClick={addProsCons} variant="contained">Add Pros/Cons</Button>
        </DialogActions>
      </Dialog>

      <div className="action-bar">
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
