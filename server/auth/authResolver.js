import jwt from "jsonwebtoken";
import oauthModel from "../model/oauthModel.js";
import adminUserModel from "../model/userModel.js";
import otpUserModel from "../model/msg91Model/usersModels.js";
import { getRolePermissions } from "./authRoles.js";

export class AuthError extends Error {
  constructor(code, statusCode = 401, metadata = {}) {
    super(code);
    this.code = code;
    this.statusCode = statusCode;
    this.metadata = metadata;
  }
}

export const extractBearerToken = (authorizationHeader = "") => {
  if (typeof authorizationHeader !== "string") return null;
  return authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7).trim()
    : null;
};

const buildAdminActor = async (tokenRecord, source) => {
  const adminUser = await adminUserModel.findById(tokenRecord.user?.userId).lean();
  if (!adminUser) {
    throw new AuthError("USER_NOT_FOUND", 401, { auditEventType: "invalid_token" });
  }

  const role = adminUser.role || tokenRecord.user?.userRole || "admin";
  return {
    actorType: "admin",
    sessionType: "adminOAuth",
    subjectId: String(adminUser._id),
    role,
    permissions: await getRolePermissions(role),
    mobile: adminUser.contact || "",
    deviceId: tokenRecord.deviceId || tokenRecord.user?.deviceId || "",
    clientId: tokenRecord.client?.clientId || "",
    expiresAt: tokenRecord.accessTokenExpiresAt || null,
    tokenId: String(tokenRecord._id),
    source,
    userName: adminUser.userName || adminUser.emailId || "Admin",
    emailId: adminUser.emailId || "",
  };
};

const buildPublicClientActor = (tokenRecord, source) => ({
  actorType: "publicClient",
  sessionType: "publicClientCredentials",
  subjectId: String(tokenRecord.user?.userId || tokenRecord.client?.id || tokenRecord._id),
  role: tokenRecord.user?.userRole || "client",
  permissions: [],
  mobile: "",
  deviceId: tokenRecord.deviceId || tokenRecord.user?.deviceId || "",
  clientId: tokenRecord.client?.clientId || "",
  expiresAt: tokenRecord.accessTokenExpiresAt || null,
  tokenId: String(tokenRecord._id),
  source,
  userName: tokenRecord.user?.userName || tokenRecord.client?.clientId || "Client",
  emailId: "",
});

const buildCustomerActor = async (token, source) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const customer = await otpUserModel.findById(payload.userId).lean();

    if (!customer) {
      throw new AuthError("USER_NOT_FOUND", 401, { auditEventType: "invalid_token" });
    }

    return {
      actorType: "customer",
      sessionType: "customerOtp",
      subjectId: String(customer._id),
      role: "customer",
      permissions: [],
      mobile: customer.mobileNumber1 || payload.mobile || "",
      deviceId: "",
      clientId: "",
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      tokenId: payload.jti || null,
      source,
      userName: customer.userName || customer.name || "Customer",
      emailId: customer.email || "",
      mobileNumber1: customer.mobileNumber1 || payload.mobile || "",
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    if (error?.name === "TokenExpiredError") {
      throw new AuthError("AUTH_EXPIRED", 401, { auditEventType: "expired_token" });
    }

    throw new AuthError("INVALID_TOKEN", 401, { auditEventType: "invalid_token" });
  }
};

export const resolveAuthActorFromToken = async (token, { source = "http" } = {}) => {
  if (!token) {
    throw new AuthError("AUTH_REQUIRED", 401, { auditEventType: "invalid_token" });
  }

  const oauthToken = await oauthModel.findOne({ accessToken: token }).lean();
  if (oauthToken) {
    if (oauthToken.isRevoked) {
      throw new AuthError("TOKEN_REVOKED", 401, { auditEventType: "revocation" });
    }

    if (oauthToken.accessTokenExpiresAt && oauthToken.accessTokenExpiresAt <= new Date()) {
      throw new AuthError("AUTH_EXPIRED", 401, { auditEventType: "expired_token" });
    }

    const isPublicClient =
      !oauthToken.refreshToken || oauthToken.user?.userRole === "client";

    return isPublicClient
      ? buildPublicClientActor(oauthToken, source)
      : buildAdminActor(oauthToken, source);
  }

  return buildCustomerActor(token, source);
};

export const actorToLegacyAuthUser = (actor) => ({
  userId: actor.subjectId,
  userName: actor.userName || "",
  emailId: actor.emailId || "",
  userRole: actor.role,
  allowedPages: actor.permissions || [],
  deviceId: actor.deviceId || "",
  mobile: actor.mobile || "",
  actorType: actor.actorType,
  sessionType: actor.sessionType,
  clientId: actor.clientId || "",
});

export const actorToLegacyChatUser = (actor) => ({
  authType:
    actor.actorType === "publicClient"
      ? "client"
      : actor.actorType,
  userId: actor.subjectId,
  userName: actor.userName || "",
  emailId: actor.emailId || "",
  userRole: actor.role,
  allowedPages: actor.permissions || [],
  mobile: actor.mobile || "",
  mobileNumber1: actor.mobileNumber1 || actor.mobile || "",
  clientId: actor.clientId || "",
});
