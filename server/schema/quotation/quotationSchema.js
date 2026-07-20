import mongoose from "mongoose";

const { Schema } = mongoose;

const quotationItemSchema = new Schema(
  {
    description: { type: String, trim: true, required: true },
    quantity: { type: Number, default: 1, min: 0 },
    unitPrice: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const quotationSchema = new Schema(
  {
    quotationName: { type: String, trim: true, required: true },
    quotationNo: { type: String, trim: true, required: true, unique: true },
    customerName: { type: String, trim: true, required: true },
    customerPhone: { type: String, trim: true, default: "" },
    customerEmail: { type: String, trim: true, default: "" },
    customerAddress: { type: String, trim: true, default: "" },
    businessName: { type: String, trim: true, default: "MassClick" },
    businessPhone: { type: String, trim: true, default: "" },
    businessEmail: { type: String, trim: true, default: "" },
    businessAddress: { type: String, trim: true, default: "" },
    issueDate: { type: Date, default: Date.now },
    validUntil: { type: Date, default: null },
    notes: { type: String, trim: true, default: "" },
    terms: { type: String, trim: true, default: "" },
    taxRate: { type: Number, default: 18, min: 0, max: 100 },
    discount: { type: Number, default: 0, min: 0 },
    advancePayment: { type: Number, default: 0, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["not_selected", "cash", "upi", "bank_transfer", "card", "cheque", "phonepe", "other"],
      default: "not_selected",
    },
    paymentReference: { type: String, trim: true, default: "" },
    paymentDueDate: { type: Date, default: null },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "part_paid", "paid"],
      default: "unpaid",
    },
    digitalMarketingMonths: { type: Number, default: 1, min: 0, max: 24 },
    youtubeVideoCount: { type: Number, default: 1, min: 0, max: 100 },
    websiteCount: { type: Number, default: 1, min: 0, max: 100 },
    items: {
      type: [quotationItemSchema],
      default: () => [
        {
          description: "MassClick Product",
          quantity: 1,
          unitPrice: 24000,
        },
      ],
    },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "cancelled"],
      default: "draft",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

quotationSchema.index({ quotationName: "text", customerName: "text", quotationNo: "text" });
quotationSchema.index({ createdAt: -1 });

export default quotationSchema;
