import mongoose from "mongoose";

const jobVacancySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  slug: { type: String, required: true, trim: true, lowercase: true, index: true },
  department: { type: String, required: true, trim: true, maxlength: 100 },
  location: { type: String, required: true, trim: true, maxlength: 120 },
  employmentType: { type: String, enum: ["Full time", "Part time", "Contract", "Internship"], default: "Full time" },
  workplaceType: { type: String, enum: ["On-site", "Remote", "Hybrid"], default: "On-site" },
  experience: { type: String, default: "", trim: true, maxlength: 80 },
  qualification: { type: String, default: "", trim: true, maxlength: 180 },
  summary: { type: String, required: true, trim: true, maxlength: 600 },
  description: { type: String, required: true, trim: true, maxlength: 12000 },
  responsibilities: { type: [String], default: [] },
  requirements: { type: [String], default: [] },
  status: { type: String, enum: ["draft", "published", "closed"], default: "draft", index: true },
  applicationDeadline: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
}, { timestamps: true });

jobVacancySchema.index({ slug: 1, status: 1 });
jobVacancySchema.index({ department: 1, location: 1, status: 1 });

export default jobVacancySchema;
