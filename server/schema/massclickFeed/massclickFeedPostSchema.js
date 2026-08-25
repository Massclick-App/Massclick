import mongoose from "mongoose";

const { Schema } = mongoose;

const feedMediaSchema = new Schema(
  {
    mediaType: {
      type: String,
      enum: ["image", "video", "file"],
      default: "image",
    },
    mediaKey: { type: String, default: "" },
    fileName: { type: String, default: "" },
    fileType: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
  },
  { _id: false }
);

const feedCommentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    userName: { type: String, default: "User" },
    actorType: { type: String, default: "customer" },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const massclickFeedPostSchema = new Schema({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: "BusinessList",
    default: null,
  },
  ownerUserId: { type: Schema.Types.ObjectId, required: true },
  ownerActorType: { type: String, default: "customer" },
  businessName: { type: String, default: "" },
  businessCategory: { type: String, default: "" },
  businessLocation: { type: String, default: "" },
  title: { type: String, trim: true, maxlength: 120, default: "" },
  text: { type: String, trim: true, maxlength: 1200, default: "" },
  postType: { type: String, default: "update" },
  storyStyle: {
    background: { type: String, default: "#1746a2" },
    textColor: { type: String, default: "#ffffff" },
    font: { type: String, enum: ["modern", "classic", "strong", "playful"], default: "modern" },
    align: { type: String, enum: ["left", "center", "right"], default: "center" },
    musicTitle: { type: String, trim: true, maxlength: 80, default: "" },
    musicArtist: { type: String, trim: true, maxlength: 80, default: "" },
  },
  callToAction: { type: String, default: "" },
  callToActions: {
    type: [{ action: String, label: String, value: String }],
    default: [],
    validate: [(items) => items.length <= 3, "Choose up to three call-to-action buttons"],
  },
  hashtags: { type: [String], default: [] },
  audience: { type: [String], default: [] },
  radiusKm: { type: Number, default: 5 },
  scheduledAt: { type: Date, default: null },
  expireAfterDays: { type: Number, default: null },
  pinPost: { type: Boolean, default: false },
  allowComments: { type: Boolean, default: true },
  showShareButton: { type: Boolean, default: true },
  trackPerformance: { type: Boolean, default: true },
  offerStartsAt: { type: Date, default: null },
  offerEndsAt: { type: Date, default: null },
  mediaItems: { type: [feedMediaSchema], default: [] },
  likes: [{ type: Schema.Types.ObjectId }],
  savedBy: [{ type: Schema.Types.ObjectId }],
  viewsCount: { type: Number, default: 0 },
  enquiriesCount: { type: Number, default: 0 },
  sharesCount: { type: Number, default: 0 },
  comments: { type: [feedCommentSchema], default: [] },
  status: {
    type: String,
    enum: ["active", "draft", "scheduled", "hidden", "rejected", "expired"],
    default: "active",
  },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

massclickFeedPostSchema.index({ status: 1, isDeleted: 1, createdAt: -1 });
massclickFeedPostSchema.index({ ownerUserId: 1, createdAt: -1 });
massclickFeedPostSchema.index({ businessId: 1, createdAt: -1 });

export default massclickFeedPostSchema;
