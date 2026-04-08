import OAuth2Server from 'oauth2-server';
import oauthModel from '../model/oauthModel.js';
import clientModel from '../model/clientModel.js';
import { UNAUTHORIZED } from "../errorCodes.js";
import { userValidation } from '../helper/loginHelper.js';
import mongoose from 'mongoose';
import crypto from 'crypto';
import userModel from '../model/userModel.js';

// ---------- OAuth2 Server Model Functions ----------

const getAccessToken = (token) => oauthModel.findOne({ accessToken: token }).lean();

// ✅ FIXED
const getClient = async (clientId, clientSecret) => {
  const client = await clientModel.findOne({ clientId, clientSecret }).lean();

  if (!client) return null;

  return {
    id: String(client._id),
    clientId: client.clientId,
    grants: ['password', 'refresh_token', 'client_credentials'], // ✅ IMPORTANT
  };
};

// In oauthHelper.js — replace saveToken only

const saveToken = async (token, client, user) => {
  const userId = user?.userId || crypto.randomBytes(16).toString('hex');
  const isClientCredentials = !token.refreshToken;

  const tokenData = {
    accessToken: token.accessToken,
    accessTokenExpiresAt: token.accessTokenExpiresAt,
    client: {
      id: String(client.id),
      clientId: client.clientId,
    },
    user: {
      userName: user?.userName || 'client_user',
      emailId: user?.emailId || null,
      userId: userId,
      userRole: user?.role || 'client',
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

    return oauthModel.findOneAndUpdate(
      {
        'client.clientId': client.clientId,
        deviceId,
        refreshToken: { $exists: false },
      },
      {
        $set: {
          ...tokenData,
          deviceId,
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  const tokenInstance = new oauthModel(tokenData);
  return tokenInstance.save();
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
    const oauthError = new OAuth2Server.InvalidGrantError(err.message || "Invalid credentials");
    throw oauthError;
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

// In oauthHelper.js — replace getUserFromClient

const getUserFromClient = async (client, req) => {
  // oauth2-server passes the raw request as the second argument to
  // getUserFromClient when you're using a custom model.
  // If your version doesn't forward req here, read it from
  // the OAuth2Server.Request you built in the controller instead.
  const deviceId =
    req?.body?.device_id ||
    req?.query?.device_id ||
    'unknown';

  return {
    userId: client.id,
    userName: client.clientId,
    role: 'client',
    deviceId,                    // ← forwarded into saveToken → upsert filter
  };
};

// ✅ EXPORT THIS
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
});

// // ---------- PASSWORD GRANT ----------
// export const oauthValidation = async (req) => {
//     const request = new OAuth2Server.Request(req);
//     const response = new OAuth2Server.Response(res);

//     try {
//         return await oauthtoken.token(request, response);
//     } catch (error) {
//         return { error: error.message };
//     }
// };

// ---------- AUTH MIDDLEWARE ----------
export const oauthAuthentication = async (req, res, next) => {
  const request = new OAuth2Server.Request(req);
  const response = new OAuth2Server.Response(res);

  try {
    const token = await oauthtoken.authenticate(request, response);

    const userId = token.user?.userId;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      const latestUser = await userModel.findById(userId).lean();
      if (latestUser) {
        token.user.userRole = latestUser.role;
      }
    }

    req.authUser = token.user;
    next();
  } catch (err) {
    console.error("OAuth Authentication Error:", err);
    return res.status(UNAUTHORIZED.code).send({ error: err.message });
  }
};

// ---------- LOGOUT ----------
export const logoutUsers = async (accessToken) => {
  try {
    const tokenRecord = await oauthModel.findOne({ accessToken }).lean();
    if (!tokenRecord) return false;

    await oauthModel.deleteOne({ accessToken }); // ✅ only this session
    return true;
  } catch (error) {
    console.error("Logout cleanup error:", error);
    return false;
  }
};
