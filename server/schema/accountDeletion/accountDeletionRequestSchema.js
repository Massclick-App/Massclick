import mongoose from "mongoose";

const { Schema } = mongoose;

const accountDeletionRequestSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  mobileNumber: {
    type: String,
    required: true,
    trim: true,
    maxlength: 15,
  },
  userName: {
    type: String,
    trim: true,
    maxlength: 120,
    default: "",
  },
  userEmail: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 180,
    default: "",
  },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "cancelled"],
    default: "pending",
    index: true,
  },
  source: {
    type: String,
    enum: ["web_external", "in_app"],
    default: "web_external",
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  expectedCompletionAt: {
    type: Date,
    required: true,
  },
  notificationSentAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  purgeAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

accountDeletionRequestSchema.index({ userId: 1, status: 1 });
accountDeletionRequestSchema.index({ status: 1, requestedAt: -1 });
accountDeletionRequestSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export default accountDeletionRequestSchema;
