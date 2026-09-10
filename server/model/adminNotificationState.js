import mongoose from "mongoose";

const schema = new mongoose.Schema({
  adminId: { type: String, required: true },
  notificationId: { type: String, required: true },
  isDeleted: { type: Boolean, default: false, required: true },
}, { timestamps: true });

schema.index({ adminId: 1, notificationId: 1 }, { unique: true });

export default mongoose.model("AdminNotificationState", schema);
