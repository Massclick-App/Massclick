import { initializeApp } from 'firebase/app';
import { getMessaging, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAq5epDWb5sBRDg8bfA_HLSF__3J1kW0xc",
  authDomain: "massclick-dc8f6.firebaseapp.com",
  projectId: "massclick-dc8f6",
  storageBucket: "massclick-dc8f6.firebasestorage.app",
  messagingSenderId: "826490972673",
  appId: "1:826490972673:web:ae6569eec4139c33922e00",
};

const VAPID_KEY = 'BGQ0OCJil87bcnelmazt2Kh5HPivTIEsYuWSN1-9IxGYIjwqbjLVbn_9bnOfiG-Iv7y_ituUYV3v7QrydEyl2UE';

const app = initializeApp(firebaseConfig);
let messaging = null;

try {
  messaging = getMessaging(app);
} catch (error) {
  console.warn('[FCM] Messaging unavailable in this browser:', error?.message || error);
}

export { messaging };

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestPushSubscription() {
  if (!messaging) {
    console.warn('[FCM] Messaging is not available in this browser');
    return null;
  }

  if (!('Notification' in window) || !('PushManager' in window)) {
    console.warn('[FCM] Push notifications not supported in this browser');
    return null;
  }

  const permission = await Notification.requestPermission();
  console.log('[FCM] Notification permission:', permission);
  if (permission !== 'granted') return null;

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    console.log('[FCM] Service worker ready');

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
    });

    const subJson = subscription.toJSON();
    console.log('[FCM] Push subscription created');
    return {
      endpoint: subJson.endpoint,
      auth: subJson.keys.auth,
      p256dh: subJson.keys.p256dh,
    };
  } catch (err) {
    console.error('[FCM] Push subscription failed:', err);
    return null;
  }
}

export { onMessage };
