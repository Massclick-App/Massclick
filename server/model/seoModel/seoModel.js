import mongoose from "mongoose";
import { SEODATAS } from "../../collectionName.js";
import seoSchema from "../../schema/seoSchema/seoSchema.js";

const seoModel = mongoose.model(SEODATAS, seoSchema);

export default seoModel;
