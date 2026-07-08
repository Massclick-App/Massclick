import mongoose from "mongoose";

const { Schema } = mongoose;

const userFeedbackSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    default: null,
    index: true,
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
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  feedbackType: {
    type: String,
    trim: true,
    maxlength: 120,
    required: true,
  },
  improvementArea: {
    type: String,
    trim: true,
    maxlength: 140,
    default: "",
  },
  journey: {
    type: String,
    trim: true,
    maxlength: 300,
    default: "",
  },
  message: {
    type: String,
    trim: true,
    maxlength: 2000,
    required: true,
  },
  allowContact: {
    type: Boolean,
    default: true,
  },
  source: {
    type: String,
    trim: true,
    maxlength: 80,
    default: "user_feedback_page",
  },
  pageUrl: {
    type: String,
    trim: true,
    maxlength: 500,
    default: "",
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: 500,
    default: "",
  },
  ipAddress: {
    type: String,
    trim: true,
    maxlength: 80,
    default: "",
  },
  status: {
    type: String,
    enum: ["new", "reviewing", "resolved", "archived"],
    default: "new",
  },
  priority: {
    type: String,
    enum: ["normal", "high"],
    default: "normal",
  },
  adminNote: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: "",
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
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

userFeedbackSchema.index({ status: 1, createdAt: -1 });
userFeedbackSchema.index({ feedbackType: 1, createdAt: -1 });
userFeedbackSchema.index({ userEmail: 1, createdAt: -1 });

export default userFeedbackSchema;
