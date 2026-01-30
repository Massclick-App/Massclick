// helper/oauthHelper.js
import OAuth2Server from 'oauth2-server';
import oauthModel from '../model/oauthModel.js';
import clientModel from '../model/clientModel.js';
import { BAD_REQUEST, UNAUTHORIZED } from "../errorCodes.js";
import { userValidation } from '../helper/loginHelper.js';
import mongoose from 'mongoose';
import crypto from 'crypto';
import userModel from '../model/userModel.js';
import message91Model from '../model/msg91Model/usersModels.js';
// ---------- OAuth2 Server Model Functions ----------
const getAccessToken = (token) => oauthModel.findOne({ accessToken: token }).lean();

const getClient = (clientId, clientSecret) => clientModel.findOne({ clientId, clientSecret }).lean();

const saveToken = async (token, client, user) => {
    const userId = user.userId || 'client_user_id';

    await oauthModel.deleteMany({ 'user.userId': userId });

    const tokenInstance = new oauthModel({
        accessToken: token.accessToken,
        accessTokenExpiresAt: token.accessTokenExpiresAt,
        refreshToken: token.refreshToken,
        refreshTokenExpiresAt: token.refreshTokenExpiresAt,
        client: {
            id: client.id,
            clientId: client.clientId,
        },
        user: {
            userName: user.userName,
            emailId: user.emailId || null,
            userId: userId,
            userRole: user.role || 'user',
            firstTimeUser: user.firstTimeUser || false,
            forgotPassword: user.forgotPassword || false,
        },
    });

    const savedToken = await tokenInstance.save();
    delete savedToken._id;
    delete savedToken.__v;
    return savedToken;
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
        const message = err.error || "Invalid credentials";
        const statusCode = err.status || 401;

        const oauthError = new OAuth2Server.InvalidGrantError(message);
        oauthError.code = statusCode;

        throw oauthError;  
    }
};

const getRefreshToken = (refreshToken) => oauthModel.findOne({ refreshToken }).lean();

const revokeToken = (token) => oauthModel.deleteOne({ refreshToken: token.refreshToken }).lean();

const oauthtoken = new OAuth2Server({
    model: {
        getAccessToken,
        getClient,
        saveToken,
        getUser,
        getRefreshToken,
        revokeToken,
    },
});

export const createClientToken = async (clientId, clientSecret) => {
    const client = await clientModel.findOne({ clientId, clientSecret }).lean();
    if (!client) throw new Error('Invalid client credentials');

    const user = {
        userName: 'client_user',
        emailId: null,
        userId: 'client_user_id',
        userRole: 'client',
        firstTimeUser: false,
        forgotPassword: false,
    };

    const accessToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');

    const tokenObj = {
        accessToken,
        refreshToken,
        accessTokenExpiresAt: new Date(Date.now() + 20 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    const savedToken = await saveToken(tokenObj, client, user);
    return savedToken;
};

// ---------- OAuth Password Grant ----------
export const oauthValidation = async (req) => {
    const request = new OAuth2Server.Request(req);
    const response = new OAuth2Server.Response(req);

    try {
        const tokenInfo = await oauthtoken.token(request, response);
        return tokenInfo;
    } catch (error) {
        return { error: error.message };
    }
};

// ---------- OAuth Authentication Middleware ----------
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

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.authUser = null;
    return next();
  }

  try {
    const request = new OAuth2Server.Request(req);
    const response = new OAuth2Server.Response(res);

    const token = await oauthtoken.authenticate(request, response);
    const tokenUser = token.user;

    if (mongoose.Types.ObjectId.isValid(tokenUser?.userId)) {
      req.authUser = tokenUser;
      return next();
    }

    if (tokenUser?.userId === "client_user_id") {
      const mobile =
        req.body?.mobileNumber1 ||
        req.query?.mobileNumber1 ||
        req.headers["x-mobile-number"];

      if (!mobile) {
        req.authUser = null;
        return next();
      }

      const msgUser = await message91Model
        .findOne({ mobileNumber1: String(mobile).trim() })
        .lean();

      if (!msgUser) {
        req.authUser = null;
        return next();
      }

      req.authUser = {
        userId: msgUser._id,
        userName: msgUser.userName,
        profileImage: msgUser.profileImageKey || "",
        mobileVerified: msgUser.mobileNumber1Verified,
        role: "USER",
      };

      return next();
    }

    req.authUser = null;
    next();
  } catch (err) {
    req.authUser = null;
    next();
  }
};

export const handleRefreshTokenRequest = async (req, res) => {
    const request = new OAuth2Server.Request(req);
    const response = new OAuth2Server.Response(res);

    try {
        const tokenInfo = await oauthtoken.token(request, response);
        return tokenInfo;
    } catch (error) {
        res.status(error.code || 500).json({ error: error.message });
    }
};

export const logoutUsers = async (accessToken) => {
  try {
    const tokenRecord = await oauthModel.findOne({ accessToken }).lean();

    if (!tokenRecord) {
      console.warn("No token found for logout");
      return false;
    }

    const { user, client } = tokenRecord;

    if (!client?.clientId) {
      console.warn("Client ID missing in token");
      return false;
    }

    const deleteQuery = {
      "client.clientId": client.clientId,
    };

    const deleteResult = await oauthModel.deleteMany(deleteQuery);

    return true;
  } catch (error) {
    console.error("Logout cleanup error:", error);
    return false;
  }
};
