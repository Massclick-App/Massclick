import { saveFCMToken, removeFCMToken, getActiveFCMTokens } from '../helper/fcmTokenHelper.js';
import { BAD_REQUEST, OK } from '../errorCodes.js';
import { ObjectId } from 'mongodb';
import { resolveEffectiveSubjectId } from '../auth/authMiddleware.js';
/**
 * Register web push subscription
 * POST /api/fcm-token/web-register
 * Body: { endpoint, auth, p256dh }
 */
export const registerWebPushTokenAction = async (req, res) => {
  try {
    const { endpoint, auth, p256dh } = req.body;
    const userId = resolveEffectiveSubjectId(req);

    if (!endpoint || !auth || !p256dh) {
      return res.status(BAD_REQUEST.code).json({ message: 'Missing required fields: endpoint, auth, p256dh' });
    }

    const subscriptionToken = JSON.stringify({ endpoint, auth, p256dh });

    const result = await saveFCMToken(userId, {
      token: subscriptionToken,
      platform: 'web',
      deviceName: req.headers['user-agent']?.slice(0, 100) || 'Web Browser',
    });

    console.log('[FCM web-register] Web push subscription saved for userId:', userId);
    res.status(200).json({ message: 'Web push subscription registered', data: result });
  } catch (error) {
    console.error('[FCM web-register] Failed:', error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Save or update FCM token for a user
 * POST /api/fcm-token/save
 * Body: {
 *   token: string,
 *   deviceName: string (optional),
 *   platform: 'android' | 'ios' | 'web'
 * }
 */
export const saveFCMTokenAction = async (req, res) => {
  try {
    const { token, deviceName, platform } = req.body;
    const userId = resolveEffectiveSubjectId(req, {
      allowAdminOverride: true,
      fieldNames: ["userId"],
    });

    console.log('saveFCMTokenAction request:', {
      requestUserId: userId,
      tokenPresent: Boolean(token),
      platform
    });

    if (!token || !platform) {
      return res.status(BAD_REQUEST.code).json({
        message: 'Missing required fields: token, platform',
        code: BAD_REQUEST.code
      });
    }

    // Validate ObjectId format before proceeding
    if (!ObjectId.isValid(userId)) {
      return res.status(BAD_REQUEST.code).json({
        message: 'Invalid user ID format',
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
    const { oldToken } = req.params;
    const { newToken, deviceName } = req.body;
    const userId = resolveEffectiveSubjectId(req, {
      allowAdminOverride: true,
      fieldNames: ["userId"],
    });

    if (!oldToken || !newToken) {
      return res.status(BAD_REQUEST.code).json({
        message: 'Missing required parameters: oldToken, newToken',
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
    const { token } = req.params;
    const userId = resolveEffectiveSubjectId(req, {
      allowAdminOverride: true,
      fieldNames: ["userId"],
    });

    if (!token) {
      return res.status(BAD_REQUEST.code).json({
        message: 'Missing required parameters: token',
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
    const userId = resolveEffectiveSubjectId(req, {
      allowAdminOverride: true,
      fieldNames: ["userId"],
    });

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
