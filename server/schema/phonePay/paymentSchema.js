import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BusinessList",
        required: false,
    },
    transactionId: {
        type: String,
    },
    orderId: {
        type: String,
        default: null,
    },
    amount: {
        type: Number,
    },
    gstAmount: {
        type: Number,
        default: 0,
    },
    totalAmount: {
        type: Number,
        default: 0,
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
    responseData: {
        type: Object,
        default: {},
    },
});

export default paymentSchema;