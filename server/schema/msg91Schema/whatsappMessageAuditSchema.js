import mongoose from "mongoose";

const whatsappMessageAuditSchema = new mongoose.Schema(
  {
    templateName: { type: String, required: true, index: true },
    messageType: { type: String, default: "template" },
    sourceType: {
      type: String,
      enum: ["search_lead", "customer_list", "mni", "enquiry", "welcome", "manual", "unknown"],
      default: "unknown",
      index: true,
    },
    sourceId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    recipientMobile: { type: String, required: true, index: true },
    senderMobile: { type: String, default: "" },
    customerName: { type: String, default: "" },
    customerMobile: { type: String, default: "", index: true },
    category: { type: String, default: "", index: true },
    location: { type: String, default: "", index: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    businessName: { type: String, default: "" },
    requestId: { type: String, default: "", index: true },
    uuid: { type: String, default: "", index: true },
    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "read", "failed", "hold", "skipped"],
      default: "queued",
      index: true,
    },
    failureCode: { type: String, default: "", index: true },
    failureReason: { type: String, default: "" },
    skippedReason: { type: String, default: "" },
    price: { type: Number, default: 0 },
    retryCount: { type: Number, default: 0 },
    payloadPreview: { type: mongoose.Schema.Types.Mixed, default: {} },
    providerResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
    rawWebhookPayload: { type: mongoose.Schema.Types.Mixed, default: {} },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    holdAt: { type: Date, default: null },
    skippedAt: { type: Date, default: null },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      expires: 0,
    },
  },
  { timestamps: true }
);

whatsappMessageAuditSchema.index({ createdAt: -1 });
whatsappMessageAuditSchema.index({ templateName: 1, status: 1, createdAt: -1 });
whatsappMessageAuditSchema.index({ recipientMobile: 1, createdAt: -1 });
whatsappMessageAuditSchema.index({
  templateName: 1,
  recipientMobile: 1,
  sourceType: 1,
  category: 1,
  location: 1,
  customerMobile: 1,
  createdAt: -1,
});

export default whatsappMessageAuditSchema;
