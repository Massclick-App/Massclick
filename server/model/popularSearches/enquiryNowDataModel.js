import mongoose from "mongoose";
import { ENQUIRYNOWDATAS } from "../../collectionName.js";
import enquiryNowDataSchema from "../../schema/popularSearches/enquiryNowDataSchema.js";

const enquiryNowDataModel = mongoose.model(ENQUIRYNOWDATAS, enquiryNowDataSchema);

export default enquiryNowDataModel;
