import mongoose from "mongoose";

const seoPageContentBlogSchema = new mongoose.Schema(
  {
    metaTitle: { type: String, required: true },
    metaDescription: { type: String, required: true },
    metaKeywords: { type: String, required: true },
    pageType: { type: String, required: true },
    category: { type: String, required: true },
    location: { type: String },
    heading: { type: String, required: true },
    headerContent: { type: String, required: true },
    pageContent: {
      type: String,
      required: false,
    },
    profileImageKey: { type: String, default: '' },
    pageImageKey: {
      type: [String],
      default: [],
    },
    businessDetails: [
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
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default seoPageContentBlogSchema;
