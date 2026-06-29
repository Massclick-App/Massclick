import { createPhonePePayment, checkPhonePeStatus, sendInvoiceEmailForBusiness } from "../../helper/PhonePay/phonePayHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

export const createPaymentAction = async (req, res) => {
  try {
    const { amount, userId, businessId } = req.body;
    const result = await createPhonePePayment(amount, userId, businessId);
    res.send(result);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send(error.message);
  }
};

export const checkPaymentStatusAction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const result = await checkPhonePeStatus(transactionId);
    res.send(result);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send(error.message);
  }
};

export const sendInvoiceEmailAction = async (req, res) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(BAD_REQUEST.code).send("Business ID is required");
    }
    const result = await sendInvoiceEmailForBusiness(businessId);
    res.send(result);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send(error.message);
  }
};
