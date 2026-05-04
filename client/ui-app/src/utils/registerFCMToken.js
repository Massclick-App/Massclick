import axios from 'axios';
import { requestFCMToken } from '../firebase';

const API_URL = process.env.REACT_APP_API_URL;

export async function registerWebFCMToken(userId, authToken) {
  try {
    const token = await requestFCMToken();
    if (!token) return;

    await axios.post(
      `${API_URL}/api/fcm-token/save`,
      {
        userId,
        token,
        platform: 'web',
        deviceName: navigator.userAgent.slice(0, 100),
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
  } catch {
    // non-critical — fail silently
  }
}
