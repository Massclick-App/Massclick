import cron from "node-cron";
import searchLogModel from "../model/businessList/searchLogModel.js";
import { sendWhatsAppMessage } from "../helper/msg91/smsGatewayHelper.js";

export const startWhatsAppCron = () => {
  cron.schedule("*/1 * * * *", async () => {
    console.log("🔁 WhatsApp Cron Running");

    const leads = await searchLogModel.find({
      whatsapp: false,
      "userDetails.0.mobileNumber1": { $exists: true }
    }).limit(5);

    for (const lead of leads) {
      try {
        const user = lead.userDetails[0];

        await sendWhatsAppMessage(user.mobileNumber1, {
          name: user.userName || "Customer",
          message: `We noticed you searched for "${lead.searchedUserText}".`
        });

        await searchLogModel.updateOne(
          { _id: lead._id },
          {
            $set: {
              whatsapp: true,
              whatsappSentAt: new Date(),
              whatsappMeta: {
                provider: "MSG91",
                status: "sent"
              }
            }
          }
        );

      } catch (err) {
        await searchLogModel.updateOne(
          { _id: lead._id },
          {
            $set: {
              whatsappMeta: {
                provider: "MSG91",
                status: "failed",
                error: err.message
              }
            }
          }
        );

        console.error("❌ WhatsApp failed:", err.message);
      }
    }
  });
};
