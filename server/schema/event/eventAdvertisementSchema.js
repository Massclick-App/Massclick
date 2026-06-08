import mongoose from "mongoose";

const eventAdvertisementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    bannerImage: {
      type: String,
      default: "",
    },
    bannerImageKey: {
      type: String,
      default: "",
    },
    redirectUrl: {
      type: String,
      trim: true,
      default: "",
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    mobileBannerImageKey: {
      type: String,
      default: "",
    },
    displayDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    showConfetti: {
      type: Boolean,
      default: false,
    },
    displayPosition: {
      type: String,
      enum: ["HOME_POPUP"],
      default: "HOME_POPUP",
    },
    clicks: {
      type: Number,
      default: 0,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
  },
  { timestamps: true }
);

eventAdvertisementSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  next();
});

export default eventAdvertisementSchema;
