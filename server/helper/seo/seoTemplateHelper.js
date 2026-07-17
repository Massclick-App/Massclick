import seoTemplateModel from "../../model/seoModel/seoTemplateModel.js";
import categoryModel from "../../model/category/categoryModel.js";
import masterLocationModel from "../../model/locationModel/masterLocationModel.js";
import { slugify } from "../../slugify.js";
import { renderTemplateString, renderFaqTemplate } from "./templateRenderer.js";

const titleCase = (text = "") =>
  text
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const escapeRegex = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ensureCategoryExists = async (categorySlug) => {
  const exists = await categoryModel
    .findOne({ slug: categorySlug, isActive: true })
    .lean();

  if (!exists) {
    throw new Error(
      `Category "${categorySlug}" does not exist. Please select a category from the suggestions.`
    );
  }
};

// Resolves a route location string (e.g. "tiruchirappalli") to the matching
// masterlocations district doc, then up to 2 zone docs under it, to source
// {location}/{zone1}/{zone2} tokens. Deliberately narrow (district-level
// only) rather than reusing the general-purpose location search resolver,
// so templates never accidentally source zone data from the wrong level.
export const resolveLocationTokens = async (locationText) => {
  if (!locationText) {
    return { location: null, locationSlug: null, zone1: null, zone2: null };
  }

  const districtDoc = await masterLocationModel
    .findOne({
      level: "district",
      district: new RegExp(`^${escapeRegex(locationText)}$`, "i"),
      isActive: true,
    })
    .lean();

  if (!districtDoc) {
    return {
      location: titleCase(locationText),
      locationSlug: slugify(locationText),
      zone1: null,
      zone2: null,
    };
  }

  const zoneDocs = await masterLocationModel
    .find({
      level: "zone",
      district: districtDoc.district,
      zone: { $ne: null },
      isActive: true,
    })
    .sort({ zone: 1 })
    .limit(2)
    .lean();

  return {
    location: titleCase(districtDoc.district),
    locationSlug: districtDoc.slug || slugify(districtDoc.district),
    zone1: zoneDocs[0] ? titleCase(zoneDocs[0].zone) : null,
    zone2: zoneDocs[1] ? titleCase(zoneDocs[1].zone) : null,
  };
};

const buildTokens = async ({ categorySlug, location }) => {
  const categoryDoc = await categoryModel
    .findOne({ slug: categorySlug, isActive: true })
    .lean();

  const locationTokens = await resolveLocationTokens(location);

  return {
    category: categoryDoc?.title || categoryDoc?.category || titleCase(categorySlug),
    locality: null,
    ...locationTokens,
  };
};

// Renders seoTemplates content in place of seoHelper.js's generic
// buildDynamicSeoMeta fallback — only used when no curated seodatas doc
// exists for the requested category+location (caller falls back further if
// this returns null).
export const renderSeoMetaFromTemplate = async ({ category, location }) => {
  try {
    const categorySlug = slugify(category);

    const template = await seoTemplateModel
      .findOne({ category: categorySlug, pageType: "category", isActive: true })
      .lean();

    if (!template) return null;

    const tokens = await buildTokens({ categorySlug, location });

    const canonical = tokens.locationSlug
      ? `https://massclick.in/${tokens.locationSlug}/${categorySlug}`
      : `https://massclick.in/${categorySlug}`;

    return {
      title: renderTemplateString(template.titleTemplate, tokens),
      description: renderTemplateString(template.descriptionTemplate, tokens),
      keywords: template.keywordsTemplate
        ? renderTemplateString(template.keywordsTemplate, tokens)
        : undefined,
      canonical,
      robots: "index, follow",
      generated: true,
      templateVersion: template.templateVersion,
    };
  } catch (error) {
    console.error("renderSeoMetaFromTemplate error:", error);
    return null;
  }
};

// Renders seoPageContents content (headerContent/pageContent/faq) — net-new
// capability for getSeoPageContentMetaService, which today just returns null
// when nothing curated matches.
export const renderSeoPageContentFromTemplate = async ({ category, location }) => {
  try {
    const categorySlug = slugify(category);

    const template = await seoTemplateModel
      .findOne({ category: categorySlug, pageType: "category", isActive: true })
      .lean();

    if (!template) return null;

    const tokens = await buildTokens({ categorySlug, location });

    return {
      pageType: "category",
      category: categorySlug,
      location: location || null,
      headerContent: renderTemplateString(template.headerTemplate, tokens),
      pageContent: renderTemplateString(template.bodyTemplate, tokens),
      faq: renderFaqTemplate(template.faqTemplate || [], tokens),
      generated: true,
      templateVersion: template.templateVersion,
    };
  } catch (error) {
    console.error("renderSeoPageContentFromTemplate error:", error);
    return null;
  }
};

// ===============================
// Admin CRUD
// ===============================

export const createSeoTemplate = async (data) => {
  if (!data.category || data.category.trim() === "") {
    throw new Error("Category is required");
  }

  data.category = slugify(data.category);
  await ensureCategoryExists(data.category);

  try {
    return await seoTemplateModel.create(data);
  } catch (error) {
    if (error.code === 11000) {
      throw new Error("A template already exists for this category");
    }
    throw error;
  }
};

export const getSeoTemplateByCategory = async ({ category }) => {
  const categorySlug = slugify(category);
  return await seoTemplateModel
    .findOne({ category: categorySlug, isActive: true })
    .lean();
};

export const viewAllSeoTemplates = async ({
  pageNo = 1,
  pageSize = 10,
  search = "",
  status = "all",
  sortBy = "createdAt",
  sortOrder = -1,
}) => {
  const query = {};

  if (status === "active") query.isActive = true;
  if (status === "inactive") query.isActive = false;

  if (search && search.trim() !== "") {
    const regex = new RegExp(search.trim(), "i");
    query.$or = [{ category: regex }, { titleTemplate: regex }];
  }

  const total = await seoTemplateModel.countDocuments(query);

  const sortQuery = { [sortBy]: sortOrder, _id: sortOrder };

  const list = await seoTemplateModel
    .find(query)
    .sort(sortQuery)
    .skip((pageNo - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return { list, total };
};

export const updateSeoTemplate = async (id, data) => {
  if (data.category) {
    data.category = slugify(data.category);
    await ensureCategoryExists(data.category);
  }

  const templateFieldChanged = [
    "titleTemplate",
    "descriptionTemplate",
    "keywordsTemplate",
    "headerTemplate",
    "bodyTemplate",
    "faqTemplate",
  ].some((field) => Object.prototype.hasOwnProperty.call(data, field));

  // MongoDB update documents can't mix plain field:value pairs with operator
  // expressions ($inc) at the top level — wrap fields in $set explicitly.
  const update = { $set: data };
  if (templateFieldChanged) {
    update.$inc = { templateVersion: 1 };
  }

  const seoTemplate = await seoTemplateModel.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });

  if (!seoTemplate) throw new Error("SEO template not found");

  return seoTemplate;
};

export const deleteSeoTemplate = async (id) => {
  const seoTemplate = await seoTemplateModel.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!seoTemplate) throw new Error("SEO template not found");

  return seoTemplate;
};
