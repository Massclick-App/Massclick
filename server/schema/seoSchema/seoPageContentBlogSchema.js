import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, trim: true, required: true },
    answer: { type: String, trim: true, required: true },
  },
  { _id: false }
);

const businessSchema = new mongoose.Schema(
  {
    businessName: String,
    plotNumber: String,
    street: String,
    pincode: String,
    email: String,
    contact: String,
    contactList: String,
    experience: String,
    bannerImage: String,
    category: String,
    location: String,
  },
  { _id: false }
);

const seoPageContentBlogSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    metaTitle: {
      type: String,
      required: true,
      trim: true,
    },

    metaDescription: {
      type: String,
      required: true,
      trim: true,
    },

    metaKeywords: {
      type: String,
      default: "",
      trim: true,
    },

    canonicalUrl: {
      type: String,
      default: "",
      trim: true,
    },

    pageType: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    heading: {
      type: String,
      required: true,
      trim: true,
    },

    excerpt: {
      type: String,
      default: "",
      trim: true,
    },

    headerContent: {
      type: String,
      default: "",
    },

    pageContent: {
      type: String,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },

    faq: {
      type: [faqSchema],
      default: [],
    },

    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    readingTime: {
      type: String,
      default: "5 min read",
    },

    author: {
      type: String,
      default: "Admin",
      trim: true,
    },

    profileImageKey: {
      type: String,
      default: "",
    },

    pageImageKey: {
      type: [String],
      default: [],
    },

    businessDetails: {
      type: [businessSchema],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

seoPageContentBlogSchema.index(
  { pageType: 1, category: 1, location: 1 },
  { unique: true }
);

seoPageContentBlogSchema.pre("validate", function (next) {
  if (!this.slug && this.heading) {
    this.slug = this.heading
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  if (!this.canonicalUrl && this.location && this.category) {
    this.canonicalUrl = `https://massclick.in/${this.location}/${this.category}`;
  }

  next();
});

export default seoPageContentBlogSchema;