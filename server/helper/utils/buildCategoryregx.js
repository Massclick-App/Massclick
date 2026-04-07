
import { normalizeCategory } from "./normalizeCategory.js";

export const buildCategoryRegex = (category) => {
  const base = normalizeCategory(category);
  return new RegExp(`^${base}(e|ion)?s?$`, "i");
};
