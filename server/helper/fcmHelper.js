import admin from './firebaseInit.js';
import userModel from '../model/msg91Model/usersModels.js';
import webpush from 'web-push';

const VAPID_PUBLIC_KEY = 'BGQ0OCJil87bcnelmazt2Kh5HPivTIEsYuWSN1-9IxGYIjwqbjLVbn_9bnOfiG-Iv7y_ituUYV3v7QrydEyl2UE';
const VAPID_PRIVATE_KEY = 'Jn4dwbWtoXCCm5ux-4_NUvdlmX8WDBiP5L13FYumzAs';

webpush.setVapidDetails('mailto:admin@massclick.in', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export const sendFCMNotification = async (token, title, body, data = {}) => {
  // Web push subscription stored as JSON string
  if (typeof token === 'string' && token.startsWith('{')) {
    try {
      const sub = JSON.parse(token);
      if (sub.endpoint && sub.auth && sub.p256dh) {
        const payload = JSON.stringify({
          notification: { title, body, icon: '/apple-touch-icon.png', data },
        });
        const response = await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
          payload
        );
        console.log('Web push sent:', response.statusCode);
        return response;
      }
    } catch (err) {
      console.error('Web push send error:', err.message);
      throw err;
    }
  }

  // FCM for Android / iOS
  try {
    const message = {
      token,
      notification: { title, body },
      data,
      android: { notification: { channelId: 'massclick_marketing' } },
    };
    const response = await admin.messaging().send(message);
    console.log('FCM message sent:', response);
    return response;
  } catch (error) {
    console.error('Error sending FCM message:', error);
    throw error;
  }
};

export const sendNotificationToUser = async (userId, title, body, data = {}) => {
  try {
    const user = await userModel.findById(userId);
    if (user && user.fcmTokens && user.fcmTokens.length > 0) {
      const activeTokens = user.fcmTokens.filter(
        t => t.isActive && new Date(t.expiresAt) > new Date()
      );
      
      for (const tokenObj of activeTokens) {
        await sendFCMNotification(tokenObj.token, title, body, data);
      }
    } else {
      console.log(`No active FCM tokens found for user ${userId}`);
    }
  } catch (error) {
    console.error('Error sending notification to user:', error);
  }
};