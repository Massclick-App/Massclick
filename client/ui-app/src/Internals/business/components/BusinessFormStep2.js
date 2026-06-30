import React from "react";
import { Autocomplete, TextField } from "@mui/material";
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
  dispatch,
  businessCategorySearch,
  editMode,
  saveSectionData,
  sectionSavingState,
}) => {
  const [categorySearchInput, setCategorySearchInput] = React.useState("");

  const handleCategorySearch = (event, value) => {
    console.log("🔍 handleCategorySearch called with value:", value);
    console.log("   searchCategory:", searchCategory);
    console.log("   category length:", category?.length);
    setCategorySearchInput(value);

    // Only search if input is not empty and is a partial search (doesn't contain " — " which is the full label format)
    if (value && value.trim().length > 0 && !value.includes(" — ") && dispatch) {
      console.log("   → Dispatching businessCategorySearch");
      dispatch(businessCategorySearch(value));
    } else if (value && value.includes(" — ")) {
      console.log("   → Skipped search (full label detected, this is post-selection)");
    }
  };

  // Get all available options - merge search results with full category list to avoid losing searched categories
  const allCategoryOptions = React.useMemo(() => {
    if (categorySearchInput && searchCategory?.length > 0) {
      // When searching, show search results
      console.log("📋 Using searchCategory results");
      return searchCategory;
    }
    // When not searching, show all categories AND keep any previously searched categories in the list
    const mergedCategories = [...(category || [])];
    if (searchCategory?.length > 0) {
      // Add search results that aren't already in category list
      searchCategory.forEach(searched => {
        if (!mergedCategories.find(c => c.category === searched.category)) {
          mergedCategories.push(searched);
        }
      });
      console.log("📋 Merged search results with category");
    }
    console.log("📋 Using merged category list");
    return mergedCategories;
  }, [categorySearchInput, searchCategory, category]);

  console.log("📋 allCategoryOptions computed:", {
    categorySearchInput,
    hasSuggestion: !!searchCategory?.length,
    optionsLength: allCategoryOptions?.length
  });

  // Find the selected category object from all available options
  const getSelectedCategory = () => {
    const selected = formData.category ? allCategoryOptions.find((c) => c.category === formData.category) : null;
    console.log("🎯 getSelectedCategory:", {
      formDataCategory: formData.category,
      foundCategory: selected ? { category: selected.category } : null,
      allOptionsLength: allCategoryOptions?.length
    });
    if (!formData.category) return null;
    return selected || { category: formData.category };
  };
  const sections = [
    { key: "categorySeo", title: "Category & SEO", subtitle: "Define the classification and search basics" },
    { key: "keywordsTags", title: "Keywords & Tags", subtitle: "Seed terms for internal and external search" },
    { key: "displaySeo", title: "Display & SEO", subtitle: "How the listing appears to visitors" },
    { key: "searchSeo", title: "Search Engine Optimization", subtitle: "Meta details and filters" },
    { key: "preview", title: "Preview & Submit", subtitle: "Review all details before creating your business" },
  ];

  React.useEffect(() => {
    if (!setCategoryKeywordSuggestions) {
      return;
    }

    const selected = category.find((cat) => cat.category === formData.category);
    const nextSuggestions = Array.isArray(selected?.keywords) ? selected.keywords : [];

    setCategoryKeywordSuggestions((previousSuggestions) => {
      const normalizedPrevious = Array.isArray(previousSuggestions) ? previousSuggestions : [];

      if (
        normalizedPrevious.length === nextSuggestions.length &&
        normalizedPrevious.every((keyword, index) => keyword === nextSuggestions[index])
      ) {
        return normalizedPrevious;
      }

      return nextSuggestions;
    });
  }, [formData.category, category, setCategoryKeywordSuggestions]);

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
          <Autocomplete
            options={allCategoryOptions}
            getOptionLabel={(option) => option.category || ""}
            value={getSelectedCategory()}
            onChange={(event, newValue) => {
              console.log("✅ Category Autocomplete onChange:", {
                newValue: newValue ? newValue.category : null,
                currentFormDataCategory: formData.category
              });
              const nextData = {
                ...formData,
                category: newValue ? newValue.category : "",
                keywords: [],
                slug: newValue?.slug || "",
                seoTitle: newValue?.seoTitle || "",
                seoDescription: newValue?.seoDescription || "",
                title: newValue?.title || "",
                description: newValue?.description || ""
              };
              setFormData(nextData);
              if (setCategoryKeywordSuggestions && newValue?.keywords) {
                setCategoryKeywordSuggestions(Array.isArray(newValue.keywords) ? newValue.keywords : []);
              } else {
                setCategoryKeywordSuggestions([]);
              }
              updateLiveValidation(nextData, ["category", "keywords", "slug", "seoTitle", "seoDescription", "title", "description"]);
              setCategorySearchInput("");
            }}
            onInputChange={handleCategorySearch}
            isOptionEqualToValue={(option, value) => option.category === value.category}
            freeSolo={false}
            disableClearable={false}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search and select a category"
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    padding: "6px !important",
                    borderRadius: "6px",
                    fontSize: "14px",
                  },
                }}
              />
            )}
            slotProps={{
              paper: {
                sx: {
                  maxHeight: "300px",
                  borderRadius: "6px",
                  border: "1px solid #e5e5e5",
                },
              },
            }}
          />
          {renderFieldError("category")}
        </div>
      </div>
    </>
  );

  const renderKeywordsTags = () => {
    const selectedKeywords = Array.isArray(formData.keywords) ? formData.keywords : [];
    const availableSuggestions = (categoryKeywordSuggestions || []).filter(
      (kw) => !selectedKeywords.some((sel) => String(sel).toLowerCase() === String(kw).toLowerCase())
    );

    const addKeywordChip = (keyword) => {
      const clean = keyword.trim().toLowerCase();
      if (!clean) return;
      if (selectedKeywords.some((kw) => String(kw).toLowerCase() === clean)) return;

      const updated = [...selectedKeywords, clean];
      setFormData((prev) => ({ ...prev, keywords: updated }));
      if (updateLiveValidation) {
        updateLiveValidation({ ...formData, keywords: updated }, "keywords");
      }
      setInputKeyword("");
    };

    const removeKeywordChip = (keyword) => {
      const updated = selectedKeywords.filter((kw) => kw !== keyword);
      setFormData((prev) => ({ ...prev, keywords: updated }));
      if (updateLiveValidation) {
        updateLiveValidation({ ...formData, keywords: updated }, "keywords");
      }
    };

    const addAllSuggestions = () => {
      const updated = [...new Set([...selectedKeywords, ...availableSuggestions])];
      setFormData((prev) => ({ ...prev, keywords: updated }));
      if (updateLiveValidation) {
        updateLiveValidation({ ...formData, keywords: updated }, "keywords");
      }
    };

    return (
      <>
        {renderSectionIntro(
          "Keyword expansion",
          "Use category suggestions or add custom keywords to improve discoverability in search.",
          "Search breadth"
        )}

        <div className={fieldClass("field-span-full")}>
          {/* Category Suggestions Panel */}
          {categoryKeywordSuggestions && categoryKeywordSuggestions.length > 0 && (
            <div className={cx("keyword-suggestion-panel")}>
              <div className={cx("keyword-panel-header")}>
                <span style={{ fontWeight: 600 }}>Category keyword suggestions</span>
                <button
                  type="button"
                  onClick={addAllSuggestions}
                  disabled={availableSuggestions.length === 0}
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: availableSuggestions.length > 0 ? "#ff8c00" : "#ccc",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: availableSuggestions.length > 0 ? "pointer" : "not-allowed",
                  }}
                >
                  Add all
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                {availableSuggestions.length > 0 ? (
                  availableSuggestions.map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => addKeywordChip(keyword)}
                      style={{
                        padding: "6px 12px",
                        fontSize: "13px",
                        fontWeight: 500,
                        background: "#f0f0f0",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "#fff9f0";
                        e.currentTarget.style.borderColor = "#ff8c00";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = "#f0f0f0";
                        e.currentTarget.style.borderColor = "#ddd";
                      }}
                    >
                      + {keyword}
                    </button>
                  ))
                ) : (
                  <span style={{ fontSize: "13px", color: "#999" }}>All suggestions are selected.</span>
                )}
              </div>
            </div>
          )}

          {/* Selected Keywords Panel */}
          <div className={cx("selected-keywords-panel")}>
            <div className={cx("keyword-panel-header")}>
              <span style={{ fontWeight: 600 }}>Selected keywords</span>
              <small style={{ fontSize: "12px", color: "#666" }}>{selectedKeywords.length} selected</small>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
              {selectedKeywords.length > 0 ? (
                selectedKeywords.map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => removeKeywordChip(keyword)}
                    title={`Remove ${keyword}`}
                    style={{
                      padding: "6px 12px",
                      fontSize: "13px",
                      fontWeight: 500,
                      background: "#ff8c00",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#e67e00")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "#ff8c00")}
                  >
                    <span>{keyword}</span>
                    <span style={{ fontWeight: 700, cursor: "pointer" }}>×</span>
                  </button>
                ))
              ) : (
                <span style={{ fontSize: "13px", color: "#999" }}>No keywords selected yet.</span>
              )}
            </div>
          </div>

          {/* Custom Keyword Input */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={inputKeyword || ""}
              onChange={(e) => setInputKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeywordChip(inputKeyword);
                }
              }}
              placeholder="Type a custom keyword"
              className={cx("text-input")}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={() => addKeywordChip(inputKeyword)}
              className={cx("step-nav-button")}
              style={{ padding: "10px 20px", minWidth: "100px" }}
            >
              Add
            </button>
          </div>
          <p className={cx("helper-note")}>Press Enter or click Add to add custom keywords.</p>
        </div>
      </>
    );
  };

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
          <>
            <div className={fieldClass("field-span-full")}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#333", marginBottom: "16px", paddingBottom: "12px", borderBottom: "2px solid #ff8c00" }}>
                Category Filters {formData.category && <span style={{ fontSize: "14px", color: "#666", fontWeight: 500 }}>— {formData.category}</span>}
              </h3>
            </div>

            {categoryFilterConfig.map((filter) => {
              const filterValue = getFilterValue ? getFilterValue(filter) : formData.filters?.[filter.key];

              // CHECKBOX / TOGGLE type
              if (filter.type === "checkbox" || filter.type === "toggle" || !filter.type) {
                return (
                  <div key={filter.key} className={fieldClass()}>
                    <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "#f9f9f9", borderRadius: "6px", border: "1px solid #e5e5e5", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f0f0"; e.currentTarget.style.borderColor = "#ff8c00"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#f9f9f9"; e.currentTarget.style.borderColor = "#e5e5e5"; }}>
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
                        style={{ width: "18px", height: "18px", accentColor: "#ff8c00", cursor: "pointer" }}
                      />
                      <span style={{ fontWeight: 600, fontSize: "14px", color: "#333" }}>
                        {filter.label || filter.key}
                        {filter.isRequired && <span style={{ color: "#dc2626", marginLeft: "4px" }}>*</span>}
                      </span>
                    </label>
                  </div>
                );
              }

              // MULTISELECT type - Chip based
              if (filter.type === "multiselect") {
                const options = Array.isArray(filter.options) ? filter.options : [];
                const selectedValues = Array.isArray(filterValue) ? filterValue : [];

                return (
                  <div key={filter.key} className={fieldClass("field-span-full")}>
                    <label className={cx("input-label")}>
                      {filter.label || filter.key}
                      {filter.isRequired && <span style={{ color: "#dc2626" }}>*</span>}
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                      {options.map((opt) => {
                        const isSelected = selectedValues.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              const updated = isSelected
                                ? selectedValues.filter((v) => v !== opt)
                                : [...selectedValues, opt];
                              if (handleFilterChange) {
                                handleFilterChange(filter.key, updated);
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  filters: { ...prev.filters, [filter.key]: updated },
                                }));
                              }
                            }}
                            style={{
                              padding: "8px 14px",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: isSelected ? 600 : 500,
                              background: isSelected ? "#ff8c00" : "#f0f0f0",
                              color: isSelected ? "#fff" : "#333",
                              border: isSelected ? "2px solid #ff8c00" : "2px solid #e5e5e5",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = "#f9f9f9";
                                e.currentTarget.style.borderColor = "#ff8c00";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = "#f0f0f0";
                                e.currentTarget.style.borderColor = "#e5e5e5";
                              }
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // RADIO type - Button group
              if (filter.type === "radio") {
                const options = Array.isArray(filter.options) ? filter.options : [];

                return (
                  <div key={filter.key} className={fieldClass("field-span-full")}>
                    <label className={cx("input-label")}>
                      {filter.label || filter.key}
                      {filter.isRequired && <span style={{ color: "#dc2626" }}>*</span>}
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {options.map((opt) => {
                        const isSelected = filterValue === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              if (handleFilterChange) {
                                handleFilterChange(filter.key, opt);
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  filters: { ...prev.filters, [filter.key]: opt },
                                }));
                              }
                            }}
                            style={{
                              padding: "8px 14px",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: isSelected ? 600 : 500,
                              background: isSelected ? "#ff8c00" : "#f0f0f0",
                              color: isSelected ? "#fff" : "#333",
                              border: isSelected ? "2px solid #ff8c00" : "2px solid #e5e5e5",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = "#f9f9f9";
                                e.currentTarget.style.borderColor = "#ff8c00";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = "#f0f0f0";
                                e.currentTarget.style.borderColor = "#e5e5e5";
                              }
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // RANGE type - Slider with value display
              if (filter.type === "range") {
                const numValue = Number.isFinite(Number(filterValue)) ? Number(filterValue) : (filter.min ?? 0);
                const minVal = filter.min ?? 0;
                const maxVal = filter.max ?? 100;
                const unit = filter.unit || "";

                return (
                  <div key={filter.key} className={fieldClass("field-span-full")}>
                    <label className={cx("input-label")}>
                      {filter.label || filter.key}
                      {filter.isRequired && <span style={{ color: "#dc2626" }}>*</span>}
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <input
                        type="range"
                        min={minVal}
                        max={maxVal}
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
                        style={{ flex: 1, height: "6px", borderRadius: "3px", background: "#e5e5e5", outline: "none", accentColor: "#ff8c00" }}
                      />
                      <span style={{ fontWeight: 700, minWidth: "70px", textAlign: "right", fontSize: "14px", color: "#ff8c00", padding: "6px 12px", background: "#fffbf7", borderRadius: "4px", border: "1px solid #fed7aa" }}>
                        {numValue}{unit}
                      </span>
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
            </>
          )}
      </div>
    </>
  );

  const renderPreview = () => {
    console.log("DEBUG: renderPreview called, formData =", formData);
    return (
    <>
      {renderSectionIntro(
        "Final review",
        "Review all the details you've entered. Everything looks good? Click Submit to create your business listing.",
        "Ready to go"
      )}

      <div className={cx("section-grid")}>
        {/* DEBUG: Show formData JSON */}
        <div className={fieldClass("field-span-full", "field-surface")} style={{ background: "#fffbf7", padding: "12px", borderRadius: "6px", marginBottom: "16px", border: "1px solid #fed7aa" }}>
          <small style={{ color: "#ff8c00", fontSize: "11px", fontWeight: 700 }}>✓ DEBUG - Form Data Loaded:</small>
          <pre style={{ fontSize: "10px", overflow: "auto", maxHeight: "150px", margin: "6px 0 0 0", background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #fed7aa" }}>
            {Object.keys(formData).filter(k => formData[k]).slice(0, 15).map(k => `${k}: ${JSON.stringify(formData[k]).substring(0, 50)}`).join('\n')}
          </pre>
        </div>

        {/* Basic Business Details */}
        {formData.businessName && (
          <div className={fieldClass("field-span-full", "field-surface")}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", color: "#333" }}>📋 Business Profile</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
              <div>
                <small style={{ color: "#666", fontSize: "12px" }}>Business Name</small>
                <p style={{ margin: "4px 0 0 0", fontSize: "15px", fontWeight: 600, color: "#ff8c00" }}>{formData.businessName}</p>
              </div>
              <div>
                <small style={{ color: "#666", fontSize: "12px" }}>Location</small>
                <p style={{ margin: "4px 0 0 0", fontSize: "15px", fontWeight: 600 }}>{formData.location || "—"}</p>
              </div>
              <div>
                <small style={{ color: "#666", fontSize: "12px" }}>Contact</small>
                <p style={{ margin: "4px 0 0 0", fontSize: "14px" }}>{formData.contact || formData.email || "—"}</p>
              </div>
              <div>
                <small style={{ color: "#666", fontSize: "12px" }}>Category</small>
                <p style={{ margin: "4px 0 0 0", fontSize: "15px", fontWeight: 600 }}>{formData.category || "—"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Keywords */}
        {formData.keywords && formData.keywords.length > 0 && (
          <div className={fieldClass("field-span-full", "field-surface")}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", color: "#333" }}>🔑 Keywords</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {formData.keywords.map((kw) => (
                <span key={kw} style={{ padding: "6px 12px", background: "#fffbf7", border: "1px solid #fed7aa", borderRadius: "6px", fontSize: "13px", fontWeight: 500, color: "#ff8c00" }}>
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Images Preview */}
        {(formData.bannerImage || formData.logoImage) && (
          <div className={fieldClass("field-span-full", "field-surface")}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", color: "#333" }}>🖼️ Business Images</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
              {formData.bannerImage && (
                <div>
                  <small style={{ color: "#666", fontSize: "12px" }}>Banner Image</small>
                  <img src={formData.bannerImage} alt="Banner" style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "6px", marginTop: "8px", border: "1px solid #e5e7eb" }} />
                </div>
              )}
              {formData.logoImage && (
                <div>
                  <small style={{ color: "#666", fontSize: "12px" }}>Logo</small>
                  <img src={formData.logoImage} alt="Logo" style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "6px", marginTop: "8px", border: "1px solid #e5e7eb" }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Display Details */}
        {(formData.title || formData.description) && (
          <div className={fieldClass("field-span-full", "field-surface")}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", color: "#333" }}>📝 Display Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {formData.title && (
                <div>
                  <small style={{ color: "#666", fontSize: "12px" }}>Title</small>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", fontWeight: 500 }}>{formData.title}</p>
                </div>
              )}
              {formData.description && (
                <div>
                  <small style={{ color: "#666", fontSize: "12px" }}>Description</small>
                  <p style={{ margin: "4px 0 0 0", fontSize: "13px", lineHeight: "1.5", color: "#555" }}>{formData.description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SEO Details */}
        {(formData.seoTitle || formData.seoDescription || formData.slug) && (
          <div className={fieldClass("field-span-full", "field-surface")}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", color: "#333" }}>🔍 SEO Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {formData.seoTitle && (
                <div>
                  <small style={{ color: "#666", fontSize: "12px" }}>SEO Title</small>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px" }}>{formData.seoTitle}</p>
                </div>
              )}
              {formData.seoDescription && (
                <div>
                  <small style={{ color: "#666", fontSize: "12px" }}>SEO Description</small>
                  <p style={{ margin: "4px 0 0 0", fontSize: "13px", lineHeight: "1.5", color: "#555" }}>{formData.seoDescription}</p>
                </div>
              )}
              {formData.slug && (
                <div>
                  <small style={{ color: "#666", fontSize: "12px" }}>URL Slug</small>
                  <p style={{ margin: "4px 0 0 0", fontSize: "13px", fontFamily: "monospace", background: "#f5f5f5", padding: "6px 10px", borderRadius: "4px" }}>{formData.slug}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!formData.businessName && (
          <div className={fieldClass("field-span-full")} style={{ textAlign: "center", padding: "40px 20px", color: "#999" }}>
            <p>No data entered yet. Complete the form sections above to see preview.</p>
          </div>
        )}
      </div>
    </>
    );
  };

  const sectionRenderers = {
    categorySeo: renderCategorySeo,
    keywordsTags: renderKeywordsTags,
    displaySeo: renderDisplaySeo,
    searchSeo: renderSearchSeo,
    preview: renderPreview,
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
            showAdvanceButton={!editMode && !!navigation}
            onAdvance={() => handleSectionAdvance(2, activeSection_obj.key)}
            advanceLabel={navigation?.label || "Next"}
            advanceType={navigation?.type === "submit" ? "submit" : "next"}
            showSaveButton={editMode}
            onSave={() => saveSectionData(activeSection_obj.key)}
            isSaving={sectionSavingState[activeSection_obj.key] || false}
          >
            {sectionRenderers[activeSection_obj.key]()}
          </BusinessFormSection>
        </div>
      )}
    </>
  );
};

export default BusinessFormStep2;
