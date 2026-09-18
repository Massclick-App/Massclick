import mongoose from "mongoose";

const { Schema } = mongoose;

// Fields a customer can suggest. phone/whatsapp/email/website are written to the
// listing on approval; address/timings/other are resolved by an admin editing the
// listing by hand, because they don't map onto a single field.
export const SUGGESTION_FIELDS = ["phone", "whatsapp", "email", "website", "address", "timings", "other"];
export const AUTO_APPLY_FIELDS = ["phone", "whatsapp", "email", "website"];
export const SUGGESTION_STATUSES = ["pending", "approved", "rejected"];

const businessSuggestionSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, required: true, index: true },
  // Denormalized so the admin queue can list and search without a join.
  businessName: { type: String, trim: true, maxlength: 200, default: "" },
  businessCategory: { type: String, trim: true, maxlength: 200, default: "" },
  field: { type: String, enum: SUGGESTION_FIELDS, required: true },
  // What the listing showed when the customer submitted — used to warn the
  // admin if the listing changed before approval.
  currentValue: { type: String, trim: true, maxlength: 1000, default: "" },
  suggestedValue: { type: String, trim: true, maxlength: 1000, required: true },
  note: { type: String, trim: true, maxlength: 800, default: "" },

  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  userName: { type: String, trim: true, maxlength: 120, default: "" },
  userMobile: { type: String, trim: true, maxlength: 20, default: "" },
  userEmail: { type: String, trim: true, lowercase: true, maxlength: 180, default: "" },

  status: { type: String, enum: SUGGESTION_STATUSES, default: "pending" },
  // The value actually written on approval (the admin may edit it first).
  appliedValue: { type: String, trim: true, maxlength: 1000, default: "" },
  appliedFields: { type: [String], default: [] },
  rejectReason: { type: String, trim: true, maxlength: 500, default: "" },
  reviewedBy: { type: Schema.Types.ObjectId, default: null },
  reviewedByName: { type: String, trim: true, maxlength: 120, default: "" },
  reviewedAt: { type: Date, default: null },

  source: { type: String, trim: true, maxlength: 80, default: "business_detail" },
  pageUrl: { type: String, trim: true, maxlength: 500, default: "" },
  ipAddress: { type: String, trim: true, maxlength: 80, default: "" },
}, { timestamps: true });

businessSuggestionSchema.index({ status: 1, createdAt: -1 });
businessSuggestionSchema.index({ businessId: 1, status: 1 });
businessSuggestionSchema.index({ userId: 1, createdAt: -1 });

export default businessSuggestionSchema;
