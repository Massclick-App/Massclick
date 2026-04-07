import mongoose from "mongoose";
import { MRPDATAS } from "../../collectionName.js";
import mrpSchema from "../../schema/MRP/MrpSchema.js";

const mrpModel = mongoose.model(MRPDATAS, mrpSchema);

export default mrpModel;
