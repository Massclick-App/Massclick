import mongoose from "mongoose";
import { EVENTLOCATION } from "../../collectionName.js";
import eventLocationSchema from "../../schema/event/eventLocationSchema.js";

const eventLocationModel = mongoose.model(EVENTLOCATION, eventLocationSchema);

export default eventLocationModel;
