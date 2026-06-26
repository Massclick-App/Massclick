import axios from "axios";
import { getCustomerToken, updateAuthDebug } from "../auth/authStore.js";

const API_URL = process.env.REACT_APP_API_URL;

export async function registerWebFCMToken() {
  const authToken = getCustomerToken();
  console.log("[FCM] registerWebFCMToken called - hasToken:", !!authToken);

  try {
    const { requestPushSubscription } = await import("../firebase");
    const subscription = await requestPushSubscription();
    if (!subscription) {
      console.warn("[FCM] No push subscription - permission denied or browser not supported");
      updateAuthDebug({
        fcm: {
          state: "permission-denied",
          lastError: "No subscription returned",
        },
      });
      return;
    }

    const res = await axios.post(
      `${API_URL}/fcm-token/web-register`,
      subscription,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log("[FCM] Token registered successfully:", res.data);
    updateAuthDebug({ fcm: { state: "registered", lastError: null } });
  } catch (error) {
    console.error("[FCM] Failed to register:", error?.response?.data || error.message);
    updateAuthDebug({
      fcm: {
        state: "failed",
        lastError:
          error?.response?.data?.message ||
          error?.message ||
          "FCM registration failed",
      },
    });
  }
}
