import { authenticateChatToken } from "../helper/chatAuthHelper.js";

export const wsAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    socket.data.user = await authenticateChatToken(token);
    next();
  } catch (err) {
    console.error("[WS Auth]", err.message);
    next(new Error(err.message || "AUTH_ERROR"));
  }
};
