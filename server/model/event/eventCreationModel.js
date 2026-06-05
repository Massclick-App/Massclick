import mongoose from "mongoose";
import { EVENTCREATION } from "../../collectionName.js";
import eventCreationSchema from "../../schema/event/eventCreationSchema.js";

const eventCreationModel = mongoose.model(EVENTCREATION, eventCreationSchema);

export default eventCreationModel;
