import mongoose from "mongoose";
import { LOCATION } from "../../collectionName.js";

import locationSchemaSchema from "../../schema/location/locationSchema.js"

const locationModel = mongoose.model(LOCATION, locationSchemaSchema);

export default locationModel; 
