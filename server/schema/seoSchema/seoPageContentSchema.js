import mongoose from "mongoose";

const seoPageContentSchema = new mongoose.Schema(
  {
    pageType: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: false,
    },
    headerContent: {
      type: String,
      required: true,
    },
    pageContent: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default seoPageContentSchema;
