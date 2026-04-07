import mongoose from "mongoose";
import { MESSAGE91 } from "../../collectionName.js";
import message91Schema from "../../schema/msg91Schema/msg91Schema.js";

const message91Model = mongoose.model(MESSAGE91, message91Schema);

export default message91Model 
