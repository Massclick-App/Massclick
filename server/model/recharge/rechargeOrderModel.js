import mongoose from "mongoose";
import { RECHARGEORDER } from "../../collectionName.js";
import rechargeOrderSchema from "../../schema/recharge/rechargeOrderSchema.js";

const rechargeOrderModel = mongoose.model(RECHARGEORDER, rechargeOrderSchema);

export default rechargeOrderModel;
