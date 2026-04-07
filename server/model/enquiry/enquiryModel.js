import mongoose from "mongoose";
import { ENQUIRY } from "../../collectionName.js";

import enquirySchema from "../../schema/enquiry/enquiry.js"

const enquiryModel = mongoose.model(ENQUIRY, enquirySchema);

export default enquiryModel; 
