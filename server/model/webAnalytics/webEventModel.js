import mongoose from "mongoose";
import { WEBANALYTICSEVENT } from "../../collectionName.js";

import webEventSchema from "../../schema/webAnalytics/webEventSchema.js";

const webEventModel = mongoose.model(WEBANALYTICSEVENT, webEventSchema);

export default webEventModel;
