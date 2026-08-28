import mongoose from "mongoose";
import { DELAYEDLEADDISPATCHES } from "../../collectionName.js";
import delayedLeadDispatchSchema from "../../schema/businessList/delayedLeadDispatchSchema.js";

const delayedLeadDispatchModel = mongoose.model(
  DELAYEDLEADDISPATCHES,
  delayedLeadDispatchSchema,
);

export default delayedLeadDispatchModel;
