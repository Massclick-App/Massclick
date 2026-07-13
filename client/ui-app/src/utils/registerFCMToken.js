import axios from "axios";
import { getCustomerToken, updateAuthDebug } from "../auth/authStore.js";

const API_URL = process.env.REACT_APP_API_URL;

export async function registerWebFCMToken() {
  const authToken = getCustomerToken();
  try {
    const { requestPushSubscription } = await import("../firebase");
    const subscription = await requestPushSubscription();
    if (!subscription) {
      updateAuthDebug({
        fcm: {
          state: "permission-denied",
          lastError: "No subscription returned",
        },
      });
      return;
    }

    await axios.post(
      `${API_URL}/fcm-token/web-register`,
      subscription,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    updateAuthDebug({ fcm: { state: "registered", lastError: null } });
  } catch (error) {
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
