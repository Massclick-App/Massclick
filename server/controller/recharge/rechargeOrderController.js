import { createRechargeOrderPayment, checkRechargeOrderPaymentStatus } from "../../helper/recharge/rechargeOrderPaymentHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

export const createRechargeOrderAction = async (req, res) => {
  try {
    const { serviceSlug, serviceName, serviceGroup, billDetails, amount } = req.body;
    const result = await createRechargeOrderPayment({ serviceSlug, serviceName, serviceGroup, billDetails, amount });
    res.send(result);
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || BAD_REQUEST.code).send(error.message);
  }
};

export const checkRechargeOrderStatusAction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const result = await checkRechargeOrderPaymentStatus(transactionId);
    res.send(result);
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || BAD_REQUEST.code).send(error.message);
  }
};
