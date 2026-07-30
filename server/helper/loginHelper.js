import userModel from "../model/userModel.js";
import oauthModel from '../model/oauthModel.js';
import bcrypt from "bcrypt";
import { WS_EVENTS } from "../websocket/constants.js";
import { emitToAdminSessions } from "../websocket/roomManager.js";

export const userValidation = async function (userName, password) {
    const trimmedUserName = userName.trim();
    const trimmedPassword = password.trim();

    try {
        const user = await userModel.findOne({ userName: trimmedUserName }).exec();

        if (!user) {
            console.error('User not found');
            throw { error: 'User not found', status: 404 };
        }

        if (user.hide) {
            console.error('User is blocked');
            throw { error: 'User is blocked', status: 401 };
        }

        if (user.isActive === false) {
            console.error('User is inactive');
            throw { error: 'User is inactive', status: 401 };
        }

        if (user.isLocked) {
            console.error('User is locked');
            throw { error: 'User is locked. Please recover the admin login.', status: 401 };
        }

        const isMatched = await bcrypt.compare(trimmedPassword, user.password);
        if (!isMatched) {
            const nextAttempts = Number(user.loginAttempts || 0) + 1;
            user.loginAttempts = nextAttempts;
            if (nextAttempts >= 5) {
                user.isLocked = true;
            }
            await user.save();
            console.error('Invalid password');
            throw { error: 'Invalid password', status: 401 };
        }

        user.loginAttempts = 0;
        user.isLocked = false;
        user.forgotPassword = false;
        user.lastLoginAt = new Date();
        await user.save();

        const now = new Date();
        await oauthModel.updateMany(
            {
                isRevoked: { $ne: true },
                $or: [
                    { 'user.userId': user._id },
                    { 'user.userId': String(user._id) },
                    { 'user.userName': trimmedUserName },
                ],
            },
            {
                $set: {
                    isRevoked: true,
                    accessTokenExpiresAt: now,
                    refreshTokenExpiresAt: now,
                    expiresAt: now,
                    lastUsedAt: now,
                },
            }
        ).exec();
        await emitToAdminSessions(
            WS_EVENTS.ADMIN_SESSION_REVOKED,
            {
                reason: "admin_new_login",
                subjectId: String(user._id),
            },
            { subjectId: String(user._id) }
        );

        return user;

    } catch (err) {
        console.error('Error finding/updating user:', err);
        throw err.error ? err : { error: 'Internal server error', status: 500 };
    }
};
