import mongoose from "mongoose";
import supportTicketModel from "../model/support/supportTicketModel.js";

const CATEGORIES = new Set(["account", "business", "leads", "verification", "billing", "technical", "other"]);
const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const STATUSES = new Set(["open", "in_progress", "resolved", "closed"]);

const clean = (value, max, code) => {
  const result = String(value || "").trim();
  if (!result) throw new Error(`${code}_REQUIRED`);
  if (result.length > max) throw new Error(`${code}_TOO_LONG`);
  return result;
};

const serialize = (doc) => {
  const value = doc?.toObject ? doc.toObject() : doc;
  if (!value) return value;
  return { ...value, id: String(value._id), replies: (value.replies || []).map((reply) => ({ ...reply, id: String(reply._id) })) };
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

export const createSupportTicket = async ({ user, subject, category, priority, message }) => {
  const safeCategory = CATEGORIES.has(category) ? category : "other";
  const safePriority = PRIORITIES.has(priority) ? priority : "normal";
  const initialText = clean(message, 4000, "MESSAGE");
  const ticket = await supportTicketModel.create({
    ticketNumber: ticketNumber(), customerUserId: user.userId,
    customerName: user.userName || "Customer", customerMobile: user.mobileNumber1 || user.mobile || "",
    subject: clean(subject, 160, "SUBJECT"), category: safeCategory, priority: safePriority,
    replies: [{ senderType: "customer", senderId: user.userId, senderName: user.userName || "Customer", text: initialText }],
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

export const replySupportTicket = async ({ user, id, message }) => {
  const ticket = await getOwnedTicket(id, user);
  const senderType = user.authType === "admin" ? "admin" : "customer";
  ticket.replies.push({ senderType, senderId: user.userId, senderName: user.userName || (senderType === "admin" ? "Support" : "Customer"), text: clean(message, 4000, "MESSAGE") });
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
