import mongoose from "mongoose";
import { ROLES } from "../../collectionName.js";

import rolesSchema from "../../schema/roles/rolesSchema.js"

const rolesModel = mongoose.model(ROLES, rolesSchema);

export default rolesModel; 
