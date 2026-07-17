import mongoose from "mongoose";
import { slugify } from "../../slugify.js";

const faqTemplateItemSchema = new mongoose.Schema(
  {
    question: { type: String, trim: true, required: true },
    answer: { type: String, trim: true, required: true },
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
