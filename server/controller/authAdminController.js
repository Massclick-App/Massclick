import oauthModel from "../model/oauthModel.js";
import { listAuthPolicies } from "../auth/authPolicyRegistry.js";
import {
  listAuthAuditEvents,
  summarizeAuthAuditEvents,
} from "../auth/authAuditStore.js";
import { resolveAuthActorFromToken } from "../auth/authResolver.js";

const nowFilter = { $gt: new Date() };

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
