import mongoose from "mongoose";
import { EVENTADVERTISEMENT } from "../../collectionName.js";
import eventAdvertisementSchema from "../../schema/event/eventAdvertisementSchema.js";

const eventAdvertisementModel = mongoose.model(EVENTADVERTISEMENT, eventAdvertisementSchema);

export default eventAdvertisementModel;
