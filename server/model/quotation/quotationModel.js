import mongoose from "mongoose";
import { MASSCLICKQUOTATION } from "../../collectionName.js";
import quotationSchema from "../../schema/quotation/quotationSchema.js";

const quotationModel = mongoose.model(MASSCLICKQUOTATION, quotationSchema, MASSCLICKQUOTATION);

export default quotationModel;
