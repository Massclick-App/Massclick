import mongoose from "mongoose";
import chatConversationModel from "../model/chat/chatConversationModel.js";
import chatMessageModel from "../model/chat/chatMessageModel.js";
import { emitToRoom } from "../websocket/roomManager.js";
import { WS_EVENTS, buildRoom } from "../websocket/constants.js";
import { uploadImageToS3, getSignedUrlByKey } from "../s3Uploder.js";
import { s3Path } from "../utils/s3ObjectKeys.js";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_ATTACHMENT_SIZE = 8 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const toObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("INVALID_ID");
  return new mongoose.Types.ObjectId(id);
};

const normalizeMessageText = (text) => {
  const value = String(text || "").trim();
  if (!value) throw new Error("MESSAGE_REQUIRED");
  if (value.length > MAX_MESSAGE_LENGTH) throw new Error("MESSAGE_TOO_LONG");
  return value;
};

const serializeDoc = (doc) => {
  if (!doc) return doc;
  const value = doc.toObject ? doc.toObject() : doc;
  return {
    ...value,
    id: String(value._id),
  };
};

export const serializeConversation = serializeDoc;
export const serializeMessage = (doc) => {
  const value = serializeDoc(doc);
  if (!value?.attachment?.key) return value;
  return {
    ...value,
    attachment: {
      ...value.attachment,
      url: getSignedUrlByKey(value.attachment.key),
    },
  };
};

export const getAdminUnreadCount = () =>
  chatConversationModel.countDocuments({ unreadForAdmin: { $gt: 0 } });

export const emitChatUnreadCount = async () => {
  const count = await getAdminUnreadCount();
  emitToRoom(buildRoom.adminChat(), WS_EVENTS.CHAT_UNREAD_COUNT, { admin: count });
  return count;
};

export const startCustomerConversation = async (customer) => {
  let conversation = await chatConversationModel.findOne({
    customerUserId: customer.userId,
    status: "open",
  });

  if (!conversation) {
    conversation = await chatConversationModel.create({
      customerUserId: customer.userId,
      customerName: customer.userName || "Customer",
      customerMobile: customer.mobileNumber1 || customer.mobile || "",
      status: "open",
      lastMessageAt: new Date(),
    });
  } else {
    conversation.customerName = customer.userName || conversation.customerName;
    conversation.customerMobile = customer.mobileNumber1 || customer.mobile || conversation.customerMobile;
    await conversation.save();
  }

  return serializeConversation(conversation);
};

export const listChatConversations = async ({
  status = "open",
  search = "",
  pageNo = 1,
  pageSize = 20,
} = {}) => {
  const query = {};
  if (["open", "closed"].includes(status)) query.status = status;
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { customerName: regex },
      { customerMobile: regex },
      { lastMessageText: regex },
    ];
  }

  const safePage = Math.max(parseInt(pageNo, 10) || 1, 1);
  const safeSize = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
  const skip = (safePage - 1) * safeSize;

  const [list, total] = await Promise.all([
    chatConversationModel.find(query)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(safeSize)
      .lean(),
    chatConversationModel.countDocuments(query),
  ]);

  return {
    data: list.map(serializeConversation),
    total,
    pageNo: safePage,
    pageSize: safeSize,
  };
};

export const getConversationForUser = async (conversationId, user) => {
  const conversation = await chatConversationModel.findById(toObjectId(conversationId)).lean();
  if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");

  if (!["admin", "customer"].includes(user.authType)) {
    throw new Error("FORBIDDEN");
  }

  if (
    user.authType === "customer" &&
    String(conversation.customerUserId) !== String(user.userId)
  ) {
    throw new Error("FORBIDDEN");
  }

  return serializeConversation(conversation);
};

export const listChatMessages = async ({
  conversationId,
  user,
  pageNo = 1,
  pageSize = 50,
}) => {
  await getConversationForUser(conversationId, user);
  const safePage = Math.max(parseInt(pageNo, 10) || 1, 1);
  const safeSize = Math.min(Math.max(parseInt(pageSize, 10) || 50, 1), 100);
  const skip = (safePage - 1) * safeSize;

  const [rows, total] = await Promise.all([
    chatMessageModel.find({ conversationId: toObjectId(conversationId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeSize)
      .lean(),
    chatMessageModel.countDocuments({ conversationId: toObjectId(conversationId) }),
  ]);

  return {
    data: rows.reverse().map(serializeMessage),
    total,
    pageNo: safePage,
    pageSize: safeSize,
  };
};

export const sendChatMessage = async ({ conversationId, user, text, attachment }) => {
  const conversation = await getConversationForUser(conversationId, user);
  const hasAttachment = Boolean(attachment?.dataUrl);
  const cleanText = hasAttachment && !String(text || "").trim() ? "" : normalizeMessageText(text);
  const senderType = user.authType === "admin" ? "admin" : "customer";

  let uploadedAttachment;
  const messageId = new mongoose.Types.ObjectId();
  if (hasAttachment) {
    const mimeType = String(attachment.mimeType || "").toLowerCase();
    const fileName = String(attachment.fileName || "attachment").replace(/[\r\n]/g, " ").slice(0, 180);
    const dataMatch = String(attachment.dataUrl).match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (!dataMatch || dataMatch[1].toLowerCase() !== mimeType) throw new Error("INVALID_ATTACHMENT_DATA");
    const padding = (dataMatch[2].match(/=*$/)?.[0].length || 0);
    const decodedSize = Math.floor((dataMatch[2].length * 3) / 4) - padding;
    const fileSize = Number(attachment.fileSize) || decodedSize;
    if (!ALLOWED_ATTACHMENT_TYPES.has(mimeType)) throw new Error("INVALID_ATTACHMENT_TYPE");
    if (!decodedSize || decodedSize > MAX_ATTACHMENT_SIZE || Math.abs(fileSize - decodedSize) > 2) throw new Error("INVALID_ATTACHMENT_SIZE");
    const upload = await uploadImageToS3(
      attachment.dataUrl,
      s3Path({ entity: "chat-messages", entityId: messageId, purpose: "attachment" }),
      { skipImageConversion: !mimeType.startsWith("image/") },
    );
    uploadedAttachment = { key: upload.key, fileName, mimeType, fileSize };
  }

  const message = await chatMessageModel.create({
    _id: messageId,
    conversationId: conversation.id,
    senderType,
    senderId: user.userId,
    senderName: user.userName || (senderType === "admin" ? "Admin" : "Customer"),
    text: cleanText,
    ...(uploadedAttachment ? { attachment: uploadedAttachment } : {}),
    ...(senderType === "admin"
      ? { readByAdminAt: new Date() }
      : { readByCustomerAt: new Date() }),
  });

  const update = {
    $set: {
      status: "open",
      closedAt: null,
      closedBy: null,
      lastMessageText: cleanText || `Attachment: ${uploadedAttachment?.fileName || "file"}`,
      lastMessageAt: message.createdAt,
      lastMessageSenderType: senderType,
    },
    $inc: senderType === "admin"
      ? { unreadForCustomer: 1 }
      : { unreadForAdmin: 1 },
  };

  const updatedConversation = await chatConversationModel.findByIdAndUpdate(
    conversation.id,
    update,
    { new: true }
  ).lean();

  const payload = {
    conversation: serializeConversation(updatedConversation),
    message: serializeMessage(message),
  };

  emitToRoom(buildRoom.chat(conversation.id), WS_EVENTS.CHAT_MESSAGE_NEW, payload);
  emitToRoom(buildRoom.adminChat(), WS_EVENTS.CHAT_CONVERSATION_UPDATED, payload.conversation);
  emitToRoom(buildRoom.user(conversation.customerUserId), WS_EVENTS.CHAT_CONVERSATION_UPDATED, payload.conversation);
  await emitChatUnreadCount();

  return payload;
};

export const markConversationRead = async ({ conversationId, user }) => {
  const conversation = await getConversationForUser(conversationId, user);
  const now = new Date();
  const isAdmin = user.authType === "admin";

  await chatMessageModel.updateMany(
    {
      conversationId: toObjectId(conversation.id),
      senderType: isAdmin ? "customer" : "admin",
    },
    { $set: isAdmin ? { readByAdminAt: now } : { readByCustomerAt: now } }
  );

  const updateObj = isAdmin ? { unreadForAdmin: 0 } : { unreadForCustomer: 0 };
  const updatedConversation = await chatConversationModel.findByIdAndUpdate(
    conversation.id,
    { $set: updateObj },
    { new: true }
  ).lean();

  const payload = {
    conversationId: conversation.id,
    readerType: isAdmin ? "admin" : "customer",
    readAt: now.toISOString(),
    conversation: serializeConversation(updatedConversation),
  };

  emitToRoom(buildRoom.chat(conversation.id), WS_EVENTS.CHAT_READ, payload);
  emitToRoom(buildRoom.adminChat(), WS_EVENTS.CHAT_CONVERSATION_UPDATED, payload.conversation);
  emitToRoom(buildRoom.user(conversation.customerUserId), WS_EVENTS.CHAT_CONVERSATION_UPDATED, payload.conversation);
  await emitChatUnreadCount();

  return payload;
};

export const updateConversationStatus = async ({ conversationId, status, user }) => {
  if (!["open", "closed"].includes(status)) throw new Error("INVALID_STATUS");

  const conversation = await getConversationForUser(conversationId, user);
  const updatedConversation = await chatConversationModel.findByIdAndUpdate(
    conversation.id,
    {
      status,
      unreadForAdmin: status === "closed" ? 0 : undefined,
      unreadForCustomer: status === "closed" ? 0 : undefined,
      closedAt: status === "closed" ? new Date() : null,
      closedBy: status === "closed" ? user.userId : null,
    },
    { new: true }
  ).lean();

  const payload = serializeConversation(updatedConversation);
  emitToRoom(buildRoom.chat(conversation.id), WS_EVENTS.CHAT_CONVERSATION_UPDATED, payload);
  emitToRoom(buildRoom.adminChat(), WS_EVENTS.CHAT_CONVERSATION_UPDATED, payload);
  emitToRoom(buildRoom.user(conversation.customerUserId), WS_EVENTS.CHAT_CONVERSATION_UPDATED, payload);

  if (status === "closed") {
    await emitChatUnreadCount();
  }

  return payload;
};
