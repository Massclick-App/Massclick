import mongoose from "mongoose";

const searchRequestSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    contactNumber: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 150 },
    category: { type: String, required: true, trim: true, maxlength: 120 },
    location: { type: String, required: true, trim: true, maxlength: 180 },
    details: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    source: { type: String, trim: true, default: "search-no-results" },
    status: { type: String, enum: ["new", "contacted", "completed", "cancelled"], default: "new" },
  },
  { timestamps: true },
);

searchRequestSchema.index({ createdAt: -1 });
searchRequestSchema.index({ status: 1, createdAt: -1 });

export default searchRequestSchema;
