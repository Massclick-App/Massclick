import mongoose from "mongoose";
import { MASSCLICKAGREEMENTCOUNTER } from "../../collectionName.js";
import agreementCounterSchema from "../../schema/agreement/agreementCounterSchema.js";

const agreementCounterModel = mongoose.model(
  MASSCLICKAGREEMENTCOUNTER,
  agreementCounterSchema,
  MASSCLICKAGREEMENTCOUNTER,
);

export default agreementCounterModel;
