import { createSupportTicket, getSupportTicket, listSupportTickets, replySupportTicket, updateSupportTicketStatus } from "../../helper/supportTicketHelper.js";

const handle = (res, error) => {
  const message = error.message || "Something went wrong";
  if (message === "FORBIDDEN") return res.status(403).send({ error: message });
  if (message.includes("NOT_FOUND")) return res.status(404).send({ error: message });
  if (message.includes("REQUIRED") || message.includes("INVALID") || message.includes("TOO_LONG")) return res.status(400).send({ error: message });
  console.error("[SupportTicket]", error);
  return res.status(500).send({ error: "Unable to process ticket" });
};

export const createTicketAction = async (req, res) => { try { res.status(201).send({ ticket: await createSupportTicket({ user: req.chatUser, ...req.body }) }); } catch (error) { handle(res, error); } };
export const listTicketsAction = async (req, res) => { try { res.send(await listSupportTickets({ user: req.chatUser, ...req.query })); } catch (error) { handle(res, error); } };
export const getTicketAction = async (req, res) => { try { res.send({ ticket: await getSupportTicket({ user: req.chatUser, id: req.params.id }) }); } catch (error) { handle(res, error); } };
export const replyTicketAction = async (req, res) => { try { res.send({ ticket: await replySupportTicket({ user: req.chatUser, id: req.params.id, message: req.body.message }) }); } catch (error) { handle(res, error); } };
export const updateTicketStatusAction = async (req, res) => { try { res.send({ ticket: await updateSupportTicketStatus({ user: req.chatUser, id: req.params.id, status: req.body.status }) }); } catch (error) { handle(res, error); } };
