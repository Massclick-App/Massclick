import { WS_EVENTS, buildRoom } from "../constants.js";
import {
  addConnection,
  removeConnection,
  addRoomToConnection,
  removeRoomFromConnection,
} from "../connectionManager.js";

export const registerCoreHandlers = (socket) => {
  const { userId, userName, mobileNumber1, userRole, authType } = socket.data.user;

  addConnection(socket.id, { userId, userName, mobileNumber: mobileNumber1, role: userRole });

  // Auto-join personal rooms immediately on connection
  const userRoom = buildRoom.user(userId);
  const rooms = [userRoom];

  if (mobileNumber1) {
    rooms.push(buildRoom.business(mobileNumber1));
  }

  if (authType === "admin") {
    rooms.push(buildRoom.admin());
    rooms.push(buildRoom.adminChat());
  }

  rooms.forEach((room) => {
    socket.join(room);
    addRoomToConnection(socket.id, room);
  });

  socket.emit(WS_EVENTS.CONNECTED, {
    socketId: socket.id,
    rooms,
    ts: new Date().toISOString(),
  });

  console.log(`[WS] + ${userName || userId} (${authType || "user"}) socket=${socket.id}`);

  // Dynamic room join (e.g. admin joining admin:global, or category:restaurants)
  socket.on(WS_EVENTS.ROOM_JOIN, ({ room } = {}) => {
    if (!room || typeof room !== "string") return;
    socket.join(room);
    addRoomToConnection(socket.id, room);
    socket.emit(WS_EVENTS.ROOM_JOINED, { room });
  });

  socket.on(WS_EVENTS.ROOM_LEAVE, ({ room } = {}) => {
    if (!room || typeof room !== "string") return;
    socket.leave(room);
    removeRoomFromConnection(socket.id, room);
    socket.emit(WS_EVENTS.ROOM_LEFT, { room });
  });

  socket.on(WS_EVENTS.PING, () => {
    socket.emit(WS_EVENTS.PONG, { ts: Date.now() });
  });

  socket.on(WS_EVENTS.HEARTBEAT, () => {
    socket.emit(WS_EVENTS.PONG, { ts: Date.now() });
  });

  socket.on("disconnect", (reason) => {
    console.log(`[WS] - ${userName || userId} socket=${socket.id} reason=${reason}`);
    removeConnection(socket.id);
  });
};
