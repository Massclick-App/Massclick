import mongoose from "mongoose";
import { MASSCLICKQUOTATIONCOUNTER } from "../../collectionName.js";
import quotationCounterSchema from "../../schema/quotation/quotationCounterSchema.js";

const quotationCounterModel = mongoose.model(
  MASSCLICKQUOTATIONCOUNTER,
  quotationCounterSchema,
  MASSCLICKQUOTATIONCOUNTER
);

export default quotationCounterModel;
