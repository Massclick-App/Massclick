import mongoose from "mongoose";
import { BUSINESSREVIEW } from "../../collectionName.js";

import businessReviewSchema from "../../schema/businessReview/businessReviewSchema.js"

const businessReviewModel = mongoose.model(BUSINESSREVIEW, businessReviewSchema);

export default businessReviewModel; 
