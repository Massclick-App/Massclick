import mongoose, { Schema } from "mongoose";

const chatMessageSchema = new mongoose.Schema({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: "ChatConversation",
    required: true,
    index: true,
  },
  senderType: {
    type: String,
    enum: ["customer", "admin"],
    required: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  senderName: { type: String, default: "", trim: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  readByCustomerAt: { type: Date, default: null },
  readByAdminAt: { type: Date, default: null },
}, {
  timestamps: true,
});

chatMessageSchema.index({ conversationId: 1, createdAt: -1 });

export default chatMessageSchema;
