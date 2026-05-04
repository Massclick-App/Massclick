import axios from 'axios';
import { requestPushSubscription } from '../firebase';

const API_URL = process.env.REACT_APP_API_URL;

export async function registerWebFCMToken(userId, authToken) {
  console.log('[FCM] registerWebFCMToken called — userId:', userId, 'hasToken:', !!authToken);
  try {
    const subscription = await requestPushSubscription();
    if (!subscription) {
      console.warn('[FCM] No push subscription — permission denied or browser not supported');
      return;
    }

    console.log('[FCM] Sending subscription to server...');
    const res = await axios.post(
      `${API_URL}/fcm-token/web-register`,
      { userId, ...subscription },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('[FCM] Token registered successfully:', res.data);
  } catch (err) {
    console.error('[FCM] Failed to register:', err?.response?.data || err.message);
  }
}
