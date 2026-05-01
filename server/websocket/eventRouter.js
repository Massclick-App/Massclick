import { registerCoreHandlers } from "./events/coreHandlers.js";

export const registerEventRouter = (socket) => {
  registerCoreHandlers(socket);
  // Extend: registerLeadHandlers(socket), registerChatHandlers(socket), etc.
};
