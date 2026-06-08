import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import oauthModel from "../model/oauthModel.js";
import adminUserModel from "../model/userModel.js";
import otpUserModel from "../model/msg91Model/usersModels.js";
import rolesModel from "../model/roles/rolesModel.js";

const getAllowedPages = async (roleName) => {
  if (!roleName || roleName === "client") return [];
  const roleDoc = await rolesModel.findOne({ roleName, isActive: true }).lean();
  return Array.isArray(roleDoc?.permissions) ? roleDoc.permissions : [];
};

export const authenticateChatToken = async (token) => {
  if (!token) throw new Error("AUTH_REQUIRED");

  const oauthToken = await oauthModel.findOne({
    accessToken: token,
    isRevoked: { $ne: true },
    accessTokenExpiresAt: { $gt: new Date() },
  }).lean();

  if (oauthToken?.user?.userId && mongoose.Types.ObjectId.isValid(oauthToken.user.userId)) {
    const adminUser = await adminUserModel.findById(oauthToken.user.userId).lean();
    if (adminUser) {
      const role = adminUser.role || oauthToken.user.userRole || "admin";
      return {
        authType: "admin",
        userId: String(adminUser._id),
        userName: adminUser.userName || adminUser.emailId || "Admin",
        emailId: adminUser.emailId || "",
        userRole: role,
        allowedPages: await getAllowedPages(role),
      };
    }
  }

  if (oauthToken?.user) {
    return {
      authType: "client",
      userId: String(oauthToken.user.userId || oauthToken.client?.id || "client"),
      userName: oauthToken.user.userName || oauthToken.client?.clientId || "Client",
      userRole: oauthToken.user.userRole || "client",
      allowedPages: [],
    };
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new Error("INVALID_TOKEN");
  }

  const customer = await otpUserModel.findById(payload.userId).lean();
  if (!customer) throw new Error("USER_NOT_FOUND");

  return {
    authType: "customer",
    userId: String(customer._id),
    userName: customer.userName || customer.name || "Customer",
    mobile: payload.mobile || customer.mobileNumber1 || "",
    mobileNumber1: customer.mobileNumber1 || payload.mobile || "",
  };
};

export const chatAuthentication = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    req.chatUser = await authenticateChatToken(token);
    next();
  } catch (error) {
    return res.status(401).send({ error: error.message });
  }
};

export const requireChatAdmin = (req, res, next) => {
  if (req.chatUser?.authType !== "admin") {
    return res.status(403).send({ error: "ADMIN_REQUIRED" });
  }
  next();
};

export const requireChatCustomer = (req, res, next) => {
  if (req.chatUser?.authType !== "customer") {
    return res.status(403).send({ error: "CUSTOMER_REQUIRED" });
  }
  next();
};
