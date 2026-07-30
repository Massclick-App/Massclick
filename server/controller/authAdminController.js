import mongoose from "mongoose";
import oauthModel from "../model/oauthModel.js";
import adminUserModel from "../model/userModel.js";
import otpUserModel from "../model/msg91Model/usersModels.js";
import { listAuthPolicies } from "../auth/authPolicyRegistry.js";
import {
  logAuthAuditEvent,
  listAuthAuditEvents,
  summarizeAuthAuditEvents,
} from "../auth/authAuditStore.js";
import { resolveAuthActorFromToken } from "../auth/authResolver.js";
import { WS_EVENTS, buildRoom } from "../websocket/constants.js";
import { emitToAdminSessions, emitToRoom } from "../websocket/roomManager.js";

const ADMIN_OAUTH_QUERY = {
  refreshToken: { $exists: true, $ne: null },
  "user.userRole": { $ne: "client" },
};

const PUBLIC_CLIENT_QUERY = {
  $or: [
    { refreshToken: { $exists: false } },
    { refreshToken: null },
    { "user.userRole": "client" },
  ],
};

// Customer mobiles are stored as bare 10-digit strings, but callers pass every
// shape there is ("+91 98658 48882", "919865848882", "98658 48882"). Reduce to
// digits and keep the trailing 10 so an admin lookup can't silently miss.
const normalizeMobile = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const escapeRegExp = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getLimit = (value, fallback = 100, max = 500) =>
  Math.max(1, Math.min(Number(value) || fallback, max));

const toDateOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getIdQueryValues = (id) => {
  const values = [String(id)];
  if (mongoose.Types.ObjectId.isValid(id)) {
    values.push(new mongoose.Types.ObjectId(id));
  }
  return values;
};

const getSessionStatus = (record) => {
  if (record.isRevoked) return "revoked";

  const expiresAt = toDateOrNull(record.accessTokenExpiresAt);
  if (expiresAt && expiresAt <= new Date()) return "expired";

  return "active";
};

const isPublicClientSession = (record) =>
  !record.refreshToken || record.user?.userRole === "client";

const mapSessionRecord = (record) => ({
  id: String(record._id),
  sessionType: isPublicClientSession(record)
    ? "publicClientCredentials"
    : "adminOAuth",
  actorType: isPublicClientSession(record) ? "publicClient" : "admin",
  subjectId: String(record.user?.userId || record.client?.id || ""),
  role: record.user?.userRole || "client",
  userName: record.user?.userName || "",
  emailId: record.user?.emailId || "",
  clientId: record.client?.clientId || "",
  deviceId: record.deviceId || record.user?.deviceId || "",
  accessTokenExpiresAt: record.accessTokenExpiresAt || null,
  refreshTokenExpiresAt: record.refreshTokenExpiresAt || null,
  expiresAt: record.expiresAt || null,
  isRevoked: Boolean(record.isRevoked),
  status: getSessionStatus(record),
  createdAt: record.createdAt || null,
  lastUsedAt: record.lastUsedAt || null,
});

const getRevocationPatch = (now = new Date()) => ({
  $set: {
    isRevoked: true,
    accessTokenExpiresAt: now,
    refreshTokenExpiresAt: now,
    expiresAt: now,
    lastUsedAt: now,
  },
});

const buildOauthSessionFilter = (query = {}) => {
  const clauses = [];
  const sessionType = String(query.sessionType || "").trim();
  const includeRevoked = query.includeRevoked === "true";
  const activeOnly = query.activeOnly === "true";
  const search = String(query.search || "").trim();

  if (!includeRevoked) {
    clauses.push({ isRevoked: { $ne: true } });
  }

  if (activeOnly) {
    clauses.push({ accessTokenExpiresAt: { $gt: new Date() } });
  }

  if (sessionType === "admin") {
    clauses.push(ADMIN_OAUTH_QUERY);
  } else if (sessionType === "public") {
    clauses.push(PUBLIC_CLIENT_QUERY);
  }

  if (search) {
    const regex = new RegExp(escapeRegExp(search), "i");
    clauses.push({
      $or: [
        { "user.userName": regex },
        { "user.emailId": regex },
        { "user.userRole": regex },
        { "user.userId": regex },
        { "client.clientId": regex },
        { deviceId: regex },
      ],
    });
  }

  if (!clauses.length) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
};

export const authOverviewAction = async (req, res) => {
  const now = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    activeAdminSessions,
    activePublicClientSessions,
    revokedOAuthSessions,
    expiredOAuthSessions,
    adminUsers,
    lockedAdminUsers,
    inactiveAdminUsers,
    customerOtpUsers,
    customerBusinessUsers,
    customersLoggedInToday,
    customersLoggedInSevenDays,
    customersForceLoggedOut,
    auditSummary,
  ] = await Promise.all([
    oauthModel.countDocuments({
      ...ADMIN_OAUTH_QUERY,
      accessTokenExpiresAt: { $gt: now },
      isRevoked: { $ne: true },
    }),
    oauthModel.countDocuments({
      ...PUBLIC_CLIENT_QUERY,
      accessTokenExpiresAt: { $gt: now },
      isRevoked: { $ne: true },
    }),
    oauthModel.countDocuments({ isRevoked: true }),
    oauthModel.countDocuments({
      isRevoked: { $ne: true },
      accessTokenExpiresAt: { $lte: now },
    }),
    adminUserModel.countDocuments({}),
    adminUserModel.countDocuments({ isLocked: true }),
    adminUserModel.countDocuments({ isActive: false }),
    otpUserModel.estimatedDocumentCount(),
    otpUserModel.countDocuments({ businessPeople: true }),
    otpUserModel.countDocuments({ lastLoginAt: { $gte: oneDayAgo } }),
    otpUserModel.countDocuments({ lastLoginAt: { $gte: sevenDaysAgo } }),
    otpUserModel.countDocuments({ tokenVersion: { $gt: 0 } }),
    summarizeAuthAuditEvents(),
  ]);

  res.json({
    success: true,
    overview: {
      generatedAt: new Date().toISOString(),
      activeAdminSessions,
      activePublicClientSessions,
      revokedOAuthSessions,
      expiredOAuthSessions,
      adminUsers,
      lockedAdminUsers,
      inactiveAdminUsers,
      customerOtpUsers,
      customerBusinessUsers,
      customersLoggedInToday,
      customersLoggedInSevenDays,
      customersForceLoggedOut,
      customerOtpSessions: "stateless_jwt",
      policyCount: listAuthPolicies().length,
    },
    policies: listAuthPolicies(),
    auditSummary,
  });
};

export const authSessionsAction = async (req, res) => {
  const limit = getLimit(req.query.limit, 100, 250);
  const filter = buildOauthSessionFilter(req.query);

  const sessions = await oauthModel
    .find(filter)
    .sort({ lastUsedAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({
    success: true,
    sessions: sessions.map(mapSessionRecord),
    count: sessions.length,
  });
};

export const adminUsersAction = async (req, res) => {
  const limit = getLimit(req.query.limit, 100, 250);
  const rawSearch = String(req.query.search || "").trim();
  const status = String(req.query.status || "").trim();
  const filter = {};

  if (rawSearch) {
    const regex = new RegExp(escapeRegExp(rawSearch), "i");
    filter.$or = [
      { userName: regex },
      { emailId: regex },
      { contact: regex },
      { role: regex },
    ];
  }

  if (status === "active") filter.isActive = { $ne: false };
  if (status === "inactive") filter.isActive = false;
  if (status === "locked") filter.isLocked = true;

  const [users, total] = await Promise.all([
    adminUserModel
      .find(filter, {
        password: 0,
        userProfileKey: 0,
        salesBy: 0,
        managedBy: 0,
      })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean(),
    adminUserModel.countDocuments(filter),
  ]);

  const userIds = users.map((user) => String(user._id));
  const userIdQueryValues = userIds.flatMap(getIdQueryValues);
  const sessions = userIds.length
    ? await oauthModel
        .find({
          ...ADMIN_OAUTH_QUERY,
          "user.userId": { $in: userIdQueryValues },
        })
        .lean()
    : [];

  const sessionStats = sessions.reduce((accumulator, session) => {
    const userId = String(session.user?.userId || "");
    if (!userId) return accumulator;

    const entry = accumulator[userId] || {
      activeSessions: 0,
      revokedSessions: 0,
      totalSessions: 0,
      lastSessionAt: null,
    };

    entry.totalSessions += 1;
    if (session.isRevoked) {
      entry.revokedSessions += 1;
    } else if (getSessionStatus(session) === "active") {
      entry.activeSessions += 1;
    }

    const sessionTime =
      toDateOrNull(session.lastUsedAt) ||
      toDateOrNull(session.createdAt) ||
      null;
    if (
      sessionTime &&
      (!entry.lastSessionAt || sessionTime > entry.lastSessionAt)
    ) {
      entry.lastSessionAt = sessionTime;
    }

    accumulator[userId] = entry;
    return accumulator;
  }, {});

  res.json({
    success: true,
    total,
    count: users.length,
    admins: users.map((user) => {
      const stats = sessionStats[String(user._id)] || {
        activeSessions: 0,
        revokedSessions: 0,
        totalSessions: 0,
        lastSessionAt: null,
      };

      return {
        id: String(user._id),
        userName: user.userName || "",
        emailId: user.emailId || "",
        contact: user.contact || "",
        role: user.role || "",
        isActive: user.isActive !== false,
        isLocked: Boolean(user.isLocked),
        loginAttempts: user.loginAttempts || 0,
        forgotPassword: Boolean(user.forgotPassword),
        lastLoginAt: user.lastLoginAt || null,
        lastLoginIP: user.lastLoginIP || "",
        loginDevice: user.loginDevice || "",
        createdAt: user.createdAt || null,
        updatedAt: user.updatedAt || null,
        activeSessions: stats.activeSessions,
        revokedSessions: stats.revokedSessions,
        totalSessions: stats.totalSessions,
        lastSessionAt: stats.lastSessionAt || null,
      };
    }),
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
  const events = await listAuthAuditEvents({
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

export const authSessionRevokeAction = async (req, res) => {
  const sessionId = String(req.params.id || "").trim();
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({ success: false, message: "Invalid session id" });
  }

  const session = await oauthModel.findById(sessionId).lean();
  if (!session) {
    return res.status(404).json({ success: false, message: "Session not found" });
  }

  const now = new Date();
  await oauthModel.updateOne({ _id: session._id }, getRevocationPatch(now));

  logAuthAuditEvent({
    eventType: "revocation",
    actor: req.authActor || null,
    source: "admin-session-revoke",
    req,
    statusCode: 200,
    message: `OAuth session revoked: ${sessionId}`,
    metadata: {
      sessionId,
      subjectId: String(session.user?.userId || ""),
      sessionType: isPublicClientSession(session)
        ? "publicClientCredentials"
        : "adminOAuth",
    },
  });

  let realtimeNotified = 0;
  if (!isPublicClientSession(session)) {
    realtimeNotified = await emitToAdminSessions(
      WS_EVENTS.ADMIN_SESSION_REVOKED,
      {
        reason: "admin_session_revoked",
        tokenId: sessionId,
      },
      { tokenId: sessionId }
    );
  }

  res.json({
    success: true,
    message: "Session revoked",
    revokedCurrentSession: req.authActor?.tokenId === sessionId,
    realtimeNotified,
    session: mapSessionRecord({
      ...session,
      isRevoked: true,
      accessTokenExpiresAt: now,
      refreshTokenExpiresAt: now,
      expiresAt: now,
      lastUsedAt: now,
    }),
  });
};

export const adminUserLogoutAction = async (req, res) => {
  const adminUserId = String(req.params.id || "").trim();
  if (!mongoose.Types.ObjectId.isValid(adminUserId)) {
    return res.status(400).json({ success: false, message: "Invalid admin user id" });
  }

  const adminUser = await adminUserModel.findById(adminUserId).lean();
  if (!adminUser) {
    return res.status(404).json({ success: false, message: "Admin user not found" });
  }

  const result = await oauthModel.updateMany(
    {
      $and: [
        ADMIN_OAUTH_QUERY,
        { isRevoked: { $ne: true } },
        {
          $or: [
            { "user.userId": { $in: getIdQueryValues(adminUserId) } },
            { "user.userName": adminUser.userName || "" },
          ],
        },
      ],
    },
    getRevocationPatch()
  );

  logAuthAuditEvent({
    eventType: "revocation",
    actor: req.authActor || null,
    source: "admin-user-force-logout",
    req,
    statusCode: 200,
    message: `Force logout admin user: ${adminUser.userName || adminUser.emailId}`,
    metadata: {
      adminUserId,
      matched: result.matchedCount,
      revoked: result.modifiedCount,
    },
  });

  const realtimeNotified = await emitToAdminSessions(
    WS_EVENTS.ADMIN_SESSION_REVOKED,
    {
      reason: "admin_force_logout",
      subjectId: adminUserId,
    },
    { subjectId: adminUserId }
  );

  res.json({
    success: true,
    message: "Admin user logged out from active sessions",
    admin: {
      id: adminUserId,
      userName: adminUser.userName || "",
      emailId: adminUser.emailId || "",
    },
    matched: result.matchedCount,
    loggedOut: result.modifiedCount,
    realtimeNotified,
  });
};

export const adminUsersLogoutAllAction = async (req, res) => {
  if (req.body?.confirm !== true) {
    const total = await oauthModel.countDocuments({
      ...ADMIN_OAUTH_QUERY,
      isRevoked: { $ne: true },
    });
    return res.status(400).json({
      success: false,
      message: `Refusing to log out all admins without confirmation. Re-send with { "confirm": true } to revoke ${total} admin sessions.`,
      affectedSessions: total,
    });
  }

  const includeCurrent = req.body?.includeCurrent === true;
  const clauses = [
    ADMIN_OAUTH_QUERY,
    { isRevoked: { $ne: true } },
  ];

  if (
    !includeCurrent &&
    req.authActor?.tokenId &&
    mongoose.Types.ObjectId.isValid(req.authActor.tokenId)
  ) {
    clauses.push({
      _id: { $ne: new mongoose.Types.ObjectId(req.authActor.tokenId) },
    });
  }

  const result = await oauthModel.updateMany(
    { $and: clauses },
    getRevocationPatch()
  );

  logAuthAuditEvent({
    eventType: "revocation",
    actor: req.authActor || null,
    source: "admin-user-force-logout-all",
    req,
    statusCode: 200,
    message: `Force logout ALL admin sessions (${result.modifiedCount} revoked)`,
    metadata: { includeCurrent },
  });

  const realtimeNotified = await emitToAdminSessions(
    WS_EVENTS.ADMIN_SESSION_REVOKED,
    {
      reason: includeCurrent
        ? "admin_force_logout_all"
        : "admin_force_logout_all_except_current",
    },
    { excludeTokenId: includeCurrent ? null : req.authActor?.tokenId || null }
  );

  res.json({
    success: true,
    message: includeCurrent
      ? "All admin sessions logged out"
      : "All other admin sessions logged out",
    matched: result.matchedCount,
    loggedOut: result.modifiedCount,
    realtimeNotified,
    currentSessionIncluded: includeCurrent,
  });
};

export const adminUserRecoveryAction = async (req, res) => {
  const adminUserId = String(req.params.id || "").trim();
  if (!mongoose.Types.ObjectId.isValid(adminUserId)) {
    return res.status(400).json({ success: false, message: "Invalid admin user id" });
  }

  const adminUser = await adminUserModel
    .findByIdAndUpdate(
      adminUserId,
      {
        $set: {
          isActive: true,
          isLocked: false,
          forgotPassword: false,
          loginAttempts: 0,
          updatedAt: new Date(),
        },
      },
      { new: true, projection: { password: 0 } }
    )
    .lean();

  if (!adminUser) {
    return res.status(404).json({ success: false, message: "Admin user not found" });
  }

  logAuthAuditEvent({
    eventType: "recovery",
    actor: req.authActor || null,
    source: "admin-user-recovery",
    req,
    statusCode: 200,
    message: `Admin login recovered: ${adminUser.userName || adminUser.emailId}`,
    metadata: { adminUserId },
  });

  res.json({
    success: true,
    message: "Admin login recovered",
    admin: {
      id: String(adminUser._id),
      userName: adminUser.userName || "",
      emailId: adminUser.emailId || "",
      role: adminUser.role || "",
      isActive: adminUser.isActive !== false,
      isLocked: Boolean(adminUser.isLocked),
      loginAttempts: adminUser.loginAttempts || 0,
      forgotPassword: Boolean(adminUser.forgotPassword),
    },
  });
};

// Customer sessions are stateless JWTs - there is no session row to delete, so
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
      {
        $inc: { tokenVersion: 1 },
        $set: {
          currentOtp: null,
          otpGeneratedAt: null,
          otpExpiresAt: null,
          updatedAt: new Date(),
        },
      },
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
    message: `Force logout customer: ${mobile} (tokenVersion=${customer.tokenVersion})`,
  });

  emitToRoom(buildRoom.user(String(customer._id)), WS_EVENTS.CUSTOMER_SESSION_REVOKED, {
    reason: "admin_force_logout",
    tokenVersion: customer.tokenVersion,
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
    {
      $inc: { tokenVersion: 1 },
      $set: {
        currentOtp: null,
        otpGeneratedAt: null,
        otpExpiresAt: null,
        updatedAt: new Date(),
      },
    }
  );

  logAuthAuditEvent({
    eventType: "revocation",
    actor: req.authActor || null,
    source: "admin-force-logout-all",
    req,
    statusCode: 200,
    message: `Force logout ALL customers (${result.modifiedCount} sessions invalidated)`,
  });

  emitToRoom(buildRoom.customers(), WS_EVENTS.CUSTOMER_SESSION_REVOKED, {
    reason: "admin_force_logout_all",
  });

  res.json({
    success: true,
    message: "All customers logged out on all devices",
    matched: result.matchedCount,
    loggedOut: result.modifiedCount,
  });
};

export const customerRecoveryAction = async (req, res) => {
  const mobile = normalizeMobile(req.body?.mobile);
  if (!mobile) {
    return res.status(400).json({ success: false, message: "mobile is required" });
  }

  const customer = await otpUserModel
    .findOneAndUpdate(
      { mobileNumber1: mobile },
      {
        $set: {
          currentOtp: null,
          otpGeneratedAt: null,
          otpExpiresAt: null,
          mobileNumber1Verified: true,
          updatedAt: new Date(),
        },
      },
      { new: true }
    )
    .lean();

  if (!customer) {
    return res.status(404).json({ success: false, message: "Customer not found" });
  }

  logAuthAuditEvent({
    eventType: "recovery",
    actor: req.authActor || null,
    source: "admin-customer-recovery",
    req,
    statusCode: 200,
    message: `OTP login recovered: ${mobile}`,
  });

  res.json({
    success: true,
    message: "Customer OTP login recovered",
    customer: {
      userName: customer.userName || "",
      mobileNumber1: customer.mobileNumber1,
      tokenVersion: customer.tokenVersion || 0,
    },
  });
};

// Session-management view of the customer base: who exists, recent login
// activity, and whether tokenVersion has invalidated older JWTs. `search`
// accepts a name fragment or any mobile format.
export const customerSessionsAction = async (req, res) => {
  const limit = getLimit(req.query.limit, 100, 500);
  const rawSearch = String(req.query.search || "").trim();
  const filter = {};

  if (rawSearch) {
    const mobile = normalizeMobile(rawSearch);
    const regex = new RegExp(escapeRegExp(rawSearch), "i");
    filter.$or = [{ userName: regex }, { email: regex }, { businessName: regex }];
    if (mobile) filter.$or.push({ mobileNumber1: new RegExp(escapeRegExp(mobile)) });
  }

  const [customers, total] = await Promise.all([
    otpUserModel
      .find(filter, {
        userName: 1,
        email: 1,
        mobileNumber1: 1,
        mobileNumber1Verified: 1,
        businessPeople: 1,
        businessName: 1,
        tokenVersion: 1,
        registeredFrom: 1,
        profileCompleted: 1,
        lastLoginAt: 1,
        loginCount: 1,
        currentOtp: 1,
        otpExpiresAt: 1,
        fcmTokens: 1,
        searchHistory: { $slice: -1 },
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ lastLoginAt: -1, createdAt: -1 })
      .limit(limit)
      .lean(),
    otpUserModel.countDocuments(filter),
  ]);

  const now = new Date();
  res.json({
    success: true,
    total,
    count: customers.length,
    customers: customers.map((customer) => {
      const activeFcmTokens = (customer.fcmTokens || []).filter(
        (token) =>
          token?.isActive !== false &&
          (!token?.expiresAt || new Date(token.expiresAt) > now)
      ).length;
      const latestSearch = Array.isArray(customer.searchHistory)
        ? customer.searchHistory[customer.searchHistory.length - 1] || null
        : null;

      return {
        id: String(customer._id),
        userName: customer.userName || "",
        email: customer.email || "",
        mobileNumber1: customer.mobileNumber1,
        mobileNumber1Verified: customer.mobileNumber1Verified !== false,
        businessPeople: Boolean(customer.businessPeople),
        businessName: customer.businessName || "",
        tokenVersion: customer.tokenVersion || 0,
        forcedLogout: Boolean(customer.tokenVersion),
        registeredFrom: customer.registeredFrom || "unknown",
        profileCompleted: Boolean(customer.profileCompleted),
        lastLoginAt: customer.lastLoginAt || null,
        loginCount: customer.loginCount || 0,
        otpPending: Boolean(
          customer.currentOtp &&
          customer.otpExpiresAt &&
          new Date(customer.otpExpiresAt) > now
        ),
        otpExpiresAt: customer.otpExpiresAt || null,
        activeFcmTokens,
        latestSearch,
        createdAt: customer.createdAt || null,
        updatedAt: customer.updatedAt || null,
      };
    }),
  });
};
