import mongoose from "mongoose";

const normalizeText = (v = "") =>
  typeof v === "string" ? v.toLowerCase().trim() : v;

const normalizeKey = (v = "") =>
  typeof v === "string"
    ? v.toLowerCase().trim().replace(/[^a-z0-9]/g, "")
    : v;

const seoSchema = new mongoose.Schema(
  {
    pageType: {
      type: String,
      required: true,
      set: normalizeText,
      index: true
    },

    category: {
      type: String,
      set: normalizeText,
      index: true
    },

    location: {
      type: String,
      trim: true
    },

    locationKey: {
      type: String,
      set: normalizeKey,
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    keywords: String,

    canonical: String,

    robots: {
      type: String,
      default: "index, follow"
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    }

  },
  {
    timestamps: true
  }
);

seoSchema.index(
  {
    pageType: 1,
    category: 1,
    locationKey: 1
  },
  {
    unique: true,
    name: "unique_seo_per_location_category"
  }
);

export default seoSchema;