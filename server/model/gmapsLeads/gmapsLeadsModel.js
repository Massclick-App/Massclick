import mongoose from "mongoose";
import { GMAPSLEADS } from "../../collectionName.js";
import gmapsLeadsSchema from "../../schema/gmapsLeads/gmapsLeadsSchema.js";

const gmapsLeadsModel = mongoose.model(GMAPSLEADS, gmapsLeadsSchema);

export default gmapsLeadsModel;
