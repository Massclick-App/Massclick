import admin from "../helper/firebaseInit.js";
import userModel from "../model/msg91Model/usersModels.js";
import fcmCampaignModel from "../model/fcmCampaignModel/fcmCampaignModel.js";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK } from "../errorCodes.js";
import { uploadImageToS3, getSignedUrlByKey } from "../s3Uploder.js";

/**
 * GET /api/admin/fcm/users-with-tokens
 * Returns users that have at least one active, non-expired FCM token.
 */
export const getUsersWithFCMTokensAction = async (req, res) => {
  try {
    const now = new Date();

    const users = await userModel
      .find({
        "fcmTokens": {
          $elemMatch: {
            isActive: true,
            expiresAt: { $gt: now },
          },
        },
      })
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

    return res.status(OK.code).json({
      success: true,
      data: result,
      total: result.length,
    });
  } catch (error) {
    console.error("getUsersWithFCMTokensAction error:", error);
    return res.status(INTERNAL_SERVER_ERROR.code).json({
      success: false,
      message: "Failed to fetch users with FCM tokens",
    });
  }
};

/**
 * POST /api/admin/fcm/send-marketing
 * Body: {
 *   title, body,
 *   imageUrl?, clickAction?,
 *   customData?: { key: value },
 *   targetType: "all" | "platform" | "specific_user",
 *   targetPlatform?: "android" | "ios" | "web",
 *   targetUserId?: string,
 *   targetUserName?: string
 * }
 */
export const sendMarketingNotificationAction = async (req, res) => {
  try {
    const {
      title,
      body,
      imageUrl = "",
      clickAction = "",
      customData = {},
      targetType,
      targetPlatform = "",
      targetUserId = null,
      targetUserName = "",
    } = req.body;

    if (!title || !body) {
      return res.status(BAD_REQUEST.code).json({
        success: false,
        message: "title and body are required",
      });
    }

    if (!["all", "platform", "specific_user"].includes(targetType)) {
      return res.status(BAD_REQUEST.code).json({
        success: false,
        message: "targetType must be 'all', 'platform', or 'specific_user'",
      });
    }

    if (targetType === "platform" && !["android", "ios", "web"].includes(targetPlatform)) {
      return res.status(BAD_REQUEST.code).json({
        success: false,
        message: "targetPlatform must be 'android', 'ios', or 'web' when targetType is 'platform'",
      });
    }

    if (targetType === "specific_user" && !targetUserId) {
      return res.status(BAD_REQUEST.code).json({
        success: false,
        message: "targetUserId is required when targetType is 'specific_user'",
      });
    }

    const now = new Date();
    let tokens = [];

    if (targetType === "specific_user") {
      const user = await userModel.findById(targetUserId).select("fcmTokens").lean();
      if (!user) {
        return res.status(BAD_REQUEST.code).json({ success: false, message: "User not found" });
      }
      tokens = user.fcmTokens
        .filter((t) => t.isActive && new Date(t.expiresAt) > now)
        .map((t) => t.token);
    } else {
      const query = {
        "fcmTokens": { $elemMatch: { isActive: true, expiresAt: { $gt: now } } },
      };
      if (targetType === "platform") {
        query["fcmTokens"]["$elemMatch"].platform = targetPlatform;
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

    if (tokens.length === 0) {
      return res.status(BAD_REQUEST.code).json({
        success: false,
        message: "No active FCM tokens found for the selected target",
      });
    }

    // Build FCM data payload — all values must be strings
    const dataPayload = {};
    if (clickAction) dataPayload.clickAction = clickAction;
    if (imageUrl) dataPayload.imageUrl = imageUrl;
    Object.entries(customData).forEach(([k, v]) => {
      if (k && v !== undefined && v !== null) dataPayload[k] = String(v);
    });

    const messageBase = {
      notification: { title, body },
      data: dataPayload,
      android: {
        notification: {
          channelId: 'massclick_marketing',
          ...(imageUrl && { imageUrl }),
        },
      },
    };

    if (imageUrl) {
      messageBase.notification.imageUrl = imageUrl;
    }

    // Firebase allows max 500 tokens per multicast
    const CHUNK_SIZE = 500;
    let totalSuccess = 0;
    let totalFailure = 0;

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      const multicastMessage = { ...messageBase, tokens: chunk };
      const response = await admin.messaging().sendEachForMulticast(multicastMessage);
      totalSuccess += response.successCount;
      totalFailure += response.failureCount;
    }

    // Persist campaign record
    await fcmCampaignModel.create({
      title,
      body,
      imageUrl,
      clickAction,
      customData,
      targetType,
      targetPlatform,
      targetUserId: targetUserId || null,
      targetUserName,
      totalTargeted: tokens.length,
      successCount: totalSuccess,
      failureCount: totalFailure,
    });

    return res.status(OK.code).json({
      success: true,
      message: "Marketing notification sent",
      totalTargeted: tokens.length,
      successCount: totalSuccess,
      failureCount: totalFailure,
    });
  } catch (error) {
    console.error("sendMarketingNotificationAction error:", error);
    return res.status(INTERNAL_SERVER_ERROR.code).json({
      success: false,
      message: error.message || "Failed to send marketing notification",
    });
  }
};

/**
 * GET /api/admin/fcm/campaigns?page=1&limit=20
 */
export const getCampaignHistoryAction = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      fcmCampaignModel.find().sort({ sentAt: -1 }).skip(skip).limit(limit).lean(),
      fcmCampaignModel.countDocuments(),
    ]);

    return res.status(OK.code).json({
      success: true,
      data: campaigns,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("getCampaignHistoryAction error:", error);
    return res.status(INTERNAL_SERVER_ERROR.code).json({
      success: false,
      message: "Failed to fetch campaign history",
    });
  }
};

/**
 * POST /api/admin/fcm/upload-image
 * Body: { image: "data:image/png;base64,..." }
 * Uploads to S3 and returns the public URL.
 */
export const uploadFCMImageAction = async (req, res) => {
  try {
    const { image } = req.body;

    if (!image || typeof image !== "string" || !image.startsWith("data:image")) {
      return res.status(BAD_REQUEST.code).json({
        success: false,
        message: "A valid base64 image data URL is required",
      });
    }

    const uniquePath = `fcm-images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await uploadImageToS3(image, uniquePath);
    const url = getSignedUrlByKey(result.key);

    return res.status(OK.code).json({ success: true, url });
  } catch (error) {
    console.error("uploadFCMImageAction error:", error);
    return res.status(INTERNAL_SERVER_ERROR.code).json({
      success: false,
      message: error.message || "Failed to upload image",
    });
  }
};
