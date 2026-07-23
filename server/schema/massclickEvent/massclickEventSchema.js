import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema({
  mediaType: { type: String, enum: ["image", "video"], required: true },
  mediaKey: { type: String, required: true },
  thumbnailKey: { type: String, default: "" },
}, { _id: false });

const massclickEventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500, default: "" },
  fullDescription: { type: String, trim: true, maxlength: 10000, default: "" },
  venue: { type: String, trim: true, maxlength: 180, default: "" },
  eventDate: { type: Date, required: true },
  media: { type: mediaSchema, required: true },
  mediaItems: { type: [mediaSchema], default: [] },
  featured: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
}, { timestamps: true });

massclickEventSchema.index({ isPublished: 1, featured: -1, sortOrder: 1, eventDate: -1 });

export default massclickEventSchema;
