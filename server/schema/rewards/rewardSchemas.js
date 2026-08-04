import mongoose from "mongoose";
const { Schema } = mongoose;

export const rewardRuleSchema = new Schema({
  categoryId: { type: Schema.Types.ObjectId, ref: "category", index: true },
  categoryKey: { type: String, required: true, trim: true, lowercase: true },
  categoryName: { type: String, required: true, trim: true },
  locationId: { type: Schema.Types.ObjectId, ref: "masterlocation", default: null },
  locationName: { type: String, required: true, trim: true, maxlength: 160 },
  locationSlug: { type: String, trim: true, maxlength: 220, default: "" },
  basePoints: { type: Number, min: 0, default: 10 },
  acceptedBonus: { type: Number, min: 0, default: 5 },
  completedBonus: { type: Number, min: 0, default: 10 },
  customerConfirmedBonus: { type: Number, min: 0, default: 0 },
  maxPointsPerEnquiry: { type: Number, min: 0, default: 25 },
  monthlyCustomerCap: { type: Number, min: 0, default: 1000 },
  pointsExpireAfterDays: { type: Number, min: 0, max: 3650, default: 365 },
  approvalMode: { type: String, enum: ["automatic", "manual"], default: "automatic" },
  enabled: { type: Boolean, default: true },
  updatedBy: { type: String, default: "system" },
}, { timestamps: true });
rewardRuleSchema.index({ categoryKey: 1 }, { unique: true });
rewardRuleSchema.index({ categoryId: 1 }, { unique: true, sparse: true });

export const rewardWalletSchema = new Schema({
  customerKey: { type: String, required: true, trim: true },
  lifetimeEarned: { type: Number, min: 0, default: 0 },
  lifetimeRedeemed: { type: Number, min: 0, default: 0 },
  availablePoints: { type: Number, min: 0, default: 0 },
}, { timestamps: true });
rewardWalletSchema.index({ customerKey: 1 }, { unique: true });

export const rewardTransactionSchema = new Schema({
  customerKey: { type: String, required: true, trim: true },
  enquiryId: { type: Schema.Types.ObjectId, ref: "enquiry" },
  categoryKey: { type: String, trim: true, lowercase: true },
  milestone: { type: String, enum: ["welcome_bonus", "created", "accepted", "completed", "customer_confirmed", "adjustment", "redemption"], required: true },
  points: { type: Number, required: true },
  status: { type: String, enum: ["credited", "debited", "reversed"], required: true },
  idempotencyKey: { type: String, required: true },
  description: { type: String, trim: true, maxlength: 240 },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdBy: { type: String, default: "system" },
}, { timestamps: true });
rewardTransactionSchema.index({ idempotencyKey: 1 }, { unique: true });
rewardTransactionSchema.index({ customerKey: 1, createdAt: -1 });

export const rewardRedemptionSchema = new Schema({
  customerKey: { type: String, required: true, trim: true },
  rewardCode: { type: String, required: true, trim: true },
  rewardName: { type: String, required: true, trim: true },
  pointsCost: { type: Number, required: true, min: 1 },
  valueInr: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["requested", "approved", "fulfilled", "rejected", "cancelled"], default: "requested" },
  fulfillmentReference: { type: String, default: "" },
}, { timestamps: true });
rewardRedemptionSchema.index({ customerKey: 1, createdAt: -1 });

export const rewardClaimSchema = new Schema({
  claimNumber: { type: String, required: true, unique: true, index: true },
  customerKey: { type: String, required: true, trim: true, index: true },
  customerName: { type: String, trim: true, maxlength: 120, default: "" },
  categoryId: { type: Schema.Types.ObjectId, ref: "category", required: true, index: true },
  categoryKey: { type: String, required: true, trim: true, lowercase: true },
  categoryName: { type: String, required: true, trim: true },
  businessName: { type: String, required: true, trim: true, maxlength: 180 },
  businessId: { type: Schema.Types.ObjectId, ref: "businesslist", required: true },
  transactionAmount: { type: Number, required: true, min: 1, max: 1000000000 },
  currency: { type: String, enum: ["INR"], default: "INR" },
  transactionAt: { type: Date, required: true },
  invoiceNumber: { type: String, trim: true, maxlength: 100, default: "" },
  paymentMethod: { type: String, enum: ["cash", "upi", "card", "bank_transfer", "wallet", "other"], required: true },
  notes: { type: String, trim: true, maxlength: 500, default: "" },
  evidenceFiles: [{
    key: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true, maxlength: 180 },
    fileType: { type: String, required: true, trim: true, maxlength: 100 },
    fileSize: { type: Number, min: 0, max: 5242880 },
    uploadedAt: { type: Date, default: Date.now },
  }],
  consentConfirmed: { type: Boolean, required: true },
  projectedPoints: { type: Number, min: 0, default: 0 },
  awardedPoints: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ["pending", "approved", "rejected", "needs_information"], default: "pending", index: true },
  reviewedBy: { type: String, default: "" },
  reviewedById: { type: String, default: "" },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, maxlength: 300, default: "" },
}, { timestamps: true });
rewardClaimSchema.index({ customerKey: 1, transactionAt: -1 });
rewardClaimSchema.index({ customerKey: 1, categoryId: 1, businessName: 1, transactionAt: 1 });
