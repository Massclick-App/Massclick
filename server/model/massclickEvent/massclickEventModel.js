import mongoose from "mongoose";
import massclickEventSchema from "../../schema/massclickEvent/massclickEventSchema.js";
import { MASSCLICKEVENTS } from "../../collectionName.js";

const massclickEventModel = mongoose.model(MASSCLICKEVENTS, massclickEventSchema);

export default massclickEventModel;
