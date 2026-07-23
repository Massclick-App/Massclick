import { generateOtp, verifyOtp } from "../../helper/msg91/msgHelper.js";
import User from "../../model/msg91Model/usersModels.js";
import jwt from "jsonwebtoken";
// 1. IMPORT S3 UTILITIES
import { uploadImageToS3, getSignedUrlByKey } from "../../s3Uploder.js";
import {
  assertSelfOnlyMobileAccess,
  resolveEffectiveSubjectId,
} from "../../auth/authMiddleware.js";
import { logAuthAuditEvent } from "../../auth/authAuditStore.js";
import { resolveAuthActorFromToken } from "../../auth/authResolver.js";

const JWT_SECRET = process.env.JWT_SECRET

export const requestOtp = async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile) return res.status(400).json({ success: false, message: "Mobile number required" });

        const otp = await generateOtp(mobile);
        res.json({ success: true, message: "OTP sent successfully", otp });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const verifyOtpAndLogin = async (req, res) => {
    try {
        const { mobile, otp, userName } = req.body;
        if (!mobile || !otp) return res.status(400).json({ success: false, message: "Mobile and OTP required" });

        await verifyOtp(mobile, otp);

        let user = await User.findOne({ mobileNumber1: mobile });
        if (!user) return res.status(400).json({ success: false, message: "User not found" });

        if (userName && userName !== user.userName) {
            user.userName = userName;
        }

        user.lastLoginAt = new Date();
        user.loginCount = Number(user.loginCount || 0) + 1;
        await user.save();

        const token = jwt.sign(
            { userId: user._id, mobile: user.mobileNumber1 },
            JWT_SECRET,
            { expiresIn: "100y" }
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

        const userObject = user.toObject();
        if (userObject.profileImageKey) {
            userObject.profileImage = getSignedUrlByKey(userObject.profileImageKey);
        }

        res.json({ success: true, message: "Login successful", user: userObject, token });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

export const updateOtpUser = async (req, res) => {
  try {
    const { mobile } = req.params;
    assertSelfOnlyMobileAccess(req);
    const updateData = { ...req.body };

    const user = await User.findOne({ mobileNumber1: mobile });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }


    if (updateData.markRead) {
      const { leadId } = updateData.markRead;

      // Mark as read and stamp readAt ONLY on the first read (readAt still null),
      // so response-time metrics reflect the first response, not later re-opens.
      // `{ readAt: null }` also matches legacy leads where the field is absent.
      await User.updateOne(
        {
          mobileNumber1: mobile,
          leadsData: { $elemMatch: { _id: leadId, readAt: null } },
        },
        { $set: { "leadsData.$.isReaded": true, "leadsData.$.readAt": new Date() } }
      );

      delete updateData.markRead;

      return res.json({
        success: true,
        message: "Lead marked as read",
      });
    }


    if (updateData.profileImage?.startsWith?.("data:image")) {
      const uploadResult = await uploadImageToS3(
        updateData.profileImage,
        `user/profiles/${user._id}/profile-${Date.now()}`
      );
      user.profileImageKey = uploadResult.key;
    } else if (
      updateData.profileImage === null ||
      updateData.profileImage === ""
    ) {
      user.profileImageKey = "";
    }
    delete updateData.profileImage;

   
    const forbiddenFields = [
      "currentOtp",
      "otpGeneratedAt",
      "otpExpiresAt",
      "profileImageKey",
    ];
    forbiddenFields.forEach((field) => delete updateData[field]);

 
    if (updateData.businessCategory) {
      if (
        typeof updateData.businessCategory === "object" &&
        (updateData.businessCategory.category ||
          updateData.businessCategory._id)
      ) {
        user.businessCategory = {
          ...(user.businessCategory || {}),
          ...updateData.businessCategory,
        };
      }
      delete updateData.businessCategory;
    }


    if (updateData.leadsData) {
      const lead = updateData.leadsData;

      // ❌ prevent empty leads
      if (!lead.mobileNumber1 && !lead.email) {
        delete updateData.leadsData;
      } else {
        // 🔍 strong duplicate validation
        const exists = user.leadsData.some(
          (l) =>
            l.mobileNumber1 === lead.mobileNumber1 &&
            l.searchedUserText === lead.searchedUserText &&
            l.time === lead.time &&
            l.userName === lead.userName
        );

        if (!exists) {
          user.leadsData.push({
            email: lead.email || "",
            mobileNumber1: lead.mobileNumber1 || "",
            mobileNumber2: lead.mobileNumber2 || "",
            searchedUserText: lead.searchedUserText || "",
            time: lead.time || "",
            userName: lead.userName || "",
            isWhatsappSend: false,
            isReaded: false,
            createdAt: new Date(),
          });
        }

        delete updateData.leadsData;
      }
    }


    Object.keys(updateData).forEach((key) => {
      user[key] = updateData[key];
    });

    user.updatedAt = new Date();
    await user.save();


    const userObject = user.toObject();
    if (userObject.profileImageKey) {
      userObject.profileImage = getSignedUrlByKey(userObject.profileImageKey);
    }

    return res.json({
      success: true,
      message: "User updated successfully",
      user: userObject,
    });
  } catch (err) {
    console.error("Error updating user:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const viewOtpUser = async (req, res) => {
    try {
        const { mobile } = req.params;
        assertSelfOnlyMobileAccess(req);

        const user = await User.findOne({ mobileNumber1: mobile }).lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        if (user.profileImageKey) {
            user.profileImage = getSignedUrlByKey(user.profileImageKey);
        }

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const viewAllOtpUsers = async (req, res) => {
    try {
        const users = await User.find({}).lean(); // Use .lean()
        

        const usersWithImages = users.map(user => {
            if (user.profileImageKey) {
                user.profileImage = getSignedUrlByKey(user.profileImageKey);
            }
            return user;
        });

        res.json({ success: true, count: usersWithImages.length, users: usersWithImages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteOtpUser = async (req, res) => {
    try {
        const { mobile } = req.params;
        const user = await User.findOneAndDelete({ mobileNumber1: mobile });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

     

        res.json({ success: true, message: "User deleted successfully", user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
export const logUserSearch = async (req, res) => {
    try {
        const { query, location, category } = req.body;
        const userId = resolveEffectiveSubjectId(req, {
            allowAdminOverride: true,
            fieldNames: ["userId"],
        });

        if (!userId || !query) {
            return res.status(400).json({ success: false, message: "UserId and query required" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        user.searchHistory.push({
            query,
            location: location || "Global",
            category: category || "General",
            searchedAt: new Date(),
        });

        if (user.searchHistory.length > 20) {
            user.searchHistory = user.searchHistory.slice(-20);
        }

        await user.save();

        res.json({ success: true, message: "Search logged successfully", searchHistory: user.searchHistory });
    } catch (err) {
        console.error("Error logging search:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
