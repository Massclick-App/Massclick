import mongoose from "mongoose";
import { USERFEEDBACKS } from "../../collectionName.js";
import userFeedbackSchema from "../../schema/userFeedback/userFeedbackSchema.js";

const userFeedbackModel =
  mongoose.models[USERFEEDBACKS] ||
  mongoose.model(USERFEEDBACKS, userFeedbackSchema);

export default userFeedbackModel;
