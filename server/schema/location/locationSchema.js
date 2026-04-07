import mongoose from "mongoose"

const locationSchema = new mongoose.Schema({

    country: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    district: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    pincode: {
        type: String,
        required: false,
    },
    addressLine1: {
        type: String,
        required: false,
    },
    addressLine2: {
        type: String,
        required: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
});

export default locationSchema;