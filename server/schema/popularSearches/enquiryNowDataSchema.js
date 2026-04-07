import mongoose from "mongoose";

const enquiryNowDataSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      index: true,
    },

    categorySlug: {
      type: String,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    userName: {
      type: String,
      trim: true,
    },

    mobileNumber1: {
      type: String,
      trim: true,
    },

    mobileNumber2: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      default: "",
    },

    businessName: {
      type: String,
      trim: true,
      default: "",
    },

    enquirySource: {
      type: String,
      default: "Popular Searches",
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default enquiryNowDataSchema;
