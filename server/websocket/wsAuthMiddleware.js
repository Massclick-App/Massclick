import { logAuthAuditEvent } from "../auth/authAuditStore.js";
import {
  actorToLegacyChatUser,
  resolveAuthActorFromToken,
} from "../auth/authResolver.js";

export const wsAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const actor = await resolveAuthActorFromToken(token, { source: "websocket" });

    if (!["admin", "customer"].includes(actor.actorType)) {
      throw new Error("FORBIDDEN");
    }

    socket.data.authActor = actor;
    socket.data.user = actorToLegacyChatUser(actor);
    next();
  } catch (err) {
    console.error("[WS Auth]", err.message);
    logAuthAuditEvent({
      eventType: "websocket_handshake_failure",
      source: "websocket",
      socket,
      statusCode: 401,
      message: err.message || "AUTH_ERROR",
    });
    next(new Error(err.message || "AUTH_ERROR"));
  }
};
