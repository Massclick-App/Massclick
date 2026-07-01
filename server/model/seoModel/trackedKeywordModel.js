import mongoose from "mongoose";
import { TRACKEDKEYWORD } from "../../collectionName.js";
import trackedKeywordSchema from "../../schema/seoSchema/trackedKeywordSchema.js";

const trackedKeywordModel = mongoose.model(TRACKEDKEYWORD, trackedKeywordSchema);

export default trackedKeywordModel;
