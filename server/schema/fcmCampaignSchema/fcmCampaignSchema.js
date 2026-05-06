import mongoose from "mongoose";

const fcmCampaignSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  imageUrl: { type: String, default: "" },
  clickAction: { type: String, default: "" },
  customData: { type: Map, of: String, default: {} },
  targetType: {
    type: String,
    enum: ["all", "platform", "specific_user"],
    required: true,
  },
  targetPlatform: {
    type: String,
    enum: ["android", "ios", "web", ""],
    default: "",
  },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, default: null },
  targetUserName: { type: String, default: "" },
  status: {
    type: String,
    enum: ["sent", "scheduled", "cancelled", "failed"],
    default: "sent",
  },
  scheduledAt: { type: Date, default: null },
  sentAt: { type: Date, default: Date.now },
  totalTargeted: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  sentBy: { type: String, default: "admin" },
});

export default fcmCampaignSchema;
