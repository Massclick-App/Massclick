import axios from 'axios';
import { requestFCMToken } from '../firebase';

const API_URL = process.env.REACT_APP_API_URL;

export async function registerWebFCMToken(userId, authToken) {
  console.log('[FCM] registerWebFCMToken called — userId:', userId, 'hasToken:', !!authToken);
  try {
    const token = await requestFCMToken();
    if (!token) {
      console.warn('[FCM] No FCM token returned — permission denied or service worker missing');
      return;
    }

    console.log('[FCM] Saving token to server...');
    const res = await axios.post(
      `${API_URL}/api/fcm-token/save`,
      {
        userId,
        token,
        platform: 'web',
        deviceName: navigator.userAgent.slice(0, 100),
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('[FCM] Token saved successfully:', res.data);
  } catch (err) {
    console.error('[FCM] Failed to save token:', err?.response?.data || err.message);
  }
}
