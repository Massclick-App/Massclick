import mongoose from "mongoose";
import { JOBVACANCIES } from "../../collectionName.js";
import jobVacancySchema from "../../schema/hiring/jobVacancySchema.js";

export default mongoose.models.jobvacancy || mongoose.model("jobvacancy", jobVacancySchema, JOBVACANCIES);
