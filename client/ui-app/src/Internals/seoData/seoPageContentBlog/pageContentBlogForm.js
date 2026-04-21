// FILE: SeoPageContentForm.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill";
import {
  Button,
  Avatar,
  CircularProgress,
  IconButton,
  Chip,
} from "@mui/material";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { useDispatch, useSelector } from "react-redux";
import { fetchBusinessSuggestion } from "../../../redux/actions/seoPageContentBlogAction";

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

  const [searchTerm, setSearchTerm] = useState("");
  const [preview, setPreview] = useState([]);
  const [profilePreview, setProfilePreview] = useState("");

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

  /* ======================================
     IMAGE PREVIEW SYNC
  ====================================== */
  useEffect(() => {
    setPreview(formData.pageImages || []);
  }, [formData.pageImages]);

  useEffect(() => {
    setProfilePreview(formData.profileImage || "");
  }, [formData.profileImage]);

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
      { question: "", answer: "" },
    ]);
  };

  const updateFaq = (index, key, value) => {
    const updated = [...(formData.faq || [])];
    updated[index][key] = value;
    updateField("faq", updated);
  };

  const removeFaq = (index) => {
    updateField(
      "faq",
      formData.faq.filter((_, i) => i !== index)
    );
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
            <input
              value={formData[field.key] || ""}
              onChange={(e) =>
                updateField(field.key, e.target.value)
              }
              placeholder=" "
              required={
                ["metaTitle", "metaDescription", "pageType", "category", "heading"].includes(
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
          </div>
        ))}

        {/* SLUG PREVIEW */}
        <div className="slug-preview full-row">
          <strong>Slug:</strong> {slugPreview || "-"}
        </div>

        {/* BUSINESS SEARCH */}
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
                        const updated =
                          formData.popularBusiness.filter(
                            (_, index) => index !== i
                          );

                        updateField(
                          "popularBusiness",
                          updated
                        );
                      }}
                    >
                      ×
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
                      const exists = (
                        formData.popularBusiness || []
                      ).some(
                        (x) =>
                          x.businessName ===
                          b.businessName
                      );

                      if (!exists) {
                        updateField(
                          "popularBusiness",
                          [
                            ...(formData.popularBusiness ||
                              []),
                            b,
                          ]
                        );
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

        {/* TAGS */}
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

        {/* IMAGES */}
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
                    ×
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
        </div>
      </section>

      {/* HEADER CONTENT */}
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

      {/* PAGE CONTENT */}
      <section className="editor-card premium-card">
        <h2 className="section-title">
          Page Content
        </h2>

        <div className="editor-wrapper">
          <ReactQuill
            value={formData.pageContent || ""}
            onChange={(val) =>
              updateField("pageContent", val)
            }
            modules={modules}
            formats={formats}
          />
        </div>
      </section>

      {/* FAQ */}
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

        {(formData.faq || []).map((item, index) => (
          <div className="faq-item" key={index}>
            <input
              placeholder="Question"
              value={item.question}
              onChange={(e) =>
                updateFaq(
                  index,
                  "question",
                  e.target.value
                )
              }
            />

            <textarea
              placeholder="Answer"
              value={item.answer}
              onChange={(e) =>
                updateFaq(
                  index,
                  "answer",
                  e.target.value
                )
              }
            />

            <IconButton
              color="error"
              onClick={() => removeFaq(index)}
            >
              <DeleteOutlineIcon />
            </IconButton>
          </div>
        ))}
      </section>

      {/* SUBMIT */}
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