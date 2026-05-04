import express from 'express';
import {
  saveFCMTokenAction,
  refreshFCMTokenAction,
  removeFCMTokenAction,
  getActiveFCMTokensAction,
  registerWebPushTokenAction
} from '../controller/fcmTokenController.js';
import {
  sendSingleNotificationAction,
  sendBulkNotificationAction
} from '../controller/fcmNotificationController.js';
import { oauthAuthentication } from '../helper/oauthHelper.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

const jwtAuthentication = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    req.authUser = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Register web push subscription server-side (uses JWT from OTP login)
router.post('/api/fcm-token/web-register', jwtAuthentication, registerWebPushTokenAction);

// Save new FCM token
router.post('/api/fcm-token/save', oauthAuthentication, saveFCMTokenAction);

// Refresh FCM token (remove old, save new)
router.put('/api/fcm-token/refresh/:userId/:oldToken', oauthAuthentication, refreshFCMTokenAction);

// Remove FCM token
router.delete('/api/fcm-token/remove/:userId/:token', oauthAuthentication, removeFCMTokenAction);

// Get all active FCM tokens for a user
router.get('/api/fcm-token/:userId', oauthAuthentication, getActiveFCMTokensAction);

// Send a single FCM notification
router.post('/api/fcm-token/send-single', oauthAuthentication, sendSingleNotificationAction);

// Send bulk FCM notifications
router.post('/api/fcm-token/send-bulk', oauthAuthentication, sendBulkNotificationAction);

export default router;
