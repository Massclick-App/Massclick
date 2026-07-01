import crypto from "crypto";
import axios from "axios";
import paymentModel from "../../model/phonePay/paymentModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { sendInvoiceEmail } from "../email/emailService.js";
import { CERTIFICATE_TEMPLATE_VERSION, ensureBusinessCertificates } from "../businessList/businessCertificateHelper.js";

const {
  PHONEPE_MERCHANT_ID,
  PHONEPE_SALT_KEY,
  PHONEPE_SALT_INDEX,
  PHONEPE_BASE_URL,
  FRONTEND_URL,
} = process.env;

export const createPhonePePayment = async (amount, userId, businessId = null) => {
  try {
    console.log(`💳 [PhonePe Payment] Creating payment - Amount: ₹${amount}, UserId: ${userId}, BusinessId: ${businessId}`);
    if (!amount || isNaN(amount)) {
      console.error(`❌ [PhonePe Payment] Invalid amount: ${amount}`);
      throw new Error("Invalid amount value");
    }

    const transactionId = `txn_${Date.now()}`;
    console.log(`🆔 [PhonePe Payment] Generated TransactionId: ${transactionId}`);

    const gstAmount = parseFloat((amount * 0.18).toFixed(2));
    const totalAmount = parseFloat((amount + gstAmount).toFixed(2));
    console.log(`💰 [PhonePe Payment] Amount Breakdown - Base: ₹${amount}, GST(18%): ₹${gstAmount}, Total: ₹${totalAmount}`);

    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: userId || "guest_user",
      amount: totalAmount * 100,
      redirectUrl: `${FRONTEND_URL}/payment-status/${transactionId}`,
      redirectMode: "REDIRECT",
      paymentInstrument: { type: "PAY_PAGE" },
    };

    console.log(`📤 [PhonePe Payment] Sending payment request to PhonePe API`);
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

    console.log(`📥 [PhonePe Payment] Received response from PhonePe API`);

    const paymentUrl =
      response.data?.data?.instrumentResponse?.redirectInfo?.url || "";
    const qrString =
      response.data?.data?.instrumentResponse?.redirectInfo?.qrCode || "";

    console.log(`🎫 [PhonePe Payment] Creating payment record in database`);
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

    console.log(`✅ [PhonePe Payment] Payment record created - ID: ${paymentDoc._id}, Status: PENDING`);

    if (businessId) {
  console.log(`🏢 [PhonePe Payment] Updating business record with payment details - BusinessId: ${businessId}`);
  const existingBusiness = await businessListModel.findById(businessId).lean();

  if (existingBusiness?.payment && existingBusiness.payment.length > 0) {
    console.log(`📝 [PhonePe Payment] Business has existing payment records, updating first entry`);
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
    console.log(`✅ [PhonePe Payment] Updated existing payment record`);
  } else {
    console.log(`📝 [PhonePe Payment] Business has no payment records, creating new array`);
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
    console.log(`✅ [PhonePe Payment] Created new payment array`);
  }
}


    console.log(`✅ [PhonePe Payment] Payment creation completed successfully - TxnID: ${transactionId}, Amount: ₹${totalAmount}`);

    // Check if payment status is already successful and send email
    const paymentState = response.data?.data?.state;
    console.log(`📊 [PhonePe Payment] Payment state from API: ${paymentState}`);

    if (paymentState === "COMPLETED" && businessId) {
      try {
        console.log(`✅ [PhonePe Payment] Payment already COMPLETED, sending invoice email immediately`);
        const businessData = await businessListModel.findById(businessId).lean();
        if (businessData) {
          const emailResult = await sendInvoiceEmail(businessData, paymentDoc);
          console.log(`📧 [PhonePe Payment] Invoice email result: ${emailResult.success ? 'SUCCESS' : 'FAILED'}`);
          if (emailResult.success) {
            const invoiceEmailSentAt = new Date();
            await paymentModel.updateOne(
              { _id: paymentDoc._id },
              { $set: { invoiceEmailSent: true, invoiceEmailSentAt } }
            );
            await businessListModel.updateOne(
              { _id: businessId, "payment.transactionId": transactionId },
              {
                $set: {
                  "payment.$.invoiceEmailSent": true,
                  "payment.$.invoiceEmailSentAt": invoiceEmailSentAt,
                },
              }
            );
          }
        }
      } catch (emailError) {
        console.error(`⚠️ [PhonePe Payment] Failed to send email on payment creation:`, emailError.message);
      }
    }

    console.log(`🔗 [PhonePe Payment] Payment URL generated, ready for redirect`);
    return {
      success: true,
      message: "Payment created successfully",
      transactionId,
      totalAmount,
      paymentUrl,
      qrString,
    };
  } catch (error) {
    console.error(`❌ [PhonePe Payment] Error creating PhonePe payment:`, {
      errorMessage: error.message,
      errorCode: error.code,
      statusCode: error.response?.status,
      responseData: error.response?.data,
      amount,
      userId,
      businessId,
      errorStack: error.stack,
    });
    throw new Error("PhonePe payment creation failed");
  }
};


export const checkPhonePeStatus = async (transactionId) => {
  try {
    console.log(`🔍 [PhonePe Status] Checking payment status for transaction: ${transactionId}`);
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
    const normalizedPaymentStatus = status === "COMPLETED" ? "SUCCESS" : status;
    const paymentDate = new Date();

    console.log(`📊 [PhonePe Status] Transaction ${transactionId} - Status: ${normalizedPaymentStatus}`);

    const updated = await paymentModel.findOneAndUpdate(
      { transactionId },
      {
        paymentStatus: normalizedPaymentStatus,
        responseData: response.data,
        paymentDate,
      },
      { new: true }
    );

    console.log(`💾 [Payment DB] Updated payment record - TxnID: ${transactionId}, Status: ${normalizedPaymentStatus}`);

    if (updated?.businessId) {
      console.log(`🏢 [Business Update] Updating business record for businessId: ${updated.businessId}`);
      const paymentEntryPatch = {
        "payment.$.paymentStatus": normalizedPaymentStatus,
        "payment.$.paymentDate": paymentDate,
        "payment.$.responseData": response.data,
      };

      if (normalizedPaymentStatus === "SUCCESS") {
        paymentEntryPatch["payment.$.paid"] = true;
      }

      const businessResult = await businessListModel.updateOne(
        {
          _id: updated.businessId,
          "payment.transactionId": transactionId,
        },
        {
          $set: {
            ...paymentEntryPatch,
            ...(normalizedPaymentStatus === "SUCCESS"
              ? {
                  amountPaid: true,
                  paidDate: paymentDate,
                  businessesLive: true,
                  "subscription.isActive": true,
                  "subscription.startDate": paymentDate,
                }
              : {}),
          },
        }
      );

      console.log(`✅ [Business Update] Business record updated - Matched: ${businessResult.matchedCount}, Modified: ${businessResult.modifiedCount}`);

      if (!businessResult.matchedCount && normalizedPaymentStatus === "SUCCESS") {
        console.log(`⚠️ [Business Update] Payment record not found in array, applying fallback update`);
        await businessListModel.updateOne(
          { _id: updated.businessId },
          {
            $set: {
              amountPaid: true,
              paidDate: paymentDate,
              businessesLive: true,
              "subscription.isActive": true,
              "subscription.startDate": paymentDate,
            },
          }
        );
        console.log(`✅ [Business Update] Fallback update completed for businessId: ${updated.businessId}`);
      }

      // Send invoice email on successful payment
      if (normalizedPaymentStatus === "SUCCESS" && !updated.invoiceEmailSent) {
        try {
          console.log(`💰 [Payment Success] Sending invoice email for business: ${updated.businessId}`);
          const businessData = await businessListModel.findById(updated.businessId).lean();
          if (businessData) {
            console.log(`📄 [Invoice Email] Triggering email service for: ${businessData.businessName} (${businessData.email})`);
            const emailResult = await sendInvoiceEmail(businessData, updated);
            if (emailResult.success) {
              console.log(`✅ [Invoice Email] Email delivered successfully - MessageID: ${emailResult.messageId}`);
              const invoiceEmailSentAt = new Date();
              await paymentModel.updateOne(
                { _id: updated._id },
                { $set: { invoiceEmailSent: true, invoiceEmailSentAt } }
              );
              await businessListModel.updateOne(
                {
                  _id: updated.businessId,
                  "payment.transactionId": transactionId,
                },
                {
                  $set: {
                    "payment.$.invoiceEmailSent": true,
                    "payment.$.invoiceEmailSentAt": invoiceEmailSentAt,
                  },
                }
              );
            } else {
              console.warn(`⚠️ [Invoice Email] Email sending failed - ${emailResult.message}`);
            }
          } else {
            console.warn(`⚠️ [Invoice Email] Business data not found for ID: ${updated.businessId}`);
          }
        } catch (emailError) {
          console.error(`❌ [Invoice Email] Exception occurred while sending invoice email:`, {
            businessId: updated.businessId,
            transactionId: transactionId,
            errorMessage: emailError.message,
            errorStack: emailError.stack,
          });
        }
      } else if (normalizedPaymentStatus === "SUCCESS") {
        console.log(`📧 [Invoice Email] Skipped duplicate invoice email for transaction: ${transactionId}`);
      }
    }

    console.log(`✅ [PhonePe Status] Payment check completed successfully - TxnID: ${transactionId}, Status: ${updated?.paymentStatus || "UNKNOWN"}`);
    return {
      success: true,
      transactionId,
      paymentStatus: updated?.paymentStatus || "UNKNOWN",
      phonePeResponse: response.data,
    };
  } catch (error) {
    console.error(`❌ [PhonePe Status] Error checking PhonePe status for transaction ${transactionId}:`, {
      errorMessage: error.message,
      errorCode: error.code,
      statusCode: error.response?.status,
      responseData: error.response?.data,
      errorStack: error.stack,
    });
    throw new Error("PhonePe payment status check failed");
  }
};

export const sendInvoiceEmailForBusiness = async (businessId) => {
  try {
    console.log(`📧 [Manual Invoice Email] Sending invoice email for businessId: ${businessId}`);

    const businessData = await businessListModel.findById(businessId).lean();

    if (!businessData) {
      console.warn(`⚠️ [Manual Invoice Email] Business not found: ${businessId}`);
      return {
        success: false,
        message: 'Business not found',
      };
    }

    if (!businessData.email) {
      console.warn(`⚠️ [Manual Invoice Email] No email found for business: ${businessData.businessName}`);
      return {
        success: false,
        message: 'No email address found for business',
      };
    }

    // Get the latest payment record
    const latestPayment = businessData.payment?.[0];

    if (!latestPayment) {
      console.warn(`⚠️ [Manual Invoice Email] No payment record found for business: ${businessData.businessName}`);
      return {
        success: false,
        message: 'No payment record found for this business',
      };
    }

    const storedCertificateVersion = Number(businessData.certificates?.templateVersion || 0);
    const shouldResendForCertificateRefresh =
      latestPayment.invoiceEmailSent && storedCertificateVersion < CERTIFICATE_TEMPLATE_VERSION;

    if (latestPayment.invoiceEmailSent && !shouldResendForCertificateRefresh) {
      console.log(`📧 [Manual Invoice Email] Invoice email already sent for business: ${businessData.businessName}`);
      return {
        success: true,
        message: 'Invoice email already sent',
        alreadySent: true,
      };
    }

    if (shouldResendForCertificateRefresh) {
      console.log(`📧 [Manual Invoice Email] Resending invoice once to attach refreshed certificate template for business: ${businessData.businessName}`);
      await ensureBusinessCertificates(businessData);
    }

    console.log(`💾 [Manual Invoice Email] Found payment record - TxnID: ${latestPayment.transactionId}`);
    const emailResult = await sendInvoiceEmail(businessData, latestPayment);

    if (emailResult.success) {
      console.log(`✅ [Manual Invoice Email] Email sent successfully - MessageID: ${emailResult.messageId}`);
      const invoiceEmailSentAt = new Date();
      await businessListModel.updateOne(
        {
          _id: businessId,
          "payment.transactionId": latestPayment.transactionId,
        },
        {
          $set: {
            "payment.$.invoiceEmailSent": true,
            "payment.$.invoiceEmailSentAt": invoiceEmailSentAt,
          },
        }
      );
      await paymentModel.updateOne(
        { transactionId: latestPayment.transactionId },
        { $set: { invoiceEmailSent: true, invoiceEmailSentAt } }
      );
    } else {
      console.error(`❌ [Manual Invoice Email] Failed to send email - ${emailResult.message}`);
    }

    return emailResult;
  } catch (error) {
    console.error(`❌ [Manual Invoice Email] Exception occurred:`, {
      businessId,
      errorMessage: error.message,
      errorStack: error.stack,
    });
    return {
      success: false,
      message: 'Failed to send invoice email',
      error: error.message,
    };
  }
};
