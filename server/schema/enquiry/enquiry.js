import mongoose from "mongoose"

const enquirySchema = new mongoose.Schema({

    fullName: {
        type: String,
        required: true,
        trim: true
    },
    businessName: {
        type: String,
        required: true,
        trim: true
    },
    businessCategory: {
        type: String,
        required: true
    },
    contactNumber: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
       
    },
    serviceInterest: {
        type: String,
        default: 'General Consultation'
    },
    message: {
        type: String,
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

export default enquirySchema;