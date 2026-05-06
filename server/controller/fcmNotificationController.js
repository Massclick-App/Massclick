import admin from "../helper/firebaseInit.js";
import webpush from "web-push";

const VAPID_PUBLIC_KEY = 'BGQ0OCJil87bcnelmazt2Kh5HPivTIEsYuWSN1-9IxGYIjwqbjLVbn_9bnOfiG-Iv7y_ituUYV3v7QrydEyl2UE';
const VAPID_PRIVATE_KEY = 'Jn4dwbWtoXCCm5ux-4_NUvdlmX8WDBiP5L13FYumzAs';
webpush.setVapidDetails('mailto:admin@massclick.in', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function dispatchToken(token, title, body, data = {}) {
  if (typeof token === 'string' && token.startsWith('{')) {
    const sub = JSON.parse(token);
    if (!sub.endpoint || !sub.auth || !sub.p256dh) throw new Error('Invalid web push subscription');
    const payload = JSON.stringify({ notification: { title, body, icon: '/mi.png', data } });
    return webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
      payload
    );
  }
  return admin.messaging().send({ token, notification: { title, body }, data: data || {} });
}

export const sendSingleNotificationAction = async (req, res) => {
  try {
    const { token, title, body, data } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({ success: false, message: "FCM token, title, and body are required." });
    }

    const response = await dispatchToken(token, title, body, data);
    return res.status(200).json({ success: true, message: "Notification sent successfully", response });
  } catch (error) {
    console.error("Error sending single notification:", error);
    return res.status(500).json({ success: false, message: "Failed to send notification", error: error.message });
  }
};

export const sendBulkNotificationAction = async (req, res) => {
  try {
    const { tokens, title, body, data } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0 || !title || !body) {
      return res.status(400).json({ success: false, message: "An array of tokens, title, and body are required." });
    }

    const webTokens = tokens.filter(t => typeof t === 'string' && t.startsWith('{'));
    const fcmTokens = tokens.filter(t => typeof t === 'string' && !t.startsWith('{'));

    let successCount = 0;
    let failureCount = 0;

    if (fcmTokens.length > 0) {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: fcmTokens,
        notification: { title, body },
        data: data || {},
      });
      successCount += response.successCount;
      failureCount += response.failureCount;
    }

    const webPayload = JSON.stringify({ notification: { title, body, icon: '/mi.png', data: data || {} } });
    for (const tokenStr of webTokens) {
      try {
        const sub = JSON.parse(tokenStr);
        if (sub.endpoint && sub.auth && sub.p256dh) {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
            webPayload
          );
          successCount++;
        }
      } catch (err) {
        console.error('[FCM] Web push send error:', err.message);
        failureCount++;
      }
    }

    return res.status(200).json({ success: true, message: "Bulk notification processing complete", successCount, failureCount });
  } catch (error) {
    console.error("Error sending bulk notification:", error);
    return res.status(500).json({ success: false, message: "Failed to send bulk notification", error: error.message });
  }
};
