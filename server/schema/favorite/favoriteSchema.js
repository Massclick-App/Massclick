import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BusinessList",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

favoriteSchema.index({ userId: 1, businessId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1 });
favoriteSchema.index({ businessId: 1 });

export default favoriteSchema;