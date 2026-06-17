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
import { requireAdminAuth, requireAuthPolicy } from '../auth/authMiddleware.js';

const router = express.Router();

// Register web push subscription server-side (uses JWT from OTP login)
router.post('/api/fcm-token/web-register', requireAuthPolicy('fcm.web-register'), registerWebPushTokenAction);

// Save new FCM token
router.post('/api/fcm-token/save', requireAuthPolicy('fcm.save'), saveFCMTokenAction);

// Refresh FCM token (remove old, save new)
router.put('/api/fcm-token/refresh/:userId/:oldToken', requireAuthPolicy('fcm.refresh'), refreshFCMTokenAction);

// Remove FCM token
router.delete('/api/fcm-token/remove/:userId/:token', requireAuthPolicy('fcm.remove'), removeFCMTokenAction);

// Get all active FCM tokens for a user
router.get('/api/fcm-token/:userId', requireAdminAuth('fcm.list'), getActiveFCMTokensAction);

// Send a single FCM notification
router.post('/api/fcm-token/send-single', requireAdminAuth('fcm.send-single'), sendSingleNotificationAction);

// Send bulk FCM notifications
router.post('/api/fcm-token/send-bulk', requireAdminAuth('fcm.send-bulk'), sendBulkNotificationAction);

export default router;
