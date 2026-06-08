import mongoose from "mongoose";
import { CHATCONVERSATION } from "../../collectionName.js";
import chatConversationSchema from "../../schema/chat/chatConversationSchema.js";

const chatConversationModel = mongoose.model(CHATCONVERSATION, chatConversationSchema);

export default chatConversationModel;
