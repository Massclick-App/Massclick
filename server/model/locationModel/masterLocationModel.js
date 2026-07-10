import mongoose from "mongoose";
import { MASTERLOCATION } from "../../collectionName.js";

import masterLocationSchema from "../../schema/location/masterLocationSchema.js"

const masterLocationModel = mongoose.model(MASTERLOCATION, masterLocationSchema);

export default masterLocationModel;
