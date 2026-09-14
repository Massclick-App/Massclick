/**
 * Title / description / keywords for a business detail page.
 *
 * `seoTitle` and `seoDescription` on most businesses are NOT about the
 * business: the listing form pre-fills them from the category ("Top
 * Photographers and Videographers Near Me"), so every photographer shares one
 * title. Serving that would give thousands of pages identical titles. A stored
 * value is used only when it actually names this business — it contains a
 * distinctive word from the business name that isn't just the category — and
 * otherwise a specific title is built from name + category + area.
 *
 * The client has a deliberate parallel implementation in
 * client/ui-app/src/shared/utils/businessSeoMeta.js (the SPA can't import
 * server code). Keep the two in step so SSR and client-side navigation agree.
 */
import businessListModel from "../../model/businessList/businessListModel.js";
import { parseBusinessUrlSegment } from "./businessUrl.js";

// Honorifics and filler that often lead a business name but say nothing
// about which business it is.
const LEADING_FILLER = new Set(["the", "dr", "mr", "mrs", "ms", "sri", "shri", "shree", "sree", "new", "m", "s"]);

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

const words = (text = "") =>
  String(text).toLowerCase().replace(/['’]/g, "").split(/[^a-z0-9]+/).filter(Boolean);

const stem = (word) => word.replace(/(ies)$/, "y").replace(/(es|s)$/, "");

const titleCaseWords = (text = "") =>
  clean(text).replace(/\b[a-z]/g, (c) => c.toUpperCase());

// The first word of the name that identifies this business rather than its
// trade: "Smile Dental Clinic" -> "smile", "Dr. Ramesh Dental Care" -> "ramesh".
const keyNameWord = (business = {}) => {
  const categoryStems = new Set(words(business.category).map(stem));
  return words(business.businessName || business.name).find(
    (word) => word.length >= 2 && !LEADING_FILLER.has(word) && !categoryStems.has(stem(word)),
  ) || "";
};

// True only when `text` names this business. Category-prefilled copy ("Find
// Local General Dentists and Dental Clinics") never contains the key word.
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
  const district = clean(districtLabel) || clean(business.masterLocation?.district);

  const builtTitle = [name, category && place ? `${category} in ${place}` : category || place]
    .filter(Boolean)
    .join(" – ");
  const title = namesBusiness(business.seoTitle, business)
    ? clean(business.seoTitle)
    : `${builtTitle} | Massclick`;

  const description = namesBusiness(business.seoDescription, business)
    ? clean(business.seoDescription)
    : `${name}${place ? ` in ${place}` : ""}${category ? ` – ${category}` : ""}. Address, phone number, timings, photos and reviews on Massclick.`;

  const keywords = [
    name,
    district && `${name} ${district}`,
    category && place && `${category} in ${place}`,
    category && district && `${category} ${district}`,
  ]
    .filter(Boolean)
    .map((k) => k.toLowerCase())
    .join(", ");

  return { title, description, keywords };
};

const SEO_PROJECTION = {
  businessName: 1,
  name: 1,
  category: 1,
  location: 1,
  masterLocation: 1,
  publicId: 1,
  seoTitle: 1,
  seoDescription: 1,
  // Hero photo + rating for the pre-React business shell (ssrMiddleware).
  bannerImageKey: 1,
  bannerImage: 1,
  // Two, not one: enough to tell the single-photo hero layout from the gallery one.
  businessImagesKey: { $slice: 2 },
  businessImages: { $slice: 2 },
  averageRating: 1,
};

// Resolves the trailing /business/:district/:slug-:publicId segment.
export const findBusinessForSeo = async (segment = "") => {
  const parsed = parseBusinessUrlSegment(segment);
  if (!parsed) return null;
  return businessListModel.findOne({ publicId: parsed.publicId }, SEO_PROJECTION).lean();
};
