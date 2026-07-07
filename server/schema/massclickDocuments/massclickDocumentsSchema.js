import mongoose from "mongoose";

const { Schema } = mongoose;

const massclickDocumentsSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    section: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    documentKey: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
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
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

massclickDocumentsSchema.index({
  section: 1,
  isActive: 1,
  isDeleted: 1,
  createdAt: -1,
});

export default massclickDocumentsSchema;
