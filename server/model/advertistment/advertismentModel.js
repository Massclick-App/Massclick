import mongoose from "mongoose";
import { ADVERTISMENTS } from "../../collectionName.js";

import advertistmentSchema from "../../schema/advertistment/advertistmentSchema.js"

const advertismentModel = mongoose.model(ADVERTISMENTS, advertistmentSchema);

export default advertismentModel; 