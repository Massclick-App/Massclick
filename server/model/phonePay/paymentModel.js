import mongoose from "mongoose";
import { PAYMENT } from "../../collectionName.js";
import paymentSchema from "../../schema/phonePay/paymentSchema.js";

const paymentModel = mongoose.model(PAYMENT, paymentSchema);

export default paymentModel 
