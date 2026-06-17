import { createHttpAuthMiddleware } from "../auth/authMiddleware.js";
import {
  actorToLegacyChatUser,
  resolveAuthActorFromToken,
} from "../auth/authResolver.js";

export const authenticateChatToken = async (token) => {
  const actor = await resolveAuthActorFromToken(token, { source: "chat-token" });
  return actorToLegacyChatUser(actor);
};

export const chatAuthentication = createHttpAuthMiddleware({
  allowedActorTypes: ["admin", "customer"],
  source: "chat-http",
  policyKey: "chat.customer",
  attachChatUser: true,
});

export const requireChatAdmin = (req, res, next) => {
  if (req.chatUser?.authType !== "admin") {
    return res.status(403).send({ error: "ADMIN_REQUIRED" });
  }
  next();
};

export const requireChatCustomer = (req, res, next) => {
  if (req.chatUser?.authType !== "customer") {
    return res.status(403).send({ error: "CUSTOMER_REQUIRED" });
  }
  next();
};
