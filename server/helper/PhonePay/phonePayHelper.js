import crypto from "crypto";
import axios from "axios";
import paymentModel from "../../model/phonePay/paymentModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";

const {
  PHONEPE_MERCHANT_ID,
  PHONEPE_SALT_KEY,
  PHONEPE_SALT_INDEX,
  PHONEPE_BASE_URL,
  FRONTEND_URL,
} = process.env;

export const createPhonePePayment = async (amount, userId, businessId = null) => {
  try {
    if (!amount || isNaN(amount)) {
      throw new Error("Invalid amount value");
    }

    const transactionId = `txn_${Date.now()}`;

    const gstAmount = parseFloat((amount * 0.18).toFixed(2));
    const totalAmount = parseFloat((amount + gstAmount).toFixed(2));

    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: userId || "guest_user",
      amount: totalAmount * 100,
      redirectUrl: `${FRONTEND_URL}/payment-status/${transactionId}`,
      redirectMode: "REDIRECT",
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const data = Buffer.from(JSON.stringify(payload)).toString("base64");
    const checksum =
      crypto
        .createHash("sha256")
        .update(data + "/pg/v1/pay" + PHONEPE_SALT_KEY)
        .digest("hex") +
      "###" +
      PHONEPE_SALT_INDEX;

    const response = await axios.post(
      `${PHONEPE_BASE_URL}/pg/v1/pay`,
      { request: data },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          accept: "application/json",
        },
      }
    );

    const paymentUrl =
      response.data?.data?.instrumentResponse?.redirectInfo?.url || "";
    const qrString =
      response.data?.data?.instrumentResponse?.redirectInfo?.qrCode || "";

    const paymentDoc = await paymentModel.create({
      userId,
      businessId,
      transactionId,
      amount,
      gstAmount,
      totalAmount,
      paymentUrl,
      qrString,
      paymentStatus: "PENDING",
      paymentGateway: "phonepe",
    });

    if (businessId) {
  const existingBusiness = await businessListModel.findById(businessId).lean();

  if (existingBusiness?.payment && existingBusiness.payment.length > 0) {
    await businessListModel.updateOne(
      { _id: businessId },
      {
        $set: {
          "payment.0": {
            userId,
            businessId,
            transactionId,
            orderId: null,
            amount,
            gstAmount,
            totalAmount,
            paymentGateway: "phonepe",
            paymentStatus: "PENDING",
            paymentDate: null,
            responseData: {},
          },
        },
      }
    );
  } else {
    await businessListModel.findByIdAndUpdate(
      businessId,
      {
        $set: {
          payment: [
            {
              userId,
              businessId,
              transactionId,
              orderId: null,
              amount,
              gstAmount,
              totalAmount,
              paymentGateway: "phonepe",
              paymentStatus: "PENDING",
              paymentDate: null,
              responseData: {},
            },
          ],
        },
      },
      { new: true, useFindAndModify: false }
    );
  }
}


    return {
      success: true,
      message: "Payment created successfully",
      transactionId,
      totalAmount,
      paymentUrl,
      qrString,
    };
  } catch (error) {
    console.error("Error creating PhonePe payment:", error.response?.data || error);
    throw new Error("PhonePe payment creation failed");
  }
};


export const checkPhonePeStatus = async (transactionId) => {
  try {
    const checksum =
      crypto
        .createHash("sha256")
        .update(`/pg/v1/status/${PHONEPE_MERCHANT_ID}/${transactionId}` + PHONEPE_SALT_KEY)
        .digest("hex") +
      "###" +
      PHONEPE_SALT_INDEX;

    const response = await axios.get(
      `${PHONEPE_BASE_URL}/pg/v1/status/${PHONEPE_MERCHANT_ID}/${transactionId}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": PHONEPE_MERCHANT_ID,
        },
      }
    );

    const status = response.data?.data?.state || "FAILED";

    const updated = await paymentModel.findOneAndUpdate(
      { transactionId },
      {
        paymentStatus: status === "COMPLETED" ? "SUCCESS" : status,
        responseData: response.data,
        paymentDate: new Date(),
      },
      { new: true }
    );

    return {
      success: true,
      transactionId,
      paymentStatus: updated?.paymentStatus || "UNKNOWN",
      phonePeResponse: response.data,
    };
  } catch (error) {
    console.error("Error checking PhonePe status:", error.response?.data || error);
    throw new Error("PhonePe payment status check failed");
  }
};
