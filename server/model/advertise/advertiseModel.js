import mongoose from "mongoose";
import { ADVERTISE } from "../../collectionName.js";

import advertiseSchema from "../../schema/advertise/advertiseSchema.js"

const advertiseModel = mongoose.model(ADVERTISE, advertiseSchema);

export default advertiseModel; 