import mongoose from "mongoose";

// The legal document types the platform publishes. Adding a value here is all
// that is needed to make a new document type editable in admin and readable by
// the web/app clients.
export const LEGAL_DOCUMENT_TYPES = [
  "privacy-policy",
  "terms-and-conditions",
  "refund-policy",
];

export const LEGAL_DOCUMENT_STATUSES = ["draft", "published", "archived"];

const legalSectionSchema = new mongoose.Schema(
  {
    // Stable identifier so deep links (app "read section 3 of the policy")
    // survive a re-order or a re-word of the heading.
    key: {
      type: String,
      trim: true,
    },
    heading: {
      type: String,
      required: true,
      trim: true,
    },
    // Rich text (HTML) authored in the admin editor.
    body: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const actorSchema = new mongoose.Schema(
  {
    userId: { type: String, default: null },
    userName: { type: String, default: null },
  },
  { _id: false }
);

const legalDocumentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: LEGAL_DOCUMENT_TYPES,
      required: true,
    },
    locale: {
      type: String,
      default: "en",
      trim: true,
      lowercase: true,
    },
    // Monotonic per (type, locale). A published document is never edited in
    // place; publishing a change always mints the next version so the exact
    // wording a user agreed to stays retrievable.
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: LEGAL_DOCUMENT_STATUSES,
      default: "draft",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // Lead-in paragraph shown above the sections on web and app.
    summary: {
      type: String,
      default: "",
      trim: true,
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    sections: {
      type: [legalSectionSchema],
      default: [],
    },
    contactEmail: {
      type: String,
      default: "",
      trim: true,
    },
    // Free-text note for the audit trail ("added DPDP grievance timelines").
    changeNote: {
      type: String,
      default: "",
      trim: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    publishedBy: {
      type: actorSchema,
      default: () => ({}),
    },
    updatedBy: {
      type: actorSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

// One row per (type, locale, version).
legalDocumentSchema.index(
  { type: 1, locale: 1, version: -1 },
  { unique: true, name: "legal_doc_version_unique" }
);

// At most one *published* row per (type, locale) — the clients read this one,
// so the database refuses to let two go live at once.
legalDocumentSchema.index(
  { type: 1, locale: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "published" },
    name: "legal_doc_single_published",
  }
);

export default legalDocumentSchema;
