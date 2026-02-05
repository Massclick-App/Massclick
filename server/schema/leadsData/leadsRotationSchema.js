import mongoose from "mongoose";

const leadsRotationSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    lastIndex: {
      type: Number,
      default: -1
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

leadsRotationSchema.index(
  { category: 1, location: 1 },
  { unique: true }
);

export default leadsRotationSchema;
