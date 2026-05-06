import fcmCampaignModel from "../model/fcmCampaignModel/fcmCampaignModel.js";
import { executeFCMSend } from "../controller/fcmAdminController.js";

const POLL_INTERVAL_MS = 60_000; // check every minute

async function processScheduledCampaigns() {
  try {
    const now = new Date();
    const dueCampaigns = await fcmCampaignModel
      .find({ status: "scheduled", scheduledAt: { $lte: now } })
      .lean();

    for (const campaign of dueCampaigns) {
      // Atomically claim so concurrent restarts don't double-send
      const claimed = await fcmCampaignModel.findOneAndUpdate(
        { _id: campaign._id, status: "scheduled" },
        { $set: { status: "sent" } },
        { new: false }
      );
      if (!claimed) continue;

      try {
        const customData = campaign.customData instanceof Map
          ? Object.fromEntries(campaign.customData)
          : (campaign.customData || {});

        const result = await executeFCMSend({
          title: campaign.title,
          body: campaign.body,
          imageUrl: campaign.imageUrl || "",
          clickAction: campaign.clickAction || "",
          customData,
          targetType: campaign.targetType,
          targetPlatform: campaign.targetPlatform || "",
          targetUserId: campaign.targetUserId || null,
        });

        await fcmCampaignModel.findByIdAndUpdate(campaign._id, {
          status: "sent",
          sentAt: new Date(),
          totalTargeted: result.totalTargeted,
          successCount: result.successCount,
          failureCount: result.failureCount,
        });

        console.log(`[FCMScheduler] Sent campaign "${campaign.title}" → ${result.successCount}/${result.totalTargeted}`);
      } catch (err) {
        console.error(`[FCMScheduler] Failed to send campaign ${campaign._id}:`, err.message);
        await fcmCampaignModel.findByIdAndUpdate(campaign._id, { status: "failed" });
      }
    }
  } catch (err) {
    console.error("[FCMScheduler] Poll error:", err.message);
  }
}

export function startFCMScheduler() {
  // Run immediately on startup to catch any campaigns missed during downtime
  processScheduledCampaigns();
  setInterval(processScheduledCampaigns, POLL_INTERVAL_MS);
  console.log("[FCMScheduler] Started — polling every 60s");
}
