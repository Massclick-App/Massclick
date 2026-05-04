import { saveFCMToken, removeFCMToken, getActiveFCMTokens } from '../helper/fcmTokenHelper.js';
import { BAD_REQUEST, OK } from '../errorCodes.js';
import { ObjectId } from 'mongodb';
import admin from '../helper/firebaseInit.js';
import axios from 'axios';

const VAPID_PUBLIC_KEY = 'BGQ0OCJil87bcnelmazt2Kh5HPivTIEsYuWSN1-9IxGYIjwqbjLVbn_9bnOfiG-Iv7y_ituUYV3v7QrydEyl2UE';
const FCM_PROJECT_ID = 'massclick-dc8f6';

/**
 * Register web push subscription via server-side OAuth
 * POST /api/fcm-token/web-register
 * Body: { userId, endpoint, auth, p256dh }
 */
export const registerWebPushTokenAction = async (req, res) => {
  try {
    const { userId, endpoint, auth, p256dh } = req.body;

    if (!userId || !endpoint || !auth || !p256dh) {
      return res.status(BAD_REQUEST.code).json({ message: 'Missing required fields: userId, endpoint, auth, p256dh' });
    }

    if (!ObjectId.isValid(userId)) {
      return res.status(BAD_REQUEST.code).json({ message: 'Invalid user ID format' });
    }

    const accessTokenResult = await admin.app().options.credential.getAccessToken();
    const accessToken = accessTokenResult.access_token;

    const requestBody = { web: { endpoint, auth, p256dh, applicationPubKey: VAPID_PUBLIC_KEY } };
    console.log('[FCM web-register] Sending to fcmregistrations:', JSON.stringify(requestBody));

    const fcmResponse = await axios.post(
      `https://fcmregistrations.googleapis.com/v1/projects/${FCM_PROJECT_ID}/registrations`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-goog-user-project': FCM_PROJECT_ID,
          'x-goog-api-key': 'AIzaSyAq5epDWb5sBRDg8bfA_HLSF__3J1kW0xc',
        },
      }
    );

    const fcmToken = fcmResponse.data.token;
    console.log('[FCM web-register] Token registered:', fcmToken?.slice(0, 20) + '...');

    const result = await saveFCMToken(userId, {
      token: fcmToken,
      platform: 'web',
      deviceName: req.headers['user-agent']?.slice(0, 100) || 'Web Browser',
    });

    res.status(200).json({ message: 'Web push token registered successfully', data: result });
  } catch (error) {
    const errData = error?.response?.data;
    console.error('[FCM web-register] Failed:', JSON.stringify(errData) || error.message);
    res.status(500).json({ message: errData?.error?.message || error.message, detail: errData });
  }
};

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
    
    // Use the userId from request body directly if it's a valid ObjectId
    const userId = requestUserId?.toString().trim();

    console.log('saveFCMTokenAction request:', {
      requestUserId: userId,
      tokenPresent: Boolean(token),
      platform
    });

    if (!userId || !token || !platform) {
      return res.status(BAD_REQUEST.code).json({
        message: 'Missing required fields: userId, token, platform',
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
