import admin from "../helper/firebaseInit.js";

export const sendSingleNotificationAction = async (req, res) => {
  try {
    const { token, title, body, data } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "FCM token, title, and body are required.",
      });
    }

    const message = {
      token: token,
      notification: { title, body },
      data: data || {},
    };

    const response = await admin.messaging().send(message);
    
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
      return res.status(400).json({
        success: false,
        message: "An array of tokens, title, and body are required.",
      });
    }

    const message = {
      tokens: tokens,
      notification: { title, body },
      data: data || {},
    };

    // sendEachForMulticast is recommended over sendMulticast in recent firebase-admin versions
    const response = await admin.messaging().sendEachForMulticast(message);
    
    return res.status(200).json({ success: true, message: "Bulk notification processing complete", successCount: response.successCount, failureCount: response.failureCount, response });
  } catch (error) {
    console.error("Error sending bulk notification:", error);
    return res.status(500).json({ success: false, message: "Failed to send bulk notification", error: error.message });
  }
};