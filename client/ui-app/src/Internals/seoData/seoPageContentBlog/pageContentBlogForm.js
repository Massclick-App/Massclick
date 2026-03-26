import React, { useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill";
import {
  CircularProgress,
  Button,
  Avatar,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useDispatch, useSelector } from "react-redux";
import { fetchBusinessSuggestion } from "../../../redux/actions/seoPageContentBlogAction";

export default function SeoPageContentForm({
  formData,
  setFormData,
  handleSubmit,
  loading,
  editingId,
  errors,
  modules,
  formats,
}) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState([]);
  const [profilePreview, setProfilePreview] = useState("");

  const dispatch = useDispatch();
  const { suggestions } = useSelector(
    (state) => state.seoPageContentBlogReducer
  );

  const [searchTerm, setSearchTerm] = useState("");

  const handleChange = (key, value) => {
    setFormData((p) => ({ ...p, [key]: value }));
  };

  const removeImage = (index) => {
    setPreview((prev) => prev.filter((_, i) => i !== index));

    setFormData((prev) => ({
      ...prev,
      pageImages: prev.pageImages.filter((_, i) => i !== index),
    }));
  };

  /* ===== SEARCH API ===== */
  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchTerm) {
        dispatch(fetchBusinessSuggestion(searchTerm));
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [searchTerm, dispatch]);

  /* ===== PROFILE IMAGE ===== */
  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setProfilePreview(previewUrl);

    const reader = new FileReader();

    reader.onloadend = () => {
      const base64 = reader.result;

      if (typeof base64 === "string") {
        setFormData((prev) => ({
          ...prev,
          profileImage: base64,
        }));
      }
    };

    reader.readAsDataURL(file);
  };

  /* ===== MULTIPLE IMAGES ===== */
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const previews = [];
    const base64Images = [];

    let completed = 0;

    files.forEach((file) => {
      const imageUrl = URL.createObjectURL(file);
      previews.push(imageUrl);

      const reader = new FileReader();

      reader.onloadend = () => {
        const base64 = reader.result;

        if (typeof base64 === "string") {
          base64Images.push(base64);
        }

        completed++;

        if (completed === files.length) {
          setPreview((prev) => [...prev, ...previews]);

          setFormData((prev) => ({
            ...prev,
            pageImages: [...(prev.pageImages || []), ...base64Images],
          }));
        }
      };

      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    if (Array.isArray(formData.pageImages)) {
      setPreview(formData.pageImages);
    }
  }, [formData.pageImages]);

  useEffect(() => {
    if (formData.profileImage && typeof formData.profileImage === "string") {
      setProfilePreview(formData.profileImage);
    }
  }, [formData.profileImage]);

  return (
    <form className="seo-form" onSubmit={handleSubmit}>
      <section className="meta-card premium-card">
        <h2 className="section-title">SEO Settings</h2>

        {[
          { label: "Meta Title", key: "metaTitle", limit: 60 },
          { label: "Meta Description", key: "metaDescription", limit: 160 },
          { label: "Meta Keywords", key: "metaKeywords" },
          { label: "Page Type", key: "pageType" },
          { label: "Category", key: "category" },
          { label: "Location", key: "location" },
          { label: "Heading", key: "heading" },
          { label: "Popular Business", key: "popularBusiness" },
        ].map((field) => (
          <div className="floating-field" key={field.key}>

            {/* ===== MULTI SELECT BUSINESS ===== */}
            {field.key === "popularBusiness" ? (
              <div className="category-input-wrapper">

                {/* INPUT */}
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder=" "
                />

                <label>Popular Business</label>

                {/* TAGS */}
                <div className="selected-tags">
                  {(formData.popularBusiness || []).map((b, i) => (
                    <span key={i} className="tag">
                      {b.businessName}
                      <span
                        className="remove"
                        onClick={() => {
                          const updated = formData.popularBusiness.filter(
                            (_, index) => index !== i
                          );
                          setFormData((prev) => ({
                            ...prev,
                            popularBusiness: updated,
                          }));
                        }}
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>

                {/* SUGGESTIONS */}
                {suggestions?.length > 0 && searchTerm && (
                  <ul className="category-suggestion-list">
                    {suggestions.map((b, i) => (
                      <li
                        key={i}
                        onClick={() => {
                          const exists = (formData.popularBusiness || []).some(
                            (item) =>
                              item.businessName === b.businessName
                          );

                          if (!exists) {
                            setFormData((prev) => ({
                              ...prev,
                              popularBusiness: [
                                ...(prev.popularBusiness || []),
                                b,
                              ],
                            }));
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
            ) : (
              <input
                value={formData[field.key] || ""}
                onChange={(e) =>
                  handleChange(field.key, e.target.value)
                }
                required
              />
            )}

            <label>{field.label}</label>

            {field.limit && (
              <span className="char-count">
                {formData[field.key]?.length || 0}/{field.limit}
              </span>
            )}
          </div>
        ))}

        {/* ===== IMAGE UPLOAD ===== */}
        <div className="upload-row">

          <div className="upload-box">
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              component="label"
              className="upload-btn primary"
            >
              Upload Images
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                ref={fileInputRef}
                onChange={handleImageChange}
              />
            </Button>

            <div className="preview-row">
              {preview.map((img, index) => (
                <div key={index} className="preview-item">
                  <Avatar src={img} />
                  <span onClick={() => removeImage(index)}>×</span>
                </div>
              ))}
            </div>
          </div>

          <div className="upload-box">
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              component="label"
              className="upload-btn secondary"
            >
              Upload Profile
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleProfileImageChange}
              />
            </Button>

            {profilePreview && (
              <div className="preview-row">
                <Avatar src={profilePreview} className="profile-avatar" />
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ===== HEADER CONTENT ===== */}
      <section className="editor-card premium-card">
        <h2 className="section-title">Header Content</h2>
        <div className="editor-wrapper">
          <ReactQuill
            value={formData.headerContent}
            onChange={(v) => handleChange("headerContent", v)}
            modules={modules}
            formats={formats}
          />
        </div>
      </section>

      {/* ===== PAGE CONTENT ===== */}
      <section className="editor-card premium-card">
        <h2 className="section-title">Page Content</h2>
        <div className="editor-wrapper">
          <ReactQuill
            value={formData.pageContent || ""}
            onChange={(v) => handleChange("pageContent", v)}
            modules={modules}
            formats={formats}
          />
        </div>
      </section>

      {/* ===== SUBMIT ===== */}
      <div className="action-bar premium-action">
        <button type="submit" disabled={loading}>
          {loading ? (
            <CircularProgress size={20} />
          ) : editingId ? (
            "Update Content"
          ) : (
            "Publish Content"
          )}
        </button>
      </div>
    </form>
  );
}