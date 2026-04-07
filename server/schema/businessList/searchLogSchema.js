import mongoose from "mongoose"

const searchLogSchema = new mongoose.Schema({
    categoryName: {
        type: String,
        index: true
    },
    categoryImage: {
        type: String,
        index: true
    },
    searchedUserText: {
        type: String,
        index: true
    },
    location: {
        type: String,
        index: true
    },
    userDetails: [
        {
            userName: String,
            mobileNumber1: String,
            mobileNumber2: String,
            email: String
        }
    ],
    isRead: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 604800
    }
});

export default searchLogSchema;