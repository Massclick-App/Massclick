import express from "express";
import {
  chatUnreadCountAction,
  listChatConversationsAction,
  listChatMessagesAction,
  markChatReadAction,
  sendChatMessageAction,
  startChatConversationAction,
  updateChatStatusAction,
} from "../controller/chat/chatController.js";
import {
  chatAuthentication,
  requireChatAdmin,
  requireChatCustomer,
} from "../helper/chatAuthHelper.js";
import { chatRateLimit } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.use("/api/chat", chatRateLimit);

router.post(
  "/api/chat/conversations/start",
  chatAuthentication,
  requireChatCustomer,
  startChatConversationAction
);

router.get(
  "/api/chat/conversations",
  chatAuthentication,
  requireChatAdmin,
  listChatConversationsAction
);

router.get(
  "/api/chat/unread-count",
  chatAuthentication,
  requireChatAdmin,
  chatUnreadCountAction
);

router.get(
  "/api/chat/conversations/:id/messages",
  chatAuthentication,
  listChatMessagesAction
);

router.post(
  "/api/chat/conversations/:id/messages",
  chatAuthentication,
  sendChatMessageAction
);

router.patch(
  "/api/chat/conversations/:id/read",
  chatAuthentication,
  markChatReadAction
);

router.patch(
  "/api/chat/conversations/:id/status",
  chatAuthentication,
  requireChatAdmin,
  updateChatStatusAction
);

export default router;
