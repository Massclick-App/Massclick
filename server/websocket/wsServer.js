import { Server } from "socket.io";
import { setIO } from "./ioInstance.js";
import { wsAuthMiddleware } from "./wsAuthMiddleware.js";
import { registerEventRouter } from "./eventRouter.js";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const tryConnectRedisAdapter = async (io) => {
  try {
    const { createClient } = await import("redis");
    const { createAdapter } = await import("@socket.io/redis-adapter");

    const pubClient = createClient({ url: REDIS_URL });
    const subClient = pubClient.duplicate();

    pubClient.on("error", (err) => console.error("[Redis pub]", err.message));
    subClient.on("error", (err) => console.error("[Redis sub]", err.message));

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));
    console.log("[WS] Redis adapter connected:", REDIS_URL);
  } catch (err) {
    console.warn("[WS] Redis unavailable — using in-memory adapter (single-instance only):", err.message);
  }
};

export const initWsServer = async (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
    pingInterval: 25000,
    pingTimeout: 20000,
    transports: ["websocket", "polling"],
  });

  await tryConnectRedisAdapter(io);

  setIO(io);
  io.use(wsAuthMiddleware);
  io.on("connection", registerEventRouter);

  console.log("[WS] WebSocket server ready");
  return io;
};
