// helper/legal/legalDocumentHelper.js

import { ObjectId } from "mongodb";
import legalDocumentModel from "../../model/legal/legalDocumentModel.js";
import {
  LEGAL_DOCUMENT_TYPES,
  LEGAL_DOCUMENT_STATUSES,
} from "../../schema/legal/legalDocument.js";

const DEFAULT_LOCALE = "en";

// Tagged so the controller can answer 404 rather than 400 without matching on
// message text. Asking for a type that exists but hasn't been published yet is
// a missing resource, not a malformed request.
const notFound = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

const assertValidId = (id) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid legal document ID");
  }
};

const assertValidType = (type) => {
  if (!LEGAL_DOCUMENT_TYPES.includes(type)) {
    throw new Error(
      `Invalid document type. Expected one of: ${LEGAL_DOCUMENT_TYPES.join(", ")}`
    );
  }
};

const normalizeLocale = (locale) =>
  (locale || DEFAULT_LOCALE).toString().trim().toLowerCase() || DEFAULT_LOCALE;

// Headings are authored free-form; the key is what deep links hang off, so it
// has to be derived deterministically and stay stable across re-words when the
// author supplies one explicitly.
const slugifyHeading = (heading = "", index = 0) => {
  const slug = heading
    .toString()
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `section-${index + 1}`;
};

const normalizeSections = (rawSections) => {
  const sections = Array.isArray(rawSections) ? rawSections : [];

  return sections
    .map((section, index) => ({
      key: section?.key?.trim() || slugifyHeading(section?.heading, index),
      heading: section?.heading?.trim() || "",
      body: section?.body?.trim() || "",
      order: Number.isFinite(Number(section?.order))
        ? Number(section.order)
        : index,
    }))
    .filter((section) => section.heading && section.body && section.body !== "<p><br></p>")
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({ ...section, order: index }));
};

const buildActor = (authActor) => ({
  userId: authActor?.subjectId ? String(authActor.subjectId) : null,
  userName: authActor?.userName || authActor?.emailId || null,
});

const parseEffectiveDate = (value) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid effectiveDate");
  }
  return parsed;
};

const buildWritablePayload = (reqBody = {}) => {
  const sections = normalizeSections(reqBody.sections);

  if (!sections.length) {
    throw new Error("At least one section with a heading and body is required");
  }

  if (!reqBody.title?.trim()) {
    throw new Error("Title is required");
  }

  return {
    title: reqBody.title.trim(),
    summary: reqBody.summary?.trim() || "",
    effectiveDate: parseEffectiveDate(reqBody.effectiveDate),
    sections,
    contactEmail: reqBody.contactEmail?.trim() || "",
    changeNote: reqBody.changeNote?.trim() || "",
  };
};

/**
 * Shape a stored document for public consumption. `contentHtml` is a rendered
 * single-blob view for anything that wants one string (SEO/meta, print, plain
 * WebView); `sections` stays available for the accordion UIs on web and app.
 */
export const toPublicDocument = (document) => {
  if (!document) return null;

  const sections = (document.sections || []).map((section) => ({
    key: section.key,
    heading: section.heading,
    body: section.body,
    order: section.order,
  }));

  const contentHtml = sections
    .map((section) => `<h2>${section.heading}</h2>\n${section.body}`)
    .join("\n");

  return {
    _id: document._id,
    type: document.type,
    locale: document.locale,
    version: document.version,
    status: document.status,
    title: document.title,
    summary: document.summary,
    effectiveDate: document.effectiveDate,
    contactEmail: document.contactEmail,
    sections,
    contentHtml,
    publishedAt: document.publishedAt,
    updatedAt: document.updatedAt,
  };
};

/**
 * The live document for a type — what web pages and the mobile app render.
 */
export const getPublishedLegalDocument = async (type, locale) => {
  assertValidType(type);

  const document = await legalDocumentModel
    .findOne({ type, locale: normalizeLocale(locale), status: "published" })
    .lean();

  if (!document) {
    throw notFound(`No published ${type} found`);
  }

  return toPublicDocument(document);
};

/**
 * Every live document at once, so a client can warm its cache in one call.
 */
export const getAllPublishedLegalDocuments = async (locale) => {
  const documents = await legalDocumentModel
    .find({ locale: normalizeLocale(locale), status: "published" })
    .sort({ type: 1 })
    .lean();

  return documents.map(toPublicDocument);
};

export const listLegalDocuments = async ({
  pageNo = 1,
  pageSize = 10,
  type = null,
  status = null,
  locale = null,
  search = "",
  sortBy = null,
  sortOrder = -1,
}) => {
  const query = {};

  if (type) {
    assertValidType(type);
    query.type = type;
  }

  if (status) {
    if (!LEGAL_DOCUMENT_STATUSES.includes(status)) {
      throw new Error(
        `Invalid status. Expected one of: ${LEGAL_DOCUMENT_STATUSES.join(", ")}`
      );
    }
    query.status = status;
  }

  if (locale) {
    query.locale = normalizeLocale(locale);
  }

  if (search && search.trim() !== "") {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { "sections.heading": { $regex: search, $options: "i" } },
      { "sections.body": { $regex: search, $options: "i" } },
    ];
  }

  const sortQuery = sortBy
    ? { [sortBy]: sortOrder }
    : { type: 1, version: -1 };

  const total = await legalDocumentModel.countDocuments(query);

  const list = await legalDocumentModel
    .find(query)
    .sort(sortQuery)
    .skip((pageNo - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return { list, total };
};

export const getLegalDocumentById = async (id) => {
  assertValidId(id);

  const document = await legalDocumentModel.findById(id).lean();

  if (!document) {
    throw notFound("Legal document not found");
  }

  return document;
};

const nextVersionFor = async (type, locale) => {
  const latest = await legalDocumentModel
    .findOne({ type, locale })
    .sort({ version: -1 })
    .select({ version: 1 })
    .lean();

  return (latest?.version || 0) + 1;
};

/**
 * Always creates a draft. Going live is a separate, deliberate step so an
 * in-progress edit can never be what a user sees.
 */
export const createLegalDocument = async (reqBody = {}, authActor = null) => {
  assertValidType(reqBody.type);

  const locale = normalizeLocale(reqBody.locale);
  const payload = buildWritablePayload(reqBody);
  const actor = buildActor(authActor);

  const document = new legalDocumentModel({
    ...payload,
    type: reqBody.type,
    locale,
    version: await nextVersionFor(reqBody.type, locale),
    status: "draft",
    updatedBy: actor,
  });

  return document.save();
};

/**
 * Clone any version into a fresh draft — the normal way to start an amendment
 * without retyping the whole document.
 */
export const createDraftFromLegalDocument = async (id, authActor = null) => {
  const source = await getLegalDocumentById(id);
  const actor = buildActor(authActor);

  const existingDraft = await legalDocumentModel
    .findOne({ type: source.type, locale: source.locale, status: "draft" })
    .lean();

  if (existingDraft) {
    throw new Error(
      `A draft (v${existingDraft.version}) already exists for this document. Edit or delete it first.`
    );
  }

  const document = new legalDocumentModel({
    type: source.type,
    locale: source.locale,
    version: await nextVersionFor(source.type, source.locale),
    status: "draft",
    title: source.title,
    summary: source.summary,
    effectiveDate: source.effectiveDate,
    sections: source.sections,
    contactEmail: source.contactEmail,
    changeNote: "",
    updatedBy: actor,
  });

  return document.save();
};

/**
 * Published wording is immutable — an edit against a live document is rejected
 * rather than silently rewriting what users already agreed to.
 */
export const updateLegalDocument = async (id, reqBody = {}, authActor = null) => {
  const existing = await getLegalDocumentById(id);

  if (existing.status !== "draft") {
    throw new Error(
      "Only drafts can be edited. Create a new version from this document instead."
    );
  }

  const payload = buildWritablePayload(reqBody);

  const result = await legalDocumentModel.findByIdAndUpdate(
    id,
    { ...payload, updatedBy: buildActor(authActor) },
    { new: true, runValidators: true }
  );

  if (!result) {
    throw notFound("Legal document not found");
  }

  return result;
};

/**
 * Archive whatever is live, then promote this draft. Ordered that way because
 * the partial unique index allows only one published row per (type, locale).
 */
export const publishLegalDocument = async (id, authActor = null) => {
  const draft = await getLegalDocumentById(id);

  if (draft.status === "published") {
    throw new Error("This document is already published");
  }

  const actor = buildActor(authActor);

  await legalDocumentModel.updateMany(
    {
      type: draft.type,
      locale: draft.locale,
      status: "published",
      _id: { $ne: draft._id },
    },
    { $set: { status: "archived" } }
  );

  const result = await legalDocumentModel.findByIdAndUpdate(
    id,
    {
      $set: {
        status: "published",
        publishedAt: new Date(),
        publishedBy: actor,
        updatedBy: actor,
      },
    },
    { new: true, runValidators: true }
  );

  if (!result) {
    throw notFound("Legal document not found");
  }

  return result;
};

/**
 * Only drafts are removable; published and archived rows are the compliance
 * record of what was live and when.
 */
export const deleteLegalDocument = async (id) => {
  const existing = await getLegalDocumentById(id);

  if (existing.status !== "draft") {
    throw new Error(
      "Only drafts can be deleted. Published and archived versions are kept as an audit trail."
    );
  }

  return legalDocumentModel.findByIdAndDelete(id);
};

export { LEGAL_DOCUMENT_TYPES, LEGAL_DOCUMENT_STATUSES };
