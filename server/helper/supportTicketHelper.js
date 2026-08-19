import mongoose from "mongoose";
import supportTicketModel from "../model/support/supportTicketModel.js";
import { getSignedUrlByKey, uploadImageToS3 } from "../s3Uploder.js";
import { s3Path } from "../utils/s3ObjectKeys.js";

const CATEGORIES = new Set(["account", "business", "leads", "verification", "billing", "technical", "other"]);
const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const STATUSES = new Set(["open", "in_progress", "resolved", "closed"]);
const MAX_FILES = 3;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/webm", "video/quicktime",
  "application/pdf", "text/plain", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip", "application/x-zip-compressed",
]);

const clean = (value, max, code) => {
  const result = String(value || "").trim();
  if (!result) throw new Error(`${code}_REQUIRED`);
  if (result.length > max) throw new Error(`${code}_TOO_LONG`);
  return result;
};

const serialize = (doc) => {
  const value = doc?.toObject ? doc.toObject() : doc;
  if (!value) return value;
  return { ...value, id: String(value._id), replies: (value.replies || []).map((reply) => ({ ...reply, id: String(reply._id), attachments: (reply.attachments || []).map((file) => ({ ...file, url: getSignedUrlByKey(file.key) })) })) };
};

const uploadAttachments = async (files = [], ticketId) => {
  if (!Array.isArray(files) || !files.length) return [];
  if (files.length > MAX_FILES) throw new Error("INVALID_ATTACHMENT_COUNT");
  let total = 0;
  const checked = files.map((file) => {
    const mimeType = String(file?.mimeType || "").toLowerCase();
    const match = String(file?.dataUrl || "").match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (!match || match[1].toLowerCase() !== mimeType || !ALLOWED_FILE_TYPES.has(mimeType)) throw new Error("INVALID_ATTACHMENT_TYPE");
    const padding = match[2].match(/=*$/)?.[0].length || 0;
    const size = Math.floor((match[2].length * 3) / 4) - padding;
    if (!size || size > MAX_FILE_SIZE) throw new Error("INVALID_ATTACHMENT_SIZE");
    total += size;
    return { dataUrl: file.dataUrl, mimeType, fileName: String(file.fileName || "attachment").replace(/[\r\n]/g, " ").slice(0, 180), fileSize: size };
  });
  if (total > MAX_TOTAL_SIZE) throw new Error("INVALID_ATTACHMENT_TOTAL_SIZE");
  return Promise.all(checked.map(async (file) => {
    const upload = await uploadImageToS3(file.dataUrl, s3Path({ entity: "support-tickets", entityId: ticketId, purpose: "attachment" }), { skipImageConversion: !file.mimeType.startsWith("image/") });
    return { key: upload.key, fileName: file.fileName, mimeType: file.mimeType, fileSize: file.fileSize };
  }));
};

const ticketNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MC-${date}-${suffix}`;
};

const getOwnedTicket = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("INVALID_ID");
  const ticket = await supportTicketModel.findById(id);
  if (!ticket) throw new Error("TICKET_NOT_FOUND");
  if (user.authType === "customer" && String(ticket.customerUserId) !== String(user.userId)) throw new Error("FORBIDDEN");
  return ticket;
};

export const createSupportTicket = async ({ user, subject, category, priority, message, attachments }) => {
  const safeCategory = CATEGORIES.has(category) ? category : "other";
  const safePriority = PRIORITIES.has(priority) ? priority : "normal";
  const initialText = clean(message, 4000, "MESSAGE");
  const ticketId = new mongoose.Types.ObjectId();
  const uploaded = await uploadAttachments(attachments, ticketId);
  const ticket = await supportTicketModel.create({
    _id: ticketId,
    ticketNumber: ticketNumber(), customerUserId: user.userId,
    customerName: user.userName || "Customer", customerMobile: user.mobileNumber1 || user.mobile || "",
    subject: clean(subject, 160, "SUBJECT"), category: safeCategory, priority: safePriority,
    replies: [{ senderType: "customer", senderId: user.userId, senderName: user.userName || "Customer", text: initialText, attachments: uploaded }],
  });
  return serialize(ticket);
};

export const listSupportTickets = async ({ user, status = "all", pageNo = 1, pageSize = 30 }) => {
  const query = user.authType === "customer" ? { customerUserId: user.userId } : {};
  if (STATUSES.has(status)) query.status = status;
  const page = Math.max(Number.parseInt(pageNo, 10) || 1, 1);
  const size = Math.min(Math.max(Number.parseInt(pageSize, 10) || 30, 1), 100);
  const [rows, total] = await Promise.all([
    supportTicketModel.find(query).sort({ lastReplyAt: -1 }).skip((page - 1) * size).limit(size).lean(),
    supportTicketModel.countDocuments(query),
  ]);
  return { data: rows.map(serialize), total, pageNo: page, pageSize: size };
};

export const getSupportTicket = async ({ user, id }) => serialize(await getOwnedTicket(id, user));

export const replySupportTicket = async ({ user, id, message, attachments }) => {
  const ticket = await getOwnedTicket(id, user);
  const senderType = user.authType === "admin" ? "admin" : "customer";
  const uploaded = await uploadAttachments(attachments, ticket._id);
  ticket.replies.push({ senderType, senderId: user.userId, senderName: user.userName || (senderType === "admin" ? "Support" : "Customer"), text: clean(message, 4000, "MESSAGE"), attachments: uploaded });
  ticket.lastReplyAt = new Date();
  if (ticket.status === "resolved" || ticket.status === "closed") ticket.status = "open";
  await ticket.save();
  return serialize(ticket);
};

export const updateSupportTicketStatus = async ({ user, id, status }) => {
  const ticket = await getOwnedTicket(id, user);
  if (!STATUSES.has(status)) throw new Error("INVALID_STATUS");
  if (user.authType === "customer" && !["open", "closed"].includes(status)) throw new Error("FORBIDDEN");
  ticket.status = status;
  ticket.resolvedAt = status === "resolved" ? new Date() : null;
  ticket.closedAt = status === "closed" ? new Date() : null;
  await ticket.save();
  return serialize(ticket);
};
