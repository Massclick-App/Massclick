import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "jobvacancy", required: true, index: true },
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
  phone: { type: String, required: true, trim: true, maxlength: 24 },
  qualification: { type: String, required: true, trim: true, maxlength: 180 },
  experience: { type: String, required: true, trim: true, maxlength: 80 },
  currentLocation: { type: String, required: true, trim: true, maxlength: 160 },
  socialUrl: { type: String, default: "", trim: true, maxlength: 400 },
  coverNote: { type: String, default: "", trim: true, maxlength: 2000 },
  resumeKey: { type: String, required: true },
  resumeFileName: { type: String, required: true, trim: true, maxlength: 240 },
  status: { type: String, enum: ["new", "reviewing", "shortlisted", "interview", "rejected", "hired"], default: "new", index: true },
  adminNotes: { type: String, default: "", maxlength: 3000 },
}, { timestamps: true });

jobApplicationSchema.index({ job: 1, email: 1 });

export default jobApplicationSchema;
