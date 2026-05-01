import { Server } from "socket.io";
import { setIO } from "./ioInstance.js";
import { wsAuthMiddleware } from "./wsAuthMiddleware.js";
import { registerEventRouter } from "./eventRouter.js";

export const initWsServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
    // Keep alive: ping every 25s, disconnect if no pong within 20s
    pingInterval: 25000,
    pingTimeout: 20000,
    // Support both WebSocket upgrade and long-polling fallback
    transports: ["websocket", "polling"],
  });

  setIO(io);
  io.use(wsAuthMiddleware);
  io.on("connection", registerEventRouter);

  console.log("[WS] WebSocket server ready");
  return io;
};
