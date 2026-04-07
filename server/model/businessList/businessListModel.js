import mongoose from "mongoose";
import { BUSINESSLIST } from "../../collectionName.js";

import businessListSchema from "../../schema/businessList/businessListSchema.js"

const businessListModel = mongoose.model(BUSINESSLIST, businessListSchema);

export default businessListModel; 
