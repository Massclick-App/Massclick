import { fakesendOtp, sendOtp, verifyOtp, fakeverifyOtp } from "../../helper/msg91/smsGatewayHelper.js";
import jwt from "jsonwebtoken";
import User from "../../model/msg91Model/usersModels.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import searchLogModel from "../../model/businessList/searchLogModel.js";
import { sendWhatsAppMessage, sendLoginWelcomeMessage } from "../../helper/msg91/smsGatewayHelper.js";

export const sendOtpAction = async (req, res) => {
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

    const result = await sendOtp(mobile);

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

export const verifyOtpAction = async (req, res) => {
  try {
    const { phoneNumber, otp, userName } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, message: "Missing phone number or OTP." });
    }

    await verifyOtp(phoneNumber.trim(), otp.trim());
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
      try {
        await sendLoginWelcomeMessage(user.mobileNumber1, user.userName);
      } catch (err) {
        console.error("WhatsApp welcome message failed:", err.message);
      }
    }

    // try {
    //   await sendLoginWelcomeMessage(user.mobileNumber1, user.userName);
    // } catch (err) {
    //   console.error("WhatsApp welcome message failed:", err.message);
    // }

    const token = jwt.sign(
      { userId: user._id, mobile: user.mobileNumber1 },
      process.env.JWT_SECRET,
      { expiresIn: "999y" }
    );

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
      try {
        await sendLoginWelcomeMessage(user.mobileNumber1, user.userName);
      } catch (err) {
        console.error("WhatsApp welcome message failed:", err.message);
      }
    }

    // try {
    //   await sendLoginWelcomeMessage(user.mobileNumber1, user.userName);
    // } catch (err) {
    //   console.error("WhatsApp welcome message failed:", err.message);
    // }

    const token = jwt.sign(
      { userId: user._id, mobile: user.mobileNumber1 },
      process.env.JWT_SECRET,
      { expiresIn: "999y" }
    );

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