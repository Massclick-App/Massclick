import {
  listChatConversations,
  listChatMessages,
  markConversationRead,
  sendChatMessage,
  startCustomerConversation,
  updateConversationStatus,
  getAdminUnreadCount,
} from "../../helper/chatHelper.js";

const handleError = (res, error) => {
  const message = error.message || "Something went wrong";
  if (message === "FORBIDDEN") return res.status(403).send({ error: message });
  if (message.includes("NOT_FOUND")) return res.status(404).send({ error: message });
  if (message.includes("REQUIRED") || message.includes("INVALID") || message.includes("TOO_LONG")) {
    return res.status(400).send({ error: message });
  }
  console.error("[Chat]", error);
  return res.status(500).send({ error: message });
};

export const startChatConversationAction = async (req, res) => {
  try {
    const conversation = await startCustomerConversation(req.chatUser);
    res.send({ conversation });
  } catch (error) {
    handleError(res, error);
  }
};

export const listChatConversationsAction = async (req, res) => {
  try {
    const result = await listChatConversations(req.query);
    res.send(result);
  } catch (error) {
    handleError(res, error);
  }
};

export const listChatMessagesAction = async (req, res) => {
  try {
    const result = await listChatMessages({
      conversationId: req.params.id,
      user: req.chatUser,
      ...req.query,
    });
    res.send(result);
  } catch (error) {
    handleError(res, error);
  }
};

export const sendChatMessageAction = async (req, res) => {
  try {
    const result = await sendChatMessage({
      conversationId: req.params.id,
      user: req.chatUser,
      text: req.body.text,
    });
    res.send(result);
  } catch (error) {
    handleError(res, error);
  }
};

export const markChatReadAction = async (req, res) => {
  try {
    const result = await markConversationRead({
      conversationId: req.params.id,
      user: req.chatUser,
    });
    res.send(result);
  } catch (error) {
    handleError(res, error);
  }
};

export const updateChatStatusAction = async (req, res) => {
  try {
    const conversation = await updateConversationStatus({
      conversationId: req.params.id,
      status: req.body.status,
      user: req.chatUser,
    });
    res.send({ conversation });
  } catch (error) {
    handleError(res, error);
  }
};

export const chatUnreadCountAction = async (req, res) => {
  try {
    const admin = await getAdminUnreadCount();
    res.send({ admin });
  } catch (error) {
    handleError(res, error);
  }
};
