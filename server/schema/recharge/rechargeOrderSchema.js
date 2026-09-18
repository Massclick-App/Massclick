import mongoose from "mongoose";

const rechargeOrderSchema = new mongoose.Schema(
  {
    serviceSlug: {
      type: String,
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    serviceGroup: {
      type: String,
      default: "",
    },
    billDetails: {
      type: Object,
      default: {},
    },
    amount: {
      type: Number,
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: {
      type: String,
      default: null,
    },
    paymentGateway: {
      type: String,
      default: "phonepe",
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    paymentUrl: {
      type: String,
      default: "",
    },
    // Placeholder for the follow-up feature that actually dispatches the
    // recharge/bill payment to Pay2All once a payment is collected.
    fulfillmentStatus: {
      type: String,
      enum: ["NOT_STARTED"],
      default: "NOT_STARTED",
    },
    responseData: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true },
);

export default rechargeOrderSchema;
