import mongoose from "mongoose";

const { Schema } = mongoose;

const agreementSchema = new Schema(
  {
    agreementNo: {
      type: String,
      trim: true,
      required: true,
      maxlength: 60,
      unique: true,
    },
    place: {
      type: String,
      trim: true,
      required: true,
      maxlength: 120,
    },
    businessName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 120,
    },
    clientName: {
      type: String,
      trim: true,
      required: false,
      maxlength: 100,
    },
    clientAddress: {
      type: String,
      trim: true,
      required: true,
      maxlength: 240,
    },
    clientPlace: {
      type: String,
      trim: true,
      required: true,
      maxlength: 120,
    },
    companyName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 100,
    },
    companyDesignation: {
      type: String,
      trim: true,
      required: true,
      maxlength: 100,
    },
    companyPlace: {
      type: String,
      trim: true,
      required: true,
      maxlength: 120,
    },
    issueDate: {
      type: Date,
      required: true,
    },
    clientDate: {
      type: Date,
      required: true,
    },
    companyDate: {
      type: Date,
      required: true,
    },
    amount: { type: Number, required: true, min: 0, max: 100000000 },
    taxRate: { type: Number, default: 18, min: 0, max: 100 },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, versionKey: false },
);

agreementSchema.index({ isDeleted: 1, isActive: 1, createdAt: -1 });

export default agreementSchema;
