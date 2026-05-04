import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAq5epDWb5sBRDg8bfA_HLSF__3J1kW0xc",
  authDomain: "massclick-dc8f6.firebaseapp.com",
  projectId: "massclick-dc8f6",
  storageBucket: "massclick-dc8f6.firebasestorage.app",
  messagingSenderId: "826490972673",
  appId: "1:826490972673:web:ae6569eec4139c33922e00",
};

const VAPID_KEY = 'BFbI_Nnr4GrI8UwG_xxRLPc-vgrDsWeult6xk6XW2V-yc1jmDs6p1P5nBJ_PzQBLhTKSRTv4ThgvIDLU9fwEdek';

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export async function requestFCMToken() {
  if (!('Notification' in window)) {
    console.warn('[FCM] Notifications not supported in this browser');
    return null;
  }

  const permission = await Notification.requestPermission();
  console.log('[FCM] Notification permission:', permission);
  if (permission !== 'granted') return null;

  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    console.log('[FCM] Token retrieved:', token ? token.slice(0, 20) + '...' : 'null');
    return token || null;
  } catch (err) {
    console.error('[FCM] getToken failed:', err);
    return null;
  }
}

export { onMessage };
