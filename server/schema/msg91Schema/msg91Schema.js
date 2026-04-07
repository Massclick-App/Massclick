import mongoose from "mongoose";

const message91Schema = new mongoose.Schema({
    mobile: { type: String,},
    otp: { type: String,},
    expiresAt: { type: Date, },
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }, 
});
message91Schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default message91Schema;
