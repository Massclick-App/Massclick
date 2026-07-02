import mongoose from "mongoose";

const linkSchema = new mongoose.Schema(
  {
    linkText: { type: String, trim: true, required: true },
    url: { type: String, trim: true, required: true },
  },
  { _id: false }
);

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, trim: true, required: true },
    answer: { type: String, trim: true, required: true },
    links: {
      type: [linkSchema],
      default: [],
    },
  },
  { _id: false }
);

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
    faq: {
      type: [faqSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default seoPageContentSchema;
