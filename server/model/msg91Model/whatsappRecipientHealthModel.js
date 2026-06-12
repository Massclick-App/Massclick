import mongoose from "mongoose";
import { MSG91RECIPIENTHEALTH } from "../../collectionName.js";
import whatsappRecipientHealthSchema from "../../schema/msg91Schema/whatsappRecipientHealthSchema.js";

const whatsappRecipientHealthModel = mongoose.model(MSG91RECIPIENTHEALTH, whatsappRecipientHealthSchema);

export default whatsappRecipientHealthModel;
