import mongoose from "mongoose";

const termsAndConditionsItemSchema = new mongoose.Schema(
  {
    header: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const termsAndConditionsSchema = new mongoose.Schema(
  {
    data: {
      type: [termsAndConditionsItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default termsAndConditionsSchema;