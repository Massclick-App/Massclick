import mongoose from "mongoose";
import { JOBAPPLICATIONS } from "../../collectionName.js";
import jobApplicationSchema from "../../schema/hiring/jobApplicationSchema.js";

export default mongoose.models.jobapplication || mongoose.model("jobapplication", jobApplicationSchema, JOBAPPLICATIONS);
