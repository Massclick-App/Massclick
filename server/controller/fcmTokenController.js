import { saveFCMToken, removeFCMToken, getActiveFCMTokens } from '../helper/fcmTokenHelper.js';
import { BAD_REQUEST, OK } from '../errorCodes.js';

/**
 * Save or update FCM token for a user
 * POST /api/fcm-token/save
 * Body: {
 *   userId: string,
 *   token: string,
 *   deviceName: string (optional),
 *   platform: 'android' | 'ios' | 'web'
 * }
 */
export const saveFCMTokenAction = async (req, res) => {
  try {
    const { userId: requestUserId, token, deviceName, platform } = req.body;
    const authUserId = req.authUser?.userId;
    const userId = authUserId && authUserId !== 'client_user_id' ? authUserId : requestUserId;

    console.debug('saveFCMTokenAction request:', {
      authUserId,
      requestUserId,
      tokenPresent: Boolean(token),
      platform
    });

    if (!userId || !token || !platform) {
      return res.status(BAD_REQUEST.code).json({
        message: 'Missing required fields: userId, token, platform',
        code: BAD_REQUEST.code
      });
    }

    const result = await saveFCMToken(userId, {
      token,
      deviceName: deviceName || 'Unknown Device',
      platform
    });

    res.status(200).json({
      message: 'FCM token saved successfully',
      data: result,
      code: OK.code
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return res.status(400).json({
      message: error.message || 'Failed to save FCM token'
    });
  }
};

/**
 * Refresh FCM token
 * PUT /api/fcm-token/refresh/:userId/:oldToken
 * Body: {
 *   newToken: string,
 *   deviceName: string (optional)
 * }
 */
export const refreshFCMTokenAction = async (req, res) => {
  try {
    const { userId, oldToken } = req.params;
    const { newToken, deviceName } = req.body;

    if (!userId || !oldToken || !newToken) {
      return res.status(BAD_REQUEST.code).json({
        message: 'Missing required parameters: userId, oldToken, newToken',
        code: BAD_REQUEST.code
      });
    }

    // Remove old token
    await removeFCMToken(userId, oldToken);

    // Save new token
    const result = await saveFCMToken(userId, {
      token: newToken,
      deviceName: deviceName || 'Unknown Device',
      platform: 'android' // Default platform
    });

    res.status(200).json({
      message: 'FCM token refreshed successfully',
      data: result,
      code: OK.code
    });
  } catch (error) {
    console.error('Error refreshing FCM token:', error);
    return res.status(400).json({
      message: error.message || 'Failed to refresh FCM token'
    });
  }
};

/**
 * Remove FCM token
 * DELETE /api/fcm-token/remove/:userId/:token
 */
export const removeFCMTokenAction = async (req, res) => {
  try {
    const { userId, token } = req.params;

    if (!userId || !token) {
      return res.status(BAD_REQUEST.code).json({
        message: 'Missing required parameters: userId, token',
        code: BAD_REQUEST.code
      });
    }

    const result = await removeFCMToken(userId, token);

    res.status(200).json({
      message: 'FCM token removed successfully',
      data: result,
      code: OK.code
    });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    return res.status(400).json({
      message: error.message || 'Failed to remove FCM token'
    });
  }
};

/**
 * Get all active FCM tokens for a user
 * GET /api/fcm-token/:userId
 */
export const getActiveFCMTokensAction = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(BAD_REQUEST.code).json({
        message: 'Missing required parameter: userId',
        code: BAD_REQUEST.code
      });
    }

    const tokens = await getActiveFCMTokens(userId);

    res.status(200).json({
      message: 'FCM tokens retrieved successfully',
      data: tokens,
      count: tokens.length,
      code: OK.code
    });
  } catch (error) {
    console.error('Error retrieving FCM tokens:', error);
    return res.status(400).json({
      message: error.message || 'Failed to retrieve FCM tokens'
    });
  }
};
