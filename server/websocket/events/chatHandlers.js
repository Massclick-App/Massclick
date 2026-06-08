import { WS_EVENTS, buildRoom } from "../constants.js";
import {
  getConversationForUser,
  markConversationRead,
  sendChatMessage,
} from "../../helper/chatHelper.js";

const emitSocketError = (socket, error) => {
  socket.emit(WS_EVENTS.WS_ERROR, { event: "chat", error: error.message });
};

export const registerChatHandlers = (socket) => {
  socket.on(WS_EVENTS.CHAT_JOIN, async ({ conversationId } = {}) => {
    try {
      if (!conversationId) throw new Error("CONVERSATION_REQUIRED");
      await getConversationForUser(conversationId, socket.data.user);
      socket.join(buildRoom.chat(conversationId));
      socket.emit(WS_EVENTS.ROOM_JOINED, { room: buildRoom.chat(conversationId) });
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on(WS_EVENTS.CHAT_LEAVE, ({ conversationId } = {}) => {
    if (!conversationId) return;
    socket.leave(buildRoom.chat(conversationId));
  });

  socket.on(WS_EVENTS.CHAT_SEND, async ({ conversationId, text } = {}, ack) => {
    try {
      const result = await sendChatMessage({
        conversationId,
        text,
        user: socket.data.user,
      });
      if (typeof ack === "function") ack({ ok: true, ...result });
    } catch (error) {
      emitSocketError(socket, error);
      if (typeof ack === "function") ack({ ok: false, error: error.message });
    }
  });

  socket.on(WS_EVENTS.CHAT_READ, async ({ conversationId } = {}) => {
    try {
      if (!conversationId) throw new Error("CONVERSATION_REQUIRED");
      await markConversationRead({
        conversationId,
        user: socket.data.user,
      });
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on(WS_EVENTS.CHAT_TYPING, async ({ conversationId, typing } = {}) => {
    try {
      if (!conversationId) throw new Error("CONVERSATION_REQUIRED");
      await getConversationForUser(conversationId, socket.data.user);
      socket.to(buildRoom.chat(conversationId)).emit(WS_EVENTS.CHAT_TYPING, {
        conversationId,
        typing: Boolean(typing),
        senderType: socket.data.user.authType === "admin" ? "admin" : "customer",
        senderName: socket.data.user.userName,
      });
    } catch (error) {
      emitSocketError(socket, error);
    }
  });
};
