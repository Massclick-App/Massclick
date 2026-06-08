import { registerCoreHandlers } from "./events/coreHandlers.js";
import { registerChatHandlers } from "./events/chatHandlers.js";

export const registerEventRouter = (socket) => {
  registerCoreHandlers(socket);
  registerChatHandlers(socket);
};
