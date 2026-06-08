import mongoose from "mongoose";
import { CHATMESSAGE } from "../../collectionName.js";
import chatMessageSchema from "../../schema/chat/chatMessageSchema.js";

const chatMessageModel = mongoose.model(CHATMESSAGE, chatMessageSchema);

export default chatMessageModel;
