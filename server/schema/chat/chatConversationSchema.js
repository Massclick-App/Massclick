import mongoose, { Schema } from "mongoose";

const chatConversationSchema = new mongoose.Schema({
  customerUserId: {
    type: Schema.Types.ObjectId,
    ref: "Msgusers",
    required: true,
    index: true,
  },
  customerName: { type: String, default: "Customer", trim: true },
  customerMobile: { type: String, default: "", trim: true, index: true },
  status: {
    type: String,
    enum: ["open", "closed"],
    default: "open",
    index: true,
  },
  lastMessageText: { type: String, default: "", trim: true },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  lastMessageSenderType: {
    type: String,
    enum: ["customer", "admin", ""],
    default: "",
  },
  unreadForAdmin: { type: Number, default: 0, min: 0 },
  unreadForCustomer: { type: Number, default: 0, min: 0 },
  closedAt: { type: Date, default: null },
  closedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, {
  timestamps: true,
});

chatConversationSchema.index({ customerUserId: 1, status: 1 });
chatConversationSchema.index({ lastMessageAt: -1 });
chatConversationSchema.index({
  customerName: "text",
  customerMobile: "text",
  lastMessageText: "text",
});

export default chatConversationSchema;
