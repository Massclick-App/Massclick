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
  handleChange,
  handleSectionAdvance,
  getSectionNavigation,
  getSectionRefKey,
  getSectionIsDisabled,
  getInputClassName,
  renderFieldError,
  categoryKeywordSuggestions,
  inputKeyword,
  setFormData,
  activeSection,
  addKeywordToForm,
  removeKeywordFromForm,
  addKeywordsToForm,
  setInputKeyword,
  setCategoryKeywordSuggestions,
  handleFilterChange,
  getFilterValue,
  clearForceBypassForFields,
  updateLiveValidation,
  searchCategory,
}) => {
  const sections = [
    { key: "categorySeo", title: "Category & SEO", subtitle: "Define the classification and search basics" },
    { key: "keywordsTags", title: "Keywords & Tags", subtitle: "Seed terms for internal and external search" },
    { key: "displaySeo", title: "Display & SEO", subtitle: "How the listing appears to visitors" },
    { key: "searchSeo", title: "Search Engine Optimization", subtitle: "Meta details and filters" },
  ];

  // Handle category changes: auto-fill SEO fields and load keyword suggestions
  React.useEffect(() => {
    if (!formData.category) {
      if (setCategoryKeywordSuggestions) setCategoryKeywordSuggestions([]);
      return;
    }

    const selected = category.find(cat => cat.category === formData.category);

    if (selected) {
      // Auto-fill SEO fields from selected category
      const nextData = {
        ...formData,
        slug: selected.slug || formData.slug,
        seoTitle: selected.seoTitle || formData.seoTitle,
        seoDescription: selected.seoDescription || formData.seoDescription,
        title: selected.title || formData.title,
        description: selected.description || formData.description,
      };

      // Only update if something actually changed
      if (JSON.stringify(nextData) !== JSON.stringify(formData)) {
        setFormData(nextData);
        if (updateLiveValidation) {
          updateLiveValidation(nextData, ['slug', 'seoTitle', 'seoDescription', 'title', 'description']);
        }
      }

      // Load keyword suggestions for this category
      if (setCategoryKeywordSuggestions && Array.isArray(selected.keywords)) {
        setCategoryKeywordSuggestions(selected.keywords);
      }
    }
  }, [formData.category, category, setFormData, setCategoryKeywordSuggestions, updateLiveValidation, formData]);

  const renderSectionIntro = (eyebrow, summary, stat) => (
    <div className={cx("section-intro")}>
      <div className={cx("section-intro-copy")}>
        <p className={cx("section-eyebrow")}>{eyebrow}</p>
        <p className={cx("section-summary")}>{summary}</p>
      </div>
      {stat && <div className={cx("section-stat")}>{stat}</div>}
    </div>
  );

  const fieldClass = (...extra) => cx("form-input-group", "field-card", ...extra);

  const renderCategorySeo = () => (
    <>
      {renderSectionIntro(
        "Category setup",
        "Choose the best category first, then let the keyword field amplify the search terms that should bring this business up in results.",
        "Core search"
      )}

      <div className={cx("section-grid", "section-grid-2")}>
        <div className={fieldClass()}>
          <label className={cx("input-label")}>Category *</label>
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

        <div className={fieldClass()}>
          <label className={cx("input-label")}>Keywords</label>
          <Autocomplete
            multiple
            options={categoryKeywordSuggestions}
            value={formData.keywords || []}
            onChange={(event, newValue) => {
              setFormData((prev) => ({ ...prev, keywords: newValue }));
              if (updateLiveValidation) {
                updateLiveValidation({ ...formData, keywords: newValue }, 'keywords');
              }
            }}
            onInputChange={(event, value, reason) => {
              if (reason === "input") {
                if (setInputKeyword) setInputKeyword(value);
              } else if (reason === "clear") {
                if (setInputKeyword) setInputKeyword("");
              }
            }}
            inputValue={inputKeyword || ""}
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
      </div>
    </>
  );

  const renderKeywordsTags = () => (
    <>
      {renderSectionIntro(
        "Keyword expansion",
        "Use this area for extra terms that do not fit in the main keyword picker. Keep the phrases clean and discoverable.",
        "Search breadth"
      )}

      <div className={fieldClass("field-span-full")}>
        <label className={cx("input-label")}>Additional Tags (comma-separated)</label>
        <TextField
          multiline
          rows={4}
          placeholder="Add more tags or keywords separated by commas..."
          value={formData.keywords?.join(", ") || ""}
          onChange={(e) => {
            const input = e.target.value;
            const keywords = input
              .split(",")
              .map(kw => kw.trim())
              .filter(kw => kw.length > 0)
              .map(kw => kw.toLowerCase());

            setFormData((prev) => ({
              ...prev,
              keywords: [...new Set(keywords)] // Remove duplicates
            }));

            if (updateLiveValidation) {
              updateLiveValidation(
                { ...formData, keywords: [...new Set(keywords)] },
                'keywords'
              );
            }
          }}
          fullWidth
        />
        <p className={cx("helper-note")}>Keywords separated by commas. Duplicates are automatically removed.</p>
      </div>
    </>
  );

  const renderDisplaySeo = () => (
    <>
      {renderSectionIntro(
        "Display copy",
        "Shape the title and description as customers will actually see them. A clear, specific display block usually feels more premium.",
        "Customer-facing"
      )}

      <div className={cx("section-grid", "section-grid-2")}>
        <div className={fieldClass()}>
          <label className={cx("input-label")}>Display Title</label>
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

        <div className={fieldClass()}>
          <label className={cx("input-label")}>Display Description</label>
          <textarea
            name="description"
            className={getInputClassName("textarea-input", "description")}
            value={formData.description}
            rows={4}
            onChange={handleChange}
            placeholder="A brief description of your business"
          />
          {renderFieldError("description")}
        </div>
      </div>
    </>
  );

  const renderSearchSeo = () => (
    <>
      {renderSectionIntro(
        "Search details",
        "Finish with metadata and flags that help the listing behave well in search and category filters.",
        "Metadata"
      )}

      <div className={cx("section-grid", "section-grid-2")}>
        <div className={fieldClass()}>
          <label className={cx("input-label")}>SEO Title</label>
          <input
            type="text"
            name="seoTitle"
            className={getInputClassName("text-input", "seoTitle")}
            value={formData.seoTitle}
            onChange={handleChange}
            placeholder="Meta title for search engines (50-60 characters)"
          />
          <small className={cx("helper-note")}>
            {formData.seoTitle.length}/60 characters
          </small>
          {renderFieldError("seoTitle")}
        </div>

        <div className={fieldClass()}>
          <label className={cx("input-label")}>SEO Description</label>
          <textarea
            name="seoDescription"
            className={getInputClassName("textarea-input", "seoDescription")}
            value={formData.seoDescription}
            rows={3}
            onChange={handleChange}
            placeholder="Meta description for search engines (150-160 characters)"
          />
          <small className={cx("helper-note")}>
            {formData.seoDescription.length}/160 characters
          </small>
          {renderFieldError("seoDescription")}
        </div>

        <div className={fieldClass("field-span-full")}>
          <label className={cx("input-label")}>URL Slug</label>
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
          <div className={fieldClass("field-span-full", "field-surface")}>
            <label className={cx("input-label")}>Category Filters</label>
            <div className={cx("filter-config-container")} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {categoryFilterConfig.map((filter) => {
                const filterValue = getFilterValue ? getFilterValue(filter) : formData.filters?.[filter.key];

                // CHECKBOX type
                if (filter.type === "checkbox" || !filter.type) {
                  return (
                    <label key={filter.key} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={!!filterValue}
                        onChange={(e) => {
                          if (handleFilterChange) {
                            handleFilterChange(filter.key, e.target.checked);
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              filters: { ...prev.filters, [filter.key]: e.target.checked },
                            }));
                          }
                        }}
                      />
                      {filter.label || filter.key} {filter.isRequired && <span style={{ color: "#dc2626" }}>*</span>}
                    </label>
                  );
                }

                // MULTISELECT type
                if (filter.type === "multiselect") {
                  const options = Array.isArray(filter.options) ? filter.options : [];
                  const selectedValues = Array.isArray(filterValue) ? filterValue : [];

                  return (
                    <div key={filter.key} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff" }}>
                      <label style={{ fontWeight: 600, marginBottom: "8px", display: "block" }}>
                        {filter.label || filter.key} {filter.isRequired && <span style={{ color: "#dc2626" }}>*</span>}
                      </label>
                      <select
                        multiple
                        value={selectedValues}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          if (handleFilterChange) {
                            handleFilterChange(filter.key, selected);
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              filters: { ...prev.filters, [filter.key]: selected },
                            }));
                          }
                        }}
                        style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                      >
                        {options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  );
                }

                // RADIO type
                if (filter.type === "radio") {
                  const options = Array.isArray(filter.options) ? filter.options : [];

                  return (
                    <div key={filter.key} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff" }}>
                      <label style={{ fontWeight: 600, marginBottom: "8px", display: "block" }}>
                        {filter.label || filter.key} {filter.isRequired && <span style={{ color: "#dc2626" }}>*</span>}
                      </label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {options.map((opt) => (
                          <label key={opt} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                            <input
                              type="radio"
                              name={filter.key}
                              value={opt}
                              checked={filterValue === opt}
                              onChange={(e) => {
                                if (handleFilterChange) {
                                  handleFilterChange(filter.key, e.target.value);
                                } else {
                                  setFormData((prev) => ({
                                    ...prev,
                                    filters: { ...prev.filters, [filter.key]: e.target.value },
                                  }));
                                }
                              }}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                }

                // RANGE type
                if (filter.type === "range") {
                  const numValue = Number.isFinite(Number(filterValue)) ? Number(filterValue) : (filter.min ?? 0);

                  return (
                    <div key={filter.key} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff" }}>
                      <label style={{ fontWeight: 600, marginBottom: "8px", display: "block" }}>
                        {filter.label || filter.key} {filter.isRequired && <span style={{ color: "#dc2626" }}>*</span>}
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <input
                          type="range"
                          min={filter.min ?? 0}
                          max={filter.max ?? 100}
                          value={numValue}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (handleFilterChange) {
                              handleFilterChange(filter.key, val);
                            } else {
                              setFormData((prev) => ({
                                ...prev,
                                filters: { ...prev.filters, [filter.key]: val },
                              }));
                            }
                          }}
                          style={{ flex: 1 }}
                        />
                        <span style={{ fontWeight: 600, minWidth: "60px" }}>{numValue}</span>
                      </div>
                    </div>
                  );
                }

                // Default: render as checkbox if type is unknown
                return (
                  <label key={filter.key} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={!!filterValue}
                      onChange={(e) => {
                        if (handleFilterChange) {
                          handleFilterChange(filter.key, e.target.checked);
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            filters: { ...prev.filters, [filter.key]: e.target.checked },
                          }));
                        }
                      }}
                    />
                    {filter.label || filter.key} {filter.isRequired && <span style={{ color: "#dc2626" }}>*</span>}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );

  const sectionRenderers = {
    categorySeo: renderCategorySeo,
    keywordsTags: renderKeywordsTags,
    displaySeo: renderDisplaySeo,
    searchSeo: renderSearchSeo,
  };

  const activeSection_obj = sections.find((s) => s.key === activeSection);
  const navigation = activeSection_obj && getSectionNavigation ? getSectionNavigation(2, activeSection_obj.key) : null;
  const isDisabled = activeSection_obj && getSectionIsDisabled ? getSectionIsDisabled(2, activeSection_obj.key) : false;

  return (
    <>
      {activeSection_obj && (
        <div>
          <BusinessFormSection
            step={2}
            sectionKey={activeSection_obj.key}
            title={activeSection_obj.title}
            subtitle={activeSection_obj.subtitle}
            isCollapsed={false}
            isDisabled={isDisabled}
            onToggleCollapse={() => {}}
            showAdvanceButton={!!navigation}
            onAdvance={() => handleSectionAdvance(2, activeSection_obj.key)}
            advanceLabel={navigation?.label || "Next"}
            advanceType={navigation?.type === "submit" ? "submit" : "next"}
          >
            {sectionRenderers[activeSection_obj.key]()}
          </BusinessFormSection>
        </div>
      )}
    </>
  );
};

export default BusinessFormStep2;
