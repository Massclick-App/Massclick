import mongoose from "mongoose"

const startProjectSchema = new mongoose.Schema({

    fullName: {
        type: String,
        trim: true
    },
    contactNumber: {
        type: String,
    },
    email: {
        type: String,
    },
    message: {
        type: String,
    },
    businessName: {
        type: String,
    },
    businessType: {
        type: String,
    },
    category: {
        type: String,
    },
    subCategory: {
        type: String,
    },
    address: {
        type: String,
    },
    city: {
        type: String,
    },
    state: {
        type: String,
    },
    country: {
        type: String,
    },
    postalCode: {
        type: String,
    },
    businessPhone: {
        type: String,
    },
    notes: {
        type: String,
    },
    isActive: { type: Boolean, default: true },
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

export default startProjectSchema;