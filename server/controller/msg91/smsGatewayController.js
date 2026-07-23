import { fakesendOtp, sendOtp, sendMobileOtp, verifyOtp, fakeverifyOtp } from "../../helper/msg91/smsGatewayHelper.js";
import jwt from "jsonwebtoken";
import User from "../../model/msg91Model/usersModels.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import searchLogModel from "../../model/businessList/searchLogModel.js";
import { sendWhatsAppMessage, sendLoginWelcomeMessage } from "../../helper/msg91/smsGatewayHelper.js";
import { getSettings } from "../../helper/systemSettings/settingsService.js";
import { logAuthAuditEvent } from "../../auth/authAuditStore.js";
import { resolveAuthActorFromToken } from "../../auth/authResolver.js";
import { timingSafeEqual } from "node:crypto";

const normalizeIndianMobile = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91")
    ? digits.slice(2)
    : digits;
};

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Configure these only in the deployed server environment. Keeping the
// reviewer credentials out of the app prevents them from being extracted from
// the APK:
//   GOOGLE_PLAY_REVIEW_PHONE=<10-digit Indian mobile number>
//   GOOGLE_PLAY_REVIEW_OTP=<exactly 4 digits>
//   GOOGLE_PLAY_REVIEW_NAME=<optional display name>
const getGooglePlayReviewConfig = () => {
  const phone = normalizeIndianMobile(process.env.GOOGLE_PLAY_REVIEW_PHONE);
  const otp = String(process.env.GOOGLE_PLAY_REVIEW_OTP || "").trim();

  return {
    phone,
    otp,
    isValid: /^\d{10}$/.test(phone) && /^\d{4}$/.test(otp),
  };
};

const getGooglePlayReviewRequest = (phoneNumber) => {
  const cleanNumber = normalizeIndianMobile(phoneNumber);
  const config = getGooglePlayReviewConfig();
  const isReviewer = Boolean(config.phone) && cleanNumber === config.phone;

  if (isReviewer && !config.isValid) {
    throw createHttpError(
      "Google Play reviewer OTP credentials are not configured correctly.",
      500
    );
  }

  return { cleanNumber, config, isReviewer };
};

const verifyGooglePlayReviewOtp = (providedOtp, expectedOtp) => {
  const provided = Buffer.from(String(providedOtp || "").trim());
  const expected = Buffer.from(expectedOtp);
  const matches =
    provided.length === expected.length && timingSafeEqual(provided, expected);

  if (!matches) {
    throw createHttpError("Invalid OTP.", 401);
  }
};

// Shared by the web and mobile send-OTP endpoints. They differ only in which
// MSG91 template `sendRealOtp` puts the SMS on; every other rule (reviewer
// bypass, dummy-OTP setting, isNewUser) has to stay identical between them.
const handleSendOtp = async (req, res, sendRealOtp) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      message: "Missing phone number."
    });
  }

  try {
    const { cleanNumber, isReviewer } =
      getGooglePlayReviewRequest(phoneNumber);

    if (!/^\d{10}$/.test(cleanNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number. Must be 10 digits."
      });
    }

    let existingUser = null;
    let result;

    if (isReviewer) {
      // Do not send an SMS for the reusable Google Play review account.
      result = {
        success: true,
        apiResponse: {
          type: "success",
          message: "OTP sent successfully"
        }
      };
    } else {
      existingUser = await User.findOne({ mobileNumber1: cleanNumber });
      const settings = await getSettings();
      result = settings.otp_real_enabled
        ? await sendRealOtp(cleanNumber)
        : await fakesendOtp(cleanNumber);
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: result.apiResponse,
      // The review login must not be blocked by the new-user name prompt.
      isNewUser: isReviewer ? false : !existingUser
    });

  } catch (error) {

    console.error("Controller Error (handleSendOtp):", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message
    });

  }
};

export const sendOtpAction = (req, res) => handleSendOtp(req, res, sendOtp);

// Mobile app entry point. Same contract as sendOtpAction, but the SMS goes out
// on the SMS Retriever template so the app can auto-fill the code.
export const sendMobileOtpAction = (req, res) =>
  handleSendOtp(req, res, sendMobileOtp);

export const verifyOtpAction = async (req, res) => {
  try {
    const { phoneNumber, otp, userName } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, message: "Missing phone number or OTP." });
    }

    const { cleanNumber, config, isReviewer } =
      getGooglePlayReviewRequest(phoneNumber);

    if (!/^\d{10}$/.test(cleanNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number. Must be 10 digits."
      });
    }

    let settings = null;
    if (isReviewer) {
      verifyGooglePlayReviewOtp(otp, config.otp);
    } else {
      settings = await getSettings();
      if (settings.otp_real_enabled) {
        await verifyOtp(cleanNumber, otp.trim());
      } else {
        await fakeverifyOtp(cleanNumber, otp.trim());
      }
    }

    let user = await User.findOne({ mobileNumber1: cleanNumber });
    let isNewUser = false;

    if (!user) {

      isNewUser = true;

      user = new User({
        userName: userName || (
          isReviewer
            ? process.env.GOOGLE_PLAY_REVIEW_NAME?.trim() || "Google Play Reviewer"
            : `User_${cleanNumber}`
        ),
        mobileNumber1: cleanNumber
      });

    } else if (userName && userName !== user.userName) {

      user.userName = userName;

    }

    if (isReviewer) {
      // The dedicated reviewer account must reach all authenticated and
      // business-only areas without extra onboarding or membership approval.
      user.userName =
        user.userName ||
        process.env.GOOGLE_PLAY_REVIEW_NAME?.trim() ||
        "Google Play Reviewer";
      user.businessPeople = true;
      user.profileCompleted = true;
      user.firstTimeUser = false;
    }

    const mobileRegex = new RegExp(`\\b${cleanNumber}\\b`);
    const matchedBusiness = await businessListModel.findOne({
      $or: [
        { contact: cleanNumber },
        { contactList: { $regex: mobileRegex } }
      ]
    }).lean();


    if (matchedBusiness) {
      user.businessName = matchedBusiness.businessName || "";
      user.businessLocation = matchedBusiness.location || "";

      user.businessCategory = {
        category: matchedBusiness.category || "",
        keywords: matchedBusiness.keywords || [],
        slug: matchedBusiness.slug || "",
        seoTitle: matchedBusiness.seoTitle || "",
        seoDescription: matchedBusiness.seoDescription || "",
        title: matchedBusiness.title || "",
        description: matchedBusiness.description || ""
      };
      user.businessPeople = true;
    }

    await user.save();

    if (isNewUser && !isReviewer && settings?.whatsapp_login_welcome) {
      try {
        await sendLoginWelcomeMessage(user.mobileNumber1, user.userName);
      } catch (err) {
        console.error("WhatsApp welcome message failed:", err.message);
      }
    }

    const token = jwt.sign(
      { userId: user._id, mobile: user.mobileNumber1 },
      process.env.JWT_SECRET,
      { expiresIn: "999y" }
    );
    const actor = await resolveAuthActorFromToken(token, { source: "otp-login" });
    logAuthAuditEvent({
      eventType: "login",
      actor,
      source: "otp-login",
      req,
      statusCode: 200,
      message: "Customer OTP session created",
    });

    const userObj = user.toObject();
    if (userObj.profileImageKey) {
      userObj.profileImage = getSignedUrlByKey(userObj.profileImageKey);
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      user: userObj,
      token
    });

  } catch (error) {
    console.error("verifyOtpAction Error:", error);
    const upstreamStatus = error.response?.status;
    const statusCode =
      error.statusCode ||
      (upstreamStatus === 400 || upstreamStatus === 401 ? upstreamStatus : 500);

    return res.status(statusCode).json({
      success: false,
      message: statusCode === 401 ? "Invalid OTP." : "OTP verification failed.",
      ...(statusCode >= 500 ? { error: error.message } : {})
    });
  }
};

export const fakesendOtpAction = async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      message: "Missing phone number."
    });
  }

  try {

    const mobile = phoneNumber.trim();

    const existingUser = await User.findOne({ mobileNumber1: mobile });

    const result = await fakesendOtp(mobile);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: result.apiResponse,
      isNewUser: !existingUser
    });

  } catch (error) {

    console.error("Controller Error (sendOtpAction):", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message
    });

  }
};

export const fakeverifyOtpAction = async (req, res) => {
  try {
    const { phoneNumber, otp, userName } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, message: "Missing phone number or OTP." });
    }

    await fakeverifyOtp(phoneNumber.trim(), otp.trim());
    const cleanNumber = phoneNumber.replace(/\D/g, "");

    let user = await User.findOne({ mobileNumber1: cleanNumber });
    let isNewUser = false;

    if (!user) {

      isNewUser = true;

      user = new User({
        userName: userName || `User_${cleanNumber}`,
        mobileNumber1: cleanNumber
      });

    } else if (userName && userName !== user.userName) {

      user.userName = userName;

    }

    const mobileRegex = new RegExp(`\\b${cleanNumber}\\b`);
    const matchedBusiness = await businessListModel.findOne({
      $or: [
        { contact: cleanNumber },
        { contactList: { $regex: mobileRegex } }
      ]
    }).lean();


    if (matchedBusiness) {
      user.businessName = matchedBusiness.businessName || "";
      user.businessLocation = matchedBusiness.location || "";

      user.businessCategory = {
        category: matchedBusiness.category || "",
        keywords: matchedBusiness.keywords || [],
        slug: matchedBusiness.slug || "",
        seoTitle: matchedBusiness.seoTitle || "",
        seoDescription: matchedBusiness.seoDescription || "",
        title: matchedBusiness.title || "",
        description: matchedBusiness.description || ""
      };
      user.businessPeople = true;
    }

    await user.save();

    if (isNewUser) {
      const fakeSettings = await getSettings();
      if (fakeSettings.whatsapp_login_welcome) {
        try {
          await sendLoginWelcomeMessage(user.mobileNumber1, user.userName);
        } catch (err) {
          console.error("WhatsApp welcome message failed:", err.message);
        }
      }
    }

    const token = jwt.sign(
      { userId: user._id, mobile: user.mobileNumber1 },
      process.env.JWT_SECRET,
      { expiresIn: "999y" }
    );
    const actor = await resolveAuthActorFromToken(token, { source: "otp-login" });
    logAuthAuditEvent({
      eventType: "login",
      actor,
      source: "otp-login",
      req,
      statusCode: 200,
      message: "Customer OTP session created",
    });

    const userObj = user.toObject();
    if (userObj.profileImageKey) {
      userObj.profileImage = getSignedUrlByKey(userObj.profileImageKey);
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      user: userObj,
      token
    });

  } catch (error) {
    console.error("verifyOtpAction Error:", error);
    return res.status(500).json({
      success: false,
      message: "OTP verification failed.",
      error: error.message
    });
  }
};

export const sendWhatsAppForLead = async (req, res) => {
  try {
    const { leadId, customMessage } = req.body;

    if (!leadId) {
      return res.status(400).json({
        success: false,
        message: "Lead ID required"
      });
    }

    const lead = await searchLogModel.findOne({
      _id: leadId,
      whatsapp: { $ne: true }
    });

    if (!lead) {
      return res.json({
        success: true,
        message: "WhatsApp already sent"
      });
    }

    const user = lead.userDetails?.[0];
    const mobile = user?.mobileNumber1;

    if (!mobile || mobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Valid mobile number not found"
      });
    }

    await sendWhatsAppMessage(mobile, {
      name: user.userName || "Customer",
      message:
        customMessage ||
        `We noticed you searched for "${lead.searchedUserText}". We can help you instantly.`
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

    return res.json({
      success: true,
      message: "WhatsApp sent and lead updated"
    });

  } catch (err) {
    console.error("WhatsApp Lead Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const sendWhatsAppToLeadsBulk = async (req, res) => {
  try {
    const { leadIds, customMessage } = req.body;

    if (!Array.isArray(leadIds) || !leadIds.length) {
      return res.status(400).json({
        success: false,
        message: "Lead IDs array required"
      });
    }


    const leads = await searchLogModel.find({
      _id: { $in: leadIds },
      whatsapp: { $ne: true }
    });

    const tasks = leads.map(async (lead) => {
      const user = lead.userDetails?.[0];
      const mobile = user?.mobileNumber1;

      if (!mobile || mobile.length !== 10) {
        return {
          leadId: lead._id,
          status: "skipped",
          reason: "Invalid mobile"
        };
      }

      try {
        await sendWhatsAppMessage(mobile, {
          name: user.userName || "Customer",
          message:
            customMessage ||
            `We noticed you searched for "${lead.searchedUserText}".`
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

        return {
          leadId: lead._id,
          mobile,
          status: "sent"
        };

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

        return {
          leadId: lead._id,
          mobile,
          status: "failed",
          error: err.message
        };
      }
    });

    const results = await Promise.all(tasks);

    return res.json({
      success: true,
      message: "Bulk WhatsApp completed",
      results
    });

  } catch (err) {
    console.error("Bulk WhatsApp Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
