import express from 'express';
import {
  saveFCMTokenAction,
  refreshFCMTokenAction,
  removeFCMTokenAction,
  getActiveFCMTokensAction
} from '../controller/fcmTokenController.js';
import { oauthAuthentication } from '../helper/oauthHelper.js';

const router = express.Router();

/**
 * FCM Token Management Routes
 * All routes require OAuth authentication
 */

// Save new FCM token
router.post('/api/fcm-token/save', oauthAuthentication, saveFCMTokenAction);

// Refresh FCM token (remove old, save new)
router.put('/api/fcm-token/refresh/:userId/:oldToken', oauthAuthentication, refreshFCMTokenAction);

// // Save new FCM token
// router.post('/api/fcm-token/save', saveFCMTokenAction);

// // Refresh FCM token (remove old, save new)
// router.put('/api/fcm-token/refresh/:userId/:oldToken', refreshFCMTokenAction);


// Remove FCM token
router.delete('/api/fcm-token/remove/:userId/:token', oauthAuthentication, removeFCMTokenAction);

// Get all active FCM tokens for a user
router.get('/api/fcm-token/:userId', oauthAuthentication, getActiveFCMTokensAction);

export default router;
