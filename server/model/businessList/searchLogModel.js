import mongoose from "mongoose";
import { LOGSEARCH } from "../../collectionName.js";

import searchLogSchema from "../../schema/businessList/searchLogSchema.js"

const searchLogModel = mongoose.model(LOGSEARCH, searchLogSchema);

export default searchLogModel; 
