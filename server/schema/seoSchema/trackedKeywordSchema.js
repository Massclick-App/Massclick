import mongoose from "mongoose";

const rankHistorySchema = new mongoose.Schema(
  {
    checkedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["found", "not_found"], required: true },
    rank: { type: Number, default: null },
    page: { type: Number, default: null },
    url: { type: String, default: "" },
    provider: { type: String, enum: ["google_cse", "manual"], required: true },
    screenshotKey: { type: String, default: "" },
    checkedBy: { type: String, default: "" },
  },
  { _id: false }
);

const trackedKeywordSchema = new mongoose.Schema(
  {
    keyword: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    device: {
      type: String,
      enum: ["desktop", "mobile"],
      default: "desktop",
    },
    category: {
      type: String,
      default: "",
      trim: true,
    },
    targetUrl: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      enum: ["manual", "quick-win", "keyword-gap"],
      default: "manual",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    addedBy: {
      type: String,
      default: "",
    },
    history: {
      type: [rankHistorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default trackedKeywordSchema;
