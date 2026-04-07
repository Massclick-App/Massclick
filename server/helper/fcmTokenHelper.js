import { ObjectId } from 'mongodb';
import userModel from '../model/userModel.js';

/**
 * Save or update FCM token for a user
 * If token already exists, update its refresh timestamp
 * If token is new, add it to the array
 */
export const saveFCMToken = async (userId, tokenData) => {
  try {
    if (!ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await userModel.findById(userId);
    if (!user) {
      console.error(`saveFCMToken: user not found for id=${userId}`);
      throw new Error('User not found');
    }

    // Check if token already exists
    const existingTokenIndex = user.fcmTokens.findIndex(
      t => t.token === tokenData.token
    );

    if (existingTokenIndex !== -1) {
      // Update existing token
      user.fcmTokens[existingTokenIndex].lastRefreshedAt = new Date();
      user.fcmTokens[existingTokenIndex].isActive = true;
      user.fcmTokens[existingTokenIndex].expiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ); // Extend expiry by 30 days
      user.fcmTokens[existingTokenIndex].platform = tokenData.platform || user.fcmTokens[existingTokenIndex].platform;
      if (tokenData.deviceName) {
        user.fcmTokens[existingTokenIndex].deviceName = tokenData.deviceName;
      }
    } else {
      // Add new token
      user.fcmTokens.push({
        token: tokenData.token,
        deviceName: tokenData.deviceName || 'Unknown Device',
        platform: tokenData.platform || 'android',
        isActive: true,
        registeredAt: new Date(),
        lastRefreshedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }

    // Limit to 10 active tokens per user (keep most recent ones)
    if (user.fcmTokens.length > 10) {
      user.fcmTokens = user.fcmTokens
        .sort((a, b) => b.lastRefreshedAt - a.lastRefreshedAt)
        .slice(0, 10);
    }

    await user.save();

    return {
      userId: user._id,
      token: tokenData.token,
      message: existingTokenIndex !== -1 ? 'Token refreshed' : 'Token saved',
      activeTokensCount: user.fcmTokens.filter(t => t.isActive).length
    };
  } catch (error) {
    console.error('Error saving FCM token:', error);
    throw error;
  }
};

/**
 * Remove FCM token for a user
 */
export const removeFCMToken = async (userId, token) => {
  try {
    if (!ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const initialCount = user.fcmTokens.length;
    user.fcmTokens = user.fcmTokens.filter(t => t.token !== token);

    if (user.fcmTokens.length === initialCount) {
      throw new Error('Token not found');
    }

    await user.save();

    return {
      userId: user._id,
      message: 'Token removed successfully',
      activeTokensCount: user.fcmTokens.filter(t => t.isActive).length
    };
  } catch (error) {
    console.error('Error removing FCM token:', error);
    throw error;
  }
};

/**
 * Get all active FCM tokens for a user
 */
export const getActiveFCMTokens = async (userId) => {
  try {
    if (!ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Filter active and non-expired tokens
    const now = new Date();
    const activeTokens = user.fcmTokens.filter(
      t => t.isActive && t.expiresAt > now
    );

    return activeTokens.map(token => ({
      token: token.token,
      deviceName: token.deviceName,
      platform: token.platform,
      registeredAt: token.registeredAt,
      lastRefreshedAt: token.lastRefreshedAt,
      expiresAt: token.expiresAt
    }));
  } catch (error) {
    console.error('Error getting active FCM tokens:', error);
    throw error;
  }
};

/**
 * Deactivate inactive/expired tokens (cleanup job)
 */
export const cleanupExpiredTokens = async (userId) => {
  try {
    if (!ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    const expiredTokens = user.fcmTokens.filter(t => t.expiresAt <= now);

    if (expiredTokens.length > 0) {
      user.fcmTokens = user.fcmTokens.filter(t => t.expiresAt > now);
      await user.save();
    }

    return {
      userId: user._id,
      expiredTokensRemoved: expiredTokens.length,
      activeTokensCount: user.fcmTokens.filter(t => t.isActive).length
    };
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    throw error;
  }
};

/**
 * Get all users with active FCM tokens (for batch notifications)
 */
export const getAllUsersWithActiveTokens = async () => {
  try {
    const now = new Date();
    const users = await userModel.find({
      'fcmTokens.isActive': true,
      'fcmTokens.expiresAt': { $gt: now }
    });

    return users.map(user => ({
      userId: user._id,
      userName: user.userName,
      activeTokensCount: user.fcmTokens.filter(
        t => t.isActive && t.expiresAt > now
      ).length,
      tokens: user.fcmTokens.filter(
        t => t.isActive && t.expiresAt > now
      )
    }));
  } catch (error) {
    console.error('Error getting users with active tokens:', error);
    throw error;
  }
};
