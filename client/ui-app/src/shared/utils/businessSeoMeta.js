/**
 * Title / description for a business detail page.
 *
 * Deliberate parallel of server/helper/businessList/businessSeoMeta.js (this
 * app can't import server code). SSR sets the tags on first load; this keeps
 * them identical after client-side navigation. Change both together.
 *
 * Stored seoTitle/seoDescription are usually pre-filled from the category and
 * shared by every business in it, so they're used only when they actually
 * name this business.
 */
const LEADING_FILLER = new Set(["the", "dr", "mr", "mrs", "ms", "sri", "shri", "shree", "sree", "new", "m", "s"]);

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

const words = (text = "") =>
  String(text).toLowerCase().replace(/['’]/g, "").split(/[^a-z0-9]+/).filter(Boolean);

const stem = (word) => word.replace(/(ies)$/, "y").replace(/(es|s)$/, "");

const titleCaseWords = (text = "") =>
  clean(text).replace(/\b[a-z]/g, (c) => c.toUpperCase());

const keyNameWord = (business = {}) => {
  const categoryStems = new Set(words(business.category).map(stem));
  return words(business.businessName || business.name).find(
    (word) => word.length >= 2 && !LEADING_FILLER.has(word) && !categoryStems.has(stem(word)),
  ) || "";
};

export const namesBusiness = (text, business = {}) => {
  const key = keyNameWord(business);
  if (!clean(text) || !key) return false;
  if (key.length < 5) return words(text).includes(key);
  return words(text).join("").includes(key);
};

const placeLabel = (business = {}, districtLabel = "") => {
  const master = business.masterLocation || {};
  const locality = clean(master.locality) || clean(master.ward) || clean(master.zone);
  const district = clean(districtLabel) || clean(master.district);
  if (locality && district && locality.toLowerCase() !== district.toLowerCase()) {
    return `${locality}, ${district}`;
  }
  return district || locality || clean(business.location);
};

export const buildBusinessSeoMeta = ({ business = {}, districtLabel = "" } = {}) => {
  const name = clean(business.businessName || business.name);
  const category = titleCaseWords(business.category);
  const place = placeLabel(business, districtLabel);

  const builtTitle = [name, category && place ? `${category} in ${place}` : category || place]
    .filter(Boolean)
    .join(" – ");
  const title = namesBusiness(business.seoTitle, business)
    ? clean(business.seoTitle)
    : `${builtTitle} | Massclick`;

  const description = namesBusiness(business.seoDescription, business)
    ? clean(business.seoDescription)
    : `${name}${place ? ` in ${place}` : ""}${category ? ` – ${category}` : ""}. Address, phone number, timings, photos and reviews on Massclick.`;

  return { title, description };
};

export const districtLabelFromSlug = (slug = "") =>
  titleCaseWords(String(slug || "").replace(/-/g, " "));
