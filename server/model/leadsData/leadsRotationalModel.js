import mongoose from "mongoose";
import { LEADROTATION } from "../../collectionName.js";

import leadsRotationSchema from "../../schema/leadsData/leadsRotationSchema.js"

const leadsRotationModel = mongoose.model(LEADROTATION, leadsRotationSchema);

export default leadsRotationModel; 