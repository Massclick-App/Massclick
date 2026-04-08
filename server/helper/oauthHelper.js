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
        id: client._id,
        clientId: client.clientId,
        grants: ['password', 'refresh_token', 'client_credentials'], // ✅ IMPORTANT
    };
};

const saveToken = async (token, client, user) => {
    const userId = user?.userId || crypto.randomBytes(16).toString('hex');

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
            userName: user?.userName || 'client_user',
            emailId: user?.emailId || null,
            userId: userId,
            userRole: user?.role || 'client',
            firstTimeUser: false,
            forgotPassword: false,
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
        const oauthError = new OAuth2Server.InvalidGrantError(err.message || "Invalid credentials");
        throw oauthError;
    }
};

const getRefreshToken = (refreshToken) => oauthModel.findOne({ refreshToken }).lean();

const revokeToken = (token) => oauthModel.deleteOne({ refreshToken: token.refreshToken }).lean();

// ✅ EXPORT THIS
export const oauthtoken = new OAuth2Server({
    model: {
        getAccessToken,
        getClient,
        saveToken,
        getUser,
        getRefreshToken,
        revokeToken,
    },
});

// ---------- PASSWORD GRANT ----------
export const oauthValidation = async (req) => {
    const request = new OAuth2Server.Request(req);
    const response = new OAuth2Server.Response(res);

    try {
        return await oauthtoken.token(request, response);
    } catch (error) {
        return { error: error.message };
    }
};

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