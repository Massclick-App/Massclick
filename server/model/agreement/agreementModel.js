import mongoose from "mongoose";
import { MASSCLICKAGREEMENT } from "../../collectionName.js";
import agreementSchema from "../../schema/agreement/agreementSchema.js";

const agreementModel = mongoose.model(
  MASSCLICKAGREEMENT,
  agreementSchema,
  MASSCLICKAGREEMENT,
);

export default agreementModel;
