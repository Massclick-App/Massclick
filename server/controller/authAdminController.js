import oauthModel from "../model/oauthModel.js";
import otpUserModel from "../model/msg91Model/usersModels.js";
import { listAuthPolicies } from "../auth/authPolicyRegistry.js";
import {
  logAuthAuditEvent,
  listAuthAuditEvents,
  summarizeAuthAuditEvents,
} from "../auth/authAuditStore.js";
import { resolveAuthActorFromToken } from "../auth/authResolver.js";

const nowFilter = { $gt: new Date() };

// Customer mobiles are stored as bare 10-digit strings, but callers pass every
// shape there is ("+91 98658 48882", "919865848882", "98658 48882"). Reduce to
// digits and keep the trailing 10 so an admin lookup can't silently miss.
const normalizeMobile = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const mapSessionRecord = (record) => ({
  id: String(record._id),
  sessionType:
    !record.refreshToken || record.user?.userRole === "client"
      ? "publicClientCredentials"
      : "adminOAuth",
  actorType:
    !record.refreshToken || record.user?.userRole === "client"
      ? "publicClient"
      : "admin",
  subjectId: String(record.user?.userId || record.client?.id || ""),
  role: record.user?.userRole || "client",
  userName: record.user?.userName || "",
  clientId: record.client?.clientId || "",
  deviceId: record.deviceId || record.user?.deviceId || "",
  accessTokenExpiresAt: record.accessTokenExpiresAt || null,
  refreshTokenExpiresAt: record.refreshTokenExpiresAt || null,
  createdAt: record.createdAt || null,
  lastUsedAt: record.lastUsedAt || null,
});

export const authOverviewAction = async (req, res) => {
  const [activeAdminSessions, activePublicClientSessions] = await Promise.all([
    oauthModel.countDocuments({
      refreshToken: { $exists: true, $ne: null },
      accessTokenExpiresAt: nowFilter,
      isRevoked: { $ne: true },
    }),
    oauthModel.countDocuments({
      $or: [{ refreshToken: { $exists: false } }, { refreshToken: null }],
      accessTokenExpiresAt: nowFilter,
      isRevoked: { $ne: true },
    }),
  ]);

  res.json({
    success: true,
    overview: {
      generatedAt: new Date().toISOString(),
      activeAdminSessions,
      activePublicClientSessions,
      customerOtpSessions: "stateless_jwt",
      policyCount: listAuthPolicies().length,
    },
    policies: listAuthPolicies(),
    auditSummary: summarizeAuthAuditEvents(),
  });
};

export const authSessionsAction = async (req, res) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 100, 250));
  const sessions = await oauthModel
    .find({ isRevoked: { $ne: true } })
    .sort({ lastUsedAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({
    success: true,
    sessions: sessions.map(mapSessionRecord),
    count: sessions.length,
  });
};

export const authIntrospectAction = async (req, res) => {
  const token = String(req.body?.token || "").trim();
  if (!token) {
    return res.status(400).json({ success: false, message: "token is required" });
  }

  try {
    const actor = await resolveAuthActorFromToken(token, { source: "introspect" });
    return res.json({ success: true, active: true, actor });
  } catch (error) {
    return res.json({
      success: true,
      active: false,
      error: error.code || error.message || "INVALID_TOKEN",
    });
  }
};

export const authAuditAction = async (req, res) => {
  const events = listAuthAuditEvents({
    limit: req.query.limit,
    eventType: req.query.eventType,
    actorType: req.query.actorType,
    source: req.query.source,
  });

  res.json({
    success: true,
    events,
    count: events.length,
  });
};

// Customer sessions are stateless JWTs — there is no session row to delete, so
// "log out" means bumping tokenVersion. Every token minted before the bump then
// fails the version check in buildCustomerActor. Re-login works immediately: the
// OTP controllers stamp the current tokenVersion onto each new token.
export const customerLogoutAction = async (req, res) => {
  const mobile = normalizeMobile(req.body?.mobile);
  if (!mobile) {
    return res.status(400).json({ success: false, message: "mobile is required" });
  }

  const customer = await otpUserModel
    .findOneAndUpdate(
      { mobileNumber1: mobile },
      { $inc: { tokenVersion: 1 }, $set: { updatedAt: new Date() } },
      { new: true }
    )
    .lean();

  if (!customer) {
    return res.status(404).json({ success: false, message: "Customer not found" });
  }

  logAuthAuditEvent({
    eventType: "revocation",
    actor: req.authActor || null,
    source: "admin-force-logout",
    req,
    statusCode: 200,
    message: `Force logout: ${mobile} (tokenVersion=${customer.tokenVersion})`,
  });

  res.json({
    success: true,
    message: "Customer logged out on all devices",
    customer: {
      userName: customer.userName || "",
      mobileNumber1: customer.mobileNumber1,
      tokenVersion: customer.tokenVersion,
    },
  });
};

// Bulk force-logout. Guarded behind an explicit confirm flag because it signs
// every customer out at once and there is no undo beyond letting them log in again.
export const customerLogoutAllAction = async (req, res) => {
  if (req.body?.confirm !== true) {
    const total = await otpUserModel.estimatedDocumentCount();
    return res.status(400).json({
      success: false,
      message: `Refusing to log out all customers without confirmation. Re-send with { "confirm": true } to sign out ~${total} customers.`,
      affectedCustomers: total,
    });
  }

  const result = await otpUserModel.updateMany(
    {},
    { $inc: { tokenVersion: 1 }, $set: { updatedAt: new Date() } }
  );

  logAuthAuditEvent({
    eventType: "revocation",
    actor: req.authActor || null,
    source: "admin-force-logout-all",
    req,
    statusCode: 200,
    message: `Force logout ALL customers (${result.modifiedCount} sessions invalidated)`,
  });

  res.json({
    success: true,
    message: "All customers logged out on all devices",
    matched: result.matchedCount,
    loggedOut: result.modifiedCount,
  });
};

// Session-management view of the customer base: who exists, and whether their
// tokens have been revoked. `search` accepts a name fragment or any mobile format.
export const customerSessionsAction = async (req, res) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 100, 500));
  const rawSearch = String(req.query.search || "").trim();
  const filter = {};

  if (rawSearch) {
    const mobile = normalizeMobile(rawSearch);
    const escaped = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ userName: new RegExp(escaped, "i") }];
    if (mobile) filter.$or.push({ mobileNumber1: new RegExp(mobile) });
  }

  const [customers, total] = await Promise.all([
    otpUserModel
      .find(filter, {
        userName: 1,
        mobileNumber1: 1,
        tokenVersion: 1,
        businessPeople: 1,
        lastLoginAt: 1,
        loginCount: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    otpUserModel.countDocuments(filter),
  ]);

  res.json({
    success: true,
    total,
    count: customers.length,
    customers: customers.map((customer) => ({
      userName: customer.userName || "",
      mobileNumber1: customer.mobileNumber1,
      businessPeople: Boolean(customer.businessPeople),
      tokenVersion: customer.tokenVersion || 0,
      forcedLogout: Boolean(customer.tokenVersion),
      lastLoginAt: customer.lastLoginAt || null,
      loginCount: customer.loginCount || 0,
      createdAt: customer.createdAt || null,
    })),
  });
};
