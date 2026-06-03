import mongoose from "mongoose";
import { EVENTCATEGORY } from "../../collectionName.js";
import eventCategorySchema from "../../schema/event/eventCategorySchema.js";

const eventCategoryModel = mongoose.model(EVENTCATEGORY, eventCategorySchema);

export default eventCategoryModel;
