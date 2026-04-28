import admin from './firebaseInit.js';
import userModel from '../model/msg91Model/usersModels.js';

export const sendFCMNotification = async (token, title, body, data = {}) => {
  try {
    const message = {
      token: token,
      notification: { title, body },
      data: data,
      android: {
        notification: { channelId: 'massclick_marketing' },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
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