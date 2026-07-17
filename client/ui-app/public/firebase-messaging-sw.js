importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAq5epDWb5sBRDg8bfA_HLSF__3J1kW0xc",
  authDomain: "massclick-dc8f6.firebaseapp.com",
  projectId: "massclick-dc8f6",
  storageBucket: "massclick-dc8f6.firebasestorage.app",
  messagingSenderId: "826490972673",
  appId: "1:826490972673:web:ae6569eec4139c33922e00",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, image } = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(title || 'MassClick', {
    body: body || '',
    icon: '/apple-touch-icon.png',
    image: image || data.imageUrl || undefined,
    data: { clickAction: data.clickAction || '/' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.clickAction || '/';
  event.waitUntil(clients.openWindow(url));
});
