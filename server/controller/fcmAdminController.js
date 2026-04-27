import admin from "../helper/firebaseInit.js";
import userModel from "../model/msg91Model/usersModels.js";
import fcmCampaignModel from "../model/fcmCampaignModel/fcmCampaignModel.js";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from "../errorCodes.js";
import { uploadImageToS3, getSignedUrlByKey } from "../s3Uploder.js";

// ─── Shared send logic ────────────────────────────────────────────────────────

export async function executeFCMSend({ title, body, imageUrl = "", clickAction = "", customData = {}, targetType, targetPlatform = "", targetUserId = null }) {
  const now = new Date();
  let tokens = [];

  if (targetType === "specific_user") {
    const user = await userModel.findById(targetUserId).select("fcmTokens").lean();
    if (!user) throw new Error("User not found");
    tokens = user.fcmTokens
      .filter((t) => t.isActive && new Date(t.expiresAt) > now)
      .map((t) => t.token);
  } else {
    const query = {
      fcmTokens: { $elemMatch: { isActive: true, expiresAt: { $gt: now } } },
    };
    if (targetType === "platform") {
      query.fcmTokens.$elemMatch.platform = targetPlatform;
    }
    const users = await userModel.find(query).select("fcmTokens").lean();
    users.forEach((u) => {
      u.fcmTokens
        .filter((t) => {
          if (!t.isActive || new Date(t.expiresAt) <= now) return false;
          if (targetType === "platform" && t.platform !== targetPlatform) return false;
          return true;
        })
        .forEach((t) => tokens.push(t.token));
    });
  }

  if (tokens.length === 0) throw new Error("No active FCM tokens found for the selected target");

  const dataPayload = {};
  if (clickAction) dataPayload.clickAction = clickAction;
  if (imageUrl) dataPayload.imageUrl = imageUrl;
  Object.entries(customData).forEach(([k, v]) => {
    if (k && v !== undefined && v !== null) dataPayload[k] = String(v);
  });

  const messageBase = {
    notification: { title, body, ...(imageUrl && { imageUrl }) },
    data: dataPayload,
    android: {
      notification: {
        channelId: "massclick_marketing",
        ...(imageUrl && { imageUrl }),
      },
    },
  };

  const CHUNK_SIZE = 500;
  let totalSuccess = 0;
  let totalFailure = 0;

  for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
    const chunk = tokens.slice(i, i + CHUNK_SIZE);
    const response = await admin.messaging().sendEachForMulticast({ ...messageBase, tokens: chunk });
    totalSuccess += response.successCount;
    totalFailure += response.failureCount;
  }

  return { totalTargeted: tokens.length, successCount: totalSuccess, failureCount: totalFailure };
}

// ─── GET /api/admin/fcm/users-with-tokens ─────────────────────────────────────

export const getUsersWithFCMTokensAction = async (req, res) => {
  try {
    const now = new Date();
    const users = await userModel
      .find({ fcmTokens: { $elemMatch: { isActive: true, expiresAt: { $gt: now } } } })
      .select("_id userName mobileNumber1 email fcmTokens")
      .lean();

    const result = users.map((u) => {
      const activeTokens = u.fcmTokens.filter(
        (t) => t.isActive && new Date(t.expiresAt) > now
      );
      return {
        _id: u._id,
        userName: u.userName || "Unknown",
        mobileNumber1: u.mobileNumber1,
        email: u.email || "",
        activeTokenCount: activeTokens.length,
        platforms: [...new Set(activeTokens.map((t) => t.platform))],
      };
    });

    return res.status(OK.code).json({ success: true, data: result, total: result.length });
  } catch (error) {
    console.error("getUsersWithFCMTokensAction error:", error);
    return res.status(INTERNAL_SERVER_ERROR.code).json({ success: false, message: "Failed to fetch users with FCM tokens" });
  }
};

// ─── POST /api/admin/fcm/send-marketing ──────────────────────────────────────

export const sendMarketingNotificationAction = async (req, res) => {
  try {
    const {
      title, body,
      imageUrl = "", clickAction = "",
      customData = {},
      targetType, targetPlatform = "",
      targetUserId = null, targetUserName = "",
    } = req.body;

    if (!title || !body)
      return res.status(BAD_REQUEST.code).json({ success: false, message: "title and body are required" });

    if (!["all", "platform", "specific_user"].includes(targetType))
      return res.status(BAD_REQUEST.code).json({ success: false, message: "Invalid targetType" });

    if (targetType === "platform" && !["android", "ios", "web"].includes(targetPlatform))
      return res.status(BAD_REQUEST.code).json({ success: false, message: "Invalid targetPlatform" });

    if (targetType === "specific_user" && !targetUserId)
      return res.status(BAD_REQUEST.code).json({ success: false, message: "targetUserId is required" });

    const result = await executeFCMSend({ title, body, imageUrl, clickAction, customData, targetType, targetPlatform, targetUserId });

    await fcmCampaignModel.create({
      title, body, imageUrl, clickAction, customData,
      targetType, targetPlatform,
      targetUserId: targetUserId || null, targetUserName,
      status: "sent",
      sentAt: new Date(),
      totalTargeted: result.totalTargeted,
      successCount: result.successCount,
      failureCount: result.failureCount,
    });

    return res.status(OK.code).json({ success: true, message: "Notification sent", ...result });
  } catch (error) {
    console.error("sendMarketingNotificationAction error:", error);
    return res.status(INTERNAL_SERVER_ERROR.code).json({ success: false, message: error.message || "Failed to send notification" });
  }
};

// ─── POST /api/admin/fcm/schedule-marketing ──────────────────────────────────

export const scheduleMarketingNotificationAction = async (req, res) => {
  try {
    const {
      title, body,
      imageUrl = "", clickAction = "",
      customData = {},
      targetType, targetPlatform = "",
      targetUserId = null, targetUserName = "",
      scheduledAt,
    } = req.body;

    if (!title || !body)
      return res.status(BAD_REQUEST.code).json({ success: false, message: "title and body are required" });

    if (!["all", "platform", "specific_user"].includes(targetType))
      return res.status(BAD_REQUEST.code).json({ success: false, message: "Invalid targetType" });

    if (targetType === "platform" && !["android", "ios", "web"].includes(targetPlatform))
      return res.status(BAD_REQUEST.code).json({ success: false, message: "Invalid targetPlatform" });

    if (targetType === "specific_user" && !targetUserId)
      return res.status(BAD_REQUEST.code).json({ success: false, message: "targetUserId is required" });

    if (!scheduledAt)
      return res.status(BAD_REQUEST.code).json({ success: false, message: "scheduledAt is required" });

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date())
      return res.status(BAD_REQUEST.code).json({ success: false, message: "scheduledAt must be a valid future date" });

    const campaign = await fcmCampaignModel.create({
      title, body, imageUrl, clickAction, customData,
      targetType, targetPlatform,
      targetUserId: targetUserId || null, targetUserName,
      status: "scheduled",
      scheduledAt: scheduledDate,
    });

    return res.status(OK.code).json({ success: true, message: "Campaign scheduled", campaignId: campaign._id, scheduledAt: scheduledDate });
  } catch (error) {
    console.error("scheduleMarketingNotificationAction error:", error);
    return res.status(INTERNAL_SERVER_ERROR.code).json({ success: false, message: error.message || "Failed to schedule campaign" });
  }
};

// ─── POST /api/admin/fcm/campaigns/:id/resend ────────────────────────────────

export const resendCampaignAction = async (req, res) => {
  try {
    const { id } = req.params;
    const original = await fcmCampaignModel.findById(id).lean();

    if (!original)
      return res.status(NOT_FOUND.code).json({ success: false, message: "Campaign not found" });

    const customDataObj = original.customData instanceof Map
      ? Object.fromEntries(original.customData)
      : (original.customData || {});

    const result = await executeFCMSend({
      title: original.title,
      body: original.body,
      imageUrl: original.imageUrl || "",
      clickAction: original.clickAction || "",
      customData: customDataObj,
      targetType: original.targetType,
      targetPlatform: original.targetPlatform || "",
      targetUserId: original.targetUserId || null,
    });

    await fcmCampaignModel.create({
      title: original.title,
      body: original.body,
      imageUrl: original.imageUrl || "",
      clickAction: original.clickAction || "",
      customData: customDataObj,
      targetType: original.targetType,
      targetPlatform: original.targetPlatform || "",
      targetUserId: original.targetUserId || null,
      targetUserName: original.targetUserName || "",
      status: "sent",
      sentAt: new Date(),
      totalTargeted: result.totalTargeted,
      successCount: result.successCount,
      failureCount: result.failureCount,
    });

    return res.status(OK.code).json({ success: true, message: "Campaign resent", ...result });
  } catch (error) {
    console.error("resendCampaignAction error:", error);
    return res.status(INTERNAL_SERVER_ERROR.code).json({ success: false, message: error.message || "Failed to resend campaign" });
  }
};

// ─── DELETE /api/admin/fcm/campaigns/:id ─────────────────────────────────────

export const cancelScheduledCampaignAction = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await fcmCampaignModel.findOneAndUpdate(
      { _id: id, status: "scheduled" },
      { $set: { status: "cancelled" } },
      { new: true }
    );

    if (!campaign)
      return res.status(NOT_FOUND.code).json({ success: false, message: "Scheduled campaign not found" });

    return res.status(OK.code).json({ success: true, message: "Campaign cancelled" });
  } catch (error) {
    console.error("cancelScheduledCampaignAction error:", error);
    return res.status(INTERNAL_SERVER_ERROR.code).json({ success: false, message: "Failed to cancel campaign" });
  }
};

// ─── GET /api/admin/fcm/campaigns ────────────────────────────────────────────

export const getCampaignHistoryAction = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      fcmCampaignModel.find().sort({ createdAt: -1, sentAt: -1 }).skip(skip).limit(limit).lean(),
      fcmCampaignModel.countDocuments(),
    ]);

    return res.status(OK.code).json({ success: true, data: campaigns, total, page, limit });
  } catch (error) {
    console.error("getCampaignHistoryAction error:", error);
    return res.status(INTERNAL_SERVER_ERROR.code).json({ success: false, message: "Failed to fetch campaign history" });
  }
};

// ─── POST /api/admin/fcm/upload-image ────────────────────────────────────────

export const uploadFCMImageAction = async (req, res) => {
  try {
    const { image } = req.body;

    if (!image || typeof image !== "string" || !image.startsWith("data:image"))
      return res.status(BAD_REQUEST.code).json({ success: false, message: "A valid base64 image data URL is required" });

    const uniquePath = `fcm-images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await uploadImageToS3(image, uniquePath);
    const url = getSignedUrlByKey(result.key);

    return res.status(OK.code).json({ success: true, url });
  } catch (error) {
    console.error("uploadFCMImageAction error:", error);
    return res.status(INTERNAL_SERVER_ERROR.code).json({ success: false, message: error.message || "Failed to upload image" });
  }
};
