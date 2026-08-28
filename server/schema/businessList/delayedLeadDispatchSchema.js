import mongoose from "mongoose";

const delayedLeadDispatchSchema = new mongoose.Schema(
  {
    searchLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "logsearch",
      required: true,
    },
    traceId: { type: String, default: "" },
    businessIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "businesslist",
      },
    ],
    customerListBusinessIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "businesslist",
      },
    ],
    leadData: {
      searchText: { type: String, default: "" },
      searchedUserText: { type: String, default: "" },
      location: { type: String, default: "" },
      customerName: { type: String, default: "" },
      customerMobile: { type: String, default: "" },
      email: { type: String, default: "" },
    },
    userDetails: {
      userName: { type: String, default: "" },
      mobileNumber1: { type: String, default: "" },
      mobileNumber2: { type: String, default: "" },
      email: { type: String, default: "" },
    },
    dueAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["scheduled", "processing", "sent", "failed"],
      default: "scheduled",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: "" },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

delayedLeadDispatchSchema.index({ status: 1, dueAt: 1 });

export default delayedLeadDispatchSchema;
