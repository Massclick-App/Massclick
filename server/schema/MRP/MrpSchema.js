import mongoose from "mongoose";

const mrpSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
      contactDetails: {
      type: String,
    },
    businessSnapshot: {
      businessName: String,
      location: String,
      category: String,
      contact: String,
      contactList: String,
      whatsappNumber: String,
      email: String,
      website: String,
      averageRating: Number
    },
    categoryId: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      required: true,
    },

    description: {
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

export default mrpSchema;
