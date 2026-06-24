import React from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import BusinessFormSection from "./BusinessFormSection";
import styles from "../business.module.css";

const cx = createScopedClassNames(styles);

const BusinessFormStep2 = ({
  formData,
  category,
  categoryFilterConfig,
  collapsedSections,
  fieldErrors,
  handleChange,
  handleSectionAdvance,
  getSectionRefKey,
  getSectionIsComplete,
  getSectionIsDisabled,
  toggleSectionCollapsed,
  getInputClassName,
  renderFieldError,
  categoryKeywordSuggestions,
  inputKeyword,
  setFormData,
}) => {
  const sections = [
    { key: "categorySeo", title: "Category & SEO", subtitle: "" },
    { key: "keywordsTags", title: "Keywords & Tags", subtitle: "" },
    { key: "displaySeo", title: "Display & SEO", subtitle: "" },
    { key: "searchSeo", title: "Search Engine Optimization", subtitle: "" },
  ];

  const renderCategorySeo = () => (
    <>
      <div className={cx("form-input-group")}>
        <label className={cx("input-label")}>📂 Category *</label>
        <select
          name="category"
          className={getInputClassName("select-input", "category")}
          value={formData.category}
          onChange={handleChange}
        >
          <option value="">Select a category</option>
          {category.map((cat) => (
            <option key={cat._id} value={cat.category}>
              {cat.category}
            </option>
          ))}
        </select>
        {renderFieldError("category")}
      </div>

      <div className={cx("form-input-group")}>
        <label className={cx("input-label")}>🏷️ Keywords</label>
        <Autocomplete
          multiple
          options={categoryKeywordSuggestions}
          value={formData.keywords}
          onChange={(event, newValue) => setFormData((prev) => ({ ...prev, keywords: newValue }))}
          inputValue={inputKeyword}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Add keywords..."
              className={getInputClassName("text-input", "keywords")}
            />
          )}
        />
        {renderFieldError("keywords")}
      </div>
    </>
  );

  const renderKeywordsTags = () => (
    <div className={cx("form-input-group")}>
      <label className={cx("input-label")}>Additional Tags</label>
      <TextField
        multiline
        rows={3}
        placeholder="Add more tags or keywords separated by commas..."
        value={formData.keywords?.join(", ") || ""}
        fullWidth
        disabled
      />
    </div>
  );

  const renderDisplaySeo = () => (
    <>
      <div className={cx("form-input-group")}>
        <label className={cx("input-label")}>📌 Display Title</label>
        <input
          type="text"
          name="title"
          className={getInputClassName("text-input", "title")}
          value={formData.title}
          onChange={handleChange}
          placeholder="How your business appears to customers"
        />
        {renderFieldError("title")}
      </div>

      <div className={cx("form-input-group")}>
        <label className={cx("input-label")}>📝 Display Description</label>
        <textarea
          name="description"
          className={getInputClassName("textarea-input", "description")}
          value={formData.description}
          rows={3}
          onChange={handleChange}
          placeholder="A brief description of your business"
        />
        {renderFieldError("description")}
      </div>
    </>
  );

  const renderSearchSeo = () => (
    <>
      <div className={cx("form-input-group")}>
        <label className={cx("input-label")}>🔍 SEO Title</label>
        <input
          type="text"
          name="seoTitle"
          className={getInputClassName("text-input", "seoTitle")}
          value={formData.seoTitle}
          onChange={handleChange}
          placeholder="Meta title for search engines (50-60 characters)"
        />
        <small style={{ color: "#999", marginTop: "4px", display: "block" }}>
          {formData.seoTitle.length}/60 characters
        </small>
        {renderFieldError("seoTitle")}
      </div>

      <div className={cx("form-input-group")}>
        <label className={cx("input-label")}>🔍 SEO Description</label>
        <textarea
          name="seoDescription"
          className={getInputClassName("textarea-input", "seoDescription")}
          value={formData.seoDescription}
          rows={2}
          onChange={handleChange}
          placeholder="Meta description for search engines (150-160 characters)"
        />
        <small style={{ color: "#999", marginTop: "4px", display: "block" }}>
          {formData.seoDescription.length}/160 characters
        </small>
        {renderFieldError("seoDescription")}
      </div>

      <div className={cx("form-input-group")}>
        <label className={cx("input-label")}>🌐 URL Slug</label>
        <input
          type="text"
          name="slug"
          className={getInputClassName("text-input", "slug")}
          value={formData.slug}
          onChange={handleChange}
          placeholder="business-name-here"
        />
        {renderFieldError("slug")}
      </div>

      {categoryFilterConfig && categoryFilterConfig.length > 0 && (
        <div className={cx("form-input-group")}>
          <label className={cx("input-label")}>Category Filters</label>
          {categoryFilterConfig.map((filter) => (
            <div key={filter.key} style={{ marginBottom: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={!!formData.filters?.[filter.key]}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      filters: {
                        ...prev.filters,
                        [filter.key]: e.target.checked,
                      },
                    }))
                  }
                />
                {filter.label || filter.key} {filter.isRequired && <span style={{ color: "red" }}>*</span>}
              </label>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const sectionRenderers = {
    categorySeo: renderCategorySeo,
    keywordsTags: renderKeywordsTags,
    displaySeo: renderDisplaySeo,
    searchSeo: renderSearchSeo,
  };

  return (
    <>
      {sections.map((section, idx) => {
        const refKey = getSectionRefKey(2, section.key);
        const isCollapsed = collapsedSections[refKey] ?? (section.key !== "categorySeo");
        const isDisabled = getSectionIsDisabled(2, section.key);

        return (
          <div key={section.key}>
            <BusinessFormSection
              step={2}
              sectionKey={section.key}
              title={section.title}
              subtitle={section.subtitle}
              isCollapsed={isCollapsed}
              isDisabled={isDisabled}
              onToggleCollapse={() => toggleSectionCollapsed(2, section.key)}
              onAdvance={() => handleSectionAdvance(2, section.key)}
              showAdvanceButton={true}
            >
              {sectionRenderers[section.key]()}
            </BusinessFormSection>
            {idx < sections.length - 1 && <div className={cx("form-divider")}></div>}
          </div>
        );
      })}
    </>
  );
};

export default BusinessFormStep2;
