import mongoose from "mongoose";
import { AUTHAUDITEVENTS } from "../collectionName.js";
import authAuditSchema from "../schema/authAuditSchema.js";

const authAuditModel = mongoose.model(AUTHAUDITEVENTS, authAuditSchema);

export default authAuditModel;
