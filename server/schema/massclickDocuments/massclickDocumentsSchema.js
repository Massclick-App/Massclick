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
      maxlength: 1200,
    },
    resourceType: {
      type: String,
      enum: ["document", "video", "image", "guide", "awareness"],
      default: "document",
      index: true,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 600,
    },
    contentDetails: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    youtubeLinks: [{
      type: String,
      trim: true,
    }],
    videoLinks: [{
      type: String,
      trim: true,
    }],
    imageLinks: [{
      type: String,
      trim: true,
    }],
    mediaItems: [{
      title: {
        type: String,
        trim: true,
      },
      mediaType: {
        type: String,
        enum: ["image", "video", "file"],
        default: "file",
      },
      mediaKey: {
        type: String,
        trim: true,
      },
      fileName: {
        type: String,
        trim: true,
      },
      fileType: {
        type: String,
        trim: true,
      },
      fileSize: {
        type: Number,
        default: 0,
      },
    }],
    keyBenefits: [{
      type: String,
      trim: true,
    }],
    useCases: [{
      type: String,
      trim: true,
    }],
    targetAudience: {
      type: String,
      trim: true,
      maxlength: 400,
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    documentKey: {
      type: String,
    },
    fileName: {
      type: String,
      trim: true,
    },
    fileType: {
      type: String,
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
  resourceType: 1,
  section: 1,
  isActive: 1,
  isDeleted: 1,
  displayOrder: 1,
  createdAt: -1,
});

export default massclickDocumentsSchema;
