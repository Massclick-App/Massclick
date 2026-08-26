export const getCorrectionSuggestionOption = (searchIntent) => {
  if (
    (!searchIntent?.shouldShowNotice && !searchIntent?.shouldShowSuggestion) ||
    !searchIntent?.correctedQuery
  ) {
    return null;
  }

  const correctedQuery = String(searchIntent.correctedQuery || "").trim();
  const resolvedCategory = String(searchIntent.resolvedCategory || "").trim();
  if (!correctedQuery) return null;

  return {
    type: "correction",
    label: `Did you mean ${correctedQuery}?`,
    value: correctedQuery,
    subLabel: resolvedCategory ? `Showing ${resolvedCategory}` : "Search corrected spelling",
  };
};

export const getSearchSuggestionValue = (option) => {
  if (typeof option === "string") return option;
  if (!option || typeof option !== "object") return "";
  return String(
    option.value ||
    option.category ||
    option.categoryName ||
    option.name ||
    option.label ||
    ""
  ).trim();
};
