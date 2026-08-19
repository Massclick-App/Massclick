import mongoose, { Schema } from "mongoose";

const replySchema = new Schema({
  senderType: { type: String, enum: ["customer", "admin"], required: true },
  senderId: { type: Schema.Types.ObjectId, required: true },
  senderName: { type: String, default: "", trim: true },
  text: { type: String, required: true, trim: true, maxlength: 4000 },
}, { timestamps: true });

const supportTicketSchema = new Schema({
  ticketNumber: { type: String, required: true, unique: true, index: true },
  customerUserId: { type: Schema.Types.ObjectId, ref: "Msgusers", required: true, index: true },
  customerName: { type: String, default: "Customer", trim: true },
  customerMobile: { type: String, default: "", trim: true },
  subject: { type: String, required: true, trim: true, maxlength: 160 },
  category: { type: String, enum: ["account", "business", "leads", "verification", "billing", "technical", "other"], default: "other", index: true },
  priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal", index: true },
  status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open", index: true },
  replies: { type: [replySchema], default: [] },
  lastReplyAt: { type: Date, default: Date.now, index: true },
  resolvedAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },
}, { timestamps: true });

supportTicketSchema.index({ customerUserId: 1, lastReplyAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1, lastReplyAt: -1 });

export default supportTicketSchema;
