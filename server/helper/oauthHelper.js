import OAuth2Server from 'oauth2-server';
import { AsyncLocalStorage } from 'async_hooks';
import oauthModel from '../model/oauthModel.js';
import clientModel from '../model/clientModel.js';
import { createHttpAuthMiddleware } from "../auth/authMiddleware.js";
import { userValidation } from '../helper/loginHelper.js';
import crypto from 'crypto';
import { getRolePermissions } from "../auth/authRoles.js";

// ── Request context store ─────────────────────────────────────────────────────
// Scoped per async call chain so concurrent requests can't read each other's
// device_id (a shared module-level variable here previously let request B's
// body clobber request A's before A's oauthtoken.token() awaited down to
// getUserFromClient).
const requestContextStorage = new AsyncLocalStorage();

export const withRequestContext = (body, fn) => requestContextStorage.run(body || {}, fn);

// ---------- OAuth2 Server Model Functions ----------

const getAccessToken = (token) => oauthModel.findOne({ accessToken: token }).lean();

const getClient = async (clientId, clientSecret) => {
  const client = await clientModel.findOne({ clientId, clientSecret }).lean();
  if (!client) return null;
  return {
    id: String(client._id),
    clientId: client.clientId,
    grants: ['password', 'refresh_token', 'client_credentials'],
  };
};

const getUserFromClient = async (client) => {
  const deviceId = requestContextStorage.getStore()?.device_id || 'unknown';
  return {
    userId: client.id,
    userName: client.clientId,
    role: 'client',
    deviceId,
  };
};

const saveToken = async (token, client, user) => {
  const userId = user?.userId || crypto.randomBytes(16).toString('hex');
  const isClientCredentials = !token.refreshToken;
  const userRole = user?.role || user?.userRole || 'client';
  const allowedPages = await getRolePermissions(userRole);

  const tokenData = {
    accessToken: token.accessToken,
    accessTokenExpiresAt: token.accessTokenExpiresAt,
    // Later of the two expiries, so the TTL index reaps once the session is
    // truly done rather than at access-token expiry (which would delete
    // admin sessions still eligible for refresh).
    expiresAt: token.refreshTokenExpiresAt || token.accessTokenExpiresAt,
    isClientCredential: isClientCredentials,
    client: {
      id: String(client.id),
      clientId: client.clientId,
    },
    user: {
      userName: user?.userName || 'client_user',
      emailId: user?.emailId || null,
      userId: userId,
      userRole,
      allowedPages,
      firstTimeUser: false,
      forgotPassword: false,
      ...(user?.deviceId && { deviceId: user.deviceId }),
    },
    lastUsedAt: new Date(),
    ...(token.refreshToken && {
      refreshToken: token.refreshToken,
      refreshTokenExpiresAt: token.refreshTokenExpiresAt,
    }),
  };

  if (isClientCredentials) {
    const deviceId = user?.deviceId || 'unknown';
    // Atomic upsert instead of deleteOne+save: two concurrent requests from
    // the same device can no longer both survive as separate rows.
    const saved = await oauthModel.findOneAndUpdate(
      { 'client.clientId': client.clientId, deviceId },
      { $set: { ...tokenData, deviceId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return saved;
  }

  const tokenInstance = new oauthModel(tokenData);
  const saved = await tokenInstance.save();
  return saved;
};

const getUser = async (userName, password) => {
  try {
    const user = await userValidation(userName, password);
    return {
      userId: user._id,
      userName: user.userName,
      emailId: user.emailId,
      role: user.role,
    };
  } catch (err) {
    throw new OAuth2Server.InvalidGrantError(err.message || "Invalid credentials");
  }
};

const getRefreshToken = async (refreshToken) => {
  const token = await oauthModel.findOne({ refreshToken }).lean();
  if (!token) return null;
  return {
    refreshToken: token.refreshToken,
    refreshTokenExpiresAt: token.refreshTokenExpiresAt,
    client: {
      id: token.client?.id ? String(token.client.id) : null,
      clientId: token.client?.clientId,
      grants: ['password', 'refresh_token', 'client_credentials'],
    },
    user: token.user,
  };
};

const revokeToken = async (token) => {
  const result = await oauthModel.deleteOne({ refreshToken: token.refreshToken });
  return result.deletedCount > 0;
};

export const oauthtoken = new OAuth2Server({
  model: {
    getAccessToken,
    getClient,
    saveToken,
    getUser,
    getRefreshToken,
    revokeToken,
    getUserFromClient,
  },
  accessTokenLifetime: 60 * 60, // 1 hour
  refreshTokenLifetime: 24 * 60 * 60, // 24 hours
});

// ---------- AUTH MIDDLEWARE ----------
export const oauthAuthentication = async (req, res, next) => {
  return createHttpAuthMiddleware({
    allowedActorTypes: ["admin", "publicClient"],
    source: "oauth-http",
  })(req, res, next);
};

// ---------- LOGOUT ----------
export const logoutUsers = async (accessToken) => {
  try {
    const tokenRecord = await oauthModel.findOne({ accessToken }).lean();
    if (!tokenRecord) return false;
    await oauthModel.deleteOne({ accessToken });
    return true;
  } catch (error) {
    console.error("Logout cleanup error:", error);
    return false;
  }
};
