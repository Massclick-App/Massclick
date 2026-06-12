import mongoose from "mongoose";
import { MSG91WHATSAPPAUDIT } from "../../collectionName.js";
import whatsappMessageAuditSchema from "../../schema/msg91Schema/whatsappMessageAuditSchema.js";

const whatsappMessageAuditModel = mongoose.model(
  MSG91WHATSAPPAUDIT,
  whatsappMessageAuditSchema,
  MSG91WHATSAPPAUDIT
);

export default whatsappMessageAuditModel;
