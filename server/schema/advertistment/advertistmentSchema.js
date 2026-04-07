import mongoose from "mongoose";
const { Schema } = mongoose;

const advertistmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    redirectUrl: {
      type: String,
      trim: true,
    },

    bannerImageKey: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
      index: true,
    },

    subCategory: {
      type: String,
    },

    location: {
      country: { type: String },
      state: { type: String },
      city: { type: String },
    },

    position: {
      type: String,
      enum: ["TOP_BANNER", "LIST_INLINE", "SIDE_BANNER", "FOOTER_BANNER"],
      default: "LIST_INLINE",
      index: true,
    },

    startTime: {
      type: Date,
      required: true,
      index: true,
    },

    endTime: {
      type: Date,
      required: true,
      index: true,
    },

    advertiserType: {
      type: String,
      enum: ["ADMIN", "BUSINESS"],
      default: "ADMIN",
    },

    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      default: null,
    },

    priority: {
      type: Number,
      default: 0,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

advertistmentSchema.index({
  category: 1,
  position: 1,
  isActive: 1,
  isDeleted: 1,
  startTime: 1,
  endTime: 1,
  priority: -1,
});

export default advertistmentSchema;
