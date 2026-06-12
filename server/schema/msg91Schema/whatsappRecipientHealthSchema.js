import mongoose from "mongoose";

const whatsappRecipientHealthSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true, unique: true, index: true },
    totalAttempts: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    readCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    undeliverableCount: { type: Number, default: 0 },
    ecosystemFailureCount: { type: Number, default: 0 },
    consecutiveFailures: { type: Number, default: 0 },
    lastStatus: { type: String, default: "" },
    lastFailureCode: { type: String, default: "" },
    lastFailureReason: { type: String, default: "" },
    lastAttemptAt: { type: Date, default: null },
    lastSentAt: { type: Date, default: null },
    lastFailedAt: { type: Date, default: null },
    suppressedUntil: { type: Date, default: null, index: true },
    suppressReason: { type: String, default: "" },
    whatsappInvalid: { type: Boolean, default: false, index: true },
    reviewed: { type: Boolean, default: false, index: true },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

whatsappRecipientHealthSchema.index({ failedCount: -1, updatedAt: -1 });
whatsappRecipientHealthSchema.index({ suppressedUntil: 1, whatsappInvalid: 1 });

export default whatsappRecipientHealthSchema;
