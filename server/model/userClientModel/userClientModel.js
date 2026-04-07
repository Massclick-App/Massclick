import mongoose from "mongoose";
import { USERCLIENT } from "../../collectionName.js";

import userClientSchema from "../../schema/userClient/userClientSchema.js"

const userClientModel = mongoose.model(USERCLIENT, userClientSchema);

export default userClientModel; 
