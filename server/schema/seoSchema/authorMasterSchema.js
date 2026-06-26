import mongoose from "mongoose";

const authorMasterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    title: {
      type: String,
      default: "",
      trim: true,
    },

    shortBio: {
      type: String,
      default: "",
      trim: true,
    },

    bio: {
      type: String,
      default: "",
      trim: true,
    },

    experience: {
      type: String,
      default: "",
      trim: true,
    },

    expertCategory: {
      type: String,
      default: "",
      trim: true,
    },

    expertiseAreas: {
      type: [String],
      default: [],
    },

    specializations: {
      type: [String],
      default: [],
    },

    profileImage: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    website: {
      type: String,
      default: "",
      trim: true,
    },

    linkedin: {
      type: String,
      default: "",
      trim: true,
    },

    twitter: {
      type: String,
      default: "",
      trim: true,
    },

    blogCount: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

authorMasterSchema.pre("validate", function (next) {
  if (!this.slug && this.displayName) {
    this.slug = this.displayName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

export default authorMasterSchema;
