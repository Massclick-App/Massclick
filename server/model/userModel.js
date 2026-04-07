import mongoose from "mongoose";
import { USER } from "../collectionName.js";

import userSchema from "../schema/userSchema.js"

const userModel = mongoose.model(USER, userSchema);

export default userModel; 
