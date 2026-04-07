import mongoose from "mongoose";
import { MSGUSERS } from "../../collectionName.js";
import usersSchema from "../../schema/msg91Schema/usersSchema.js";

const message91Model = mongoose.model(MSGUSERS, usersSchema);

export default message91Model 
