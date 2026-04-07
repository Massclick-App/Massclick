
export const normalizeCategory = (value = "") => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z]/g, "")   
    .replace(/s$/, "");       
};
