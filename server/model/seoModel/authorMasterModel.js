import mongoose from "mongoose";
import { AUTHORMASTER } from "../../collectionName.js";
import authorMasterSchema from "../../schema/seoSchema/authorMasterSchema.js";

const authorMasterModel = mongoose.model(AUTHORMASTER, authorMasterSchema);

export default authorMasterModel;
