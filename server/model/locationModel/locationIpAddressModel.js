import mongoose from "mongoose";
import { LOCATIONIP } from "../../collectionName.js";

import ipLocationSchema from "../../schema/location/locationIpAddressSchema.js"

const locationIpModel = mongoose.model(LOCATIONIP, ipLocationSchema);

export default locationIpModel; 
