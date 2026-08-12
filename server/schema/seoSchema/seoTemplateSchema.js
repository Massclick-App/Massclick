import mongoose from "mongoose";
import { slugify } from "../../slugify.js";

const faqTemplateItemSchema = new mongoose.Schema(
  {
    question: { type: String, trim: true, required: true },
    answer: { type: String, trim: true, required: true },
  },
  { _id: false }
);

// Tables live here rather than inline in bodyTemplate because the body is
// authored in Quill 1.3.7, which ships no table blot — any <table> pasted in
// is flattened to plain paragraphs on the next edit round-trip. Authoring the
// grid separately and dropping a {table1} placeholder into the body keeps the
// structure intact and lets every cell run through the normal token renderer.
const tableRowSchema = new mongoose.Schema(
  { cells: { type: [String], default: [] } },
  { _id: false }
);

const tableTemplateSchema = new mongoose.Schema(
  {
    caption: { type: String, trim: true, default: "" },
    hasHeaderRow: { type: Boolean, default: true },
    rows: { type: [tableRowSchema], default: [] },
  },
  { _id: false }
);

const seoTemplateSchema = new mongoose.Schema(
  {
    // One template per category (not per category+location) — slugified so
    // "AC Service" / "ac service" / "ac-service" all resolve to the same doc.
    category: {
      type: String,
      required: true,
      set: slugify,
      unique: true,
      index: true,
    },

    pageType: {
      type: String,
      default: "category",
      index: true,
    },

    titleTemplate: {
      type: String,
      required: true,
      trim: true,
    },

    descriptionTemplate: {
      type: String,
      required: true,
      trim: true,
    },

    keywordsTemplate: String,

    headerTemplate: {
      type: String,
      required: true,
      trim: true,
    },

    bodyTemplate: {
      type: String,
      required: true,
    },

    faqTemplate: {
      type: [faqTemplateItemSchema],
      default: [],
    },

    // Rendered into bodyTemplate/headerTemplate at the matching {table1},
    // {table2}, … placeholder ({table} is an alias for the first).
    tableTemplate: {
      type: [tableTemplateSchema],
      default: [],
    },

    // Bumped on every template edit so callers/admin UI can tell content changed.
    templateVersion: {
      type: Number,
      default: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default seoTemplateSchema;
