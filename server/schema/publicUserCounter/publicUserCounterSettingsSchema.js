import mongoose from "mongoose";

const publicUserCounterCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, default: "", trim: true },
    baseCount: { type: Number, default: 0, min: 0 },
    incrementMin: { type: Number, default: 0, min: 0 },
    incrementMax: { type: Number, default: 2, min: 0 },
    intervalSeconds: { type: Number, default: 30, min: 10 },
    startedAt: { type: Date, default: Date.now },
    enabled: { type: Boolean, default: true },
  },
  { _id: true }
);

const publicUserCounterSettingsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    title: { type: String, default: "Public Users", trim: true },
    subtitle: { type: String, default: "Public Users Connected", trim: true },
    baseCount: { type: Number, default: 0, min: 0 },
    todayBaseCount: { type: Number, default: 127, min: 0 },
    onlineBaseCount: { type: Number, default: 143, min: 0 },
    incrementMin: { type: Number, default: 1, min: 0 },
    incrementMax: { type: Number, default: 5, min: 0 },
    intervalSeconds: { type: Number, default: 30, min: 10 },
    resetDaily: { type: Boolean, default: true },
    startedAt: { type: Date, default: Date.now },
    lastResetAt: { type: Date, default: Date.now },
    categories: { type: [publicUserCounterCategorySchema], default: [] },
    updatedBy: { type: String, default: "admin" },
  },
  { timestamps: true }
);

export default publicUserCounterSettingsSchema;
