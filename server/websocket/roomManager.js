import { getIO } from "./ioInstance.js";

export const emitToRoom = (room, event, payload) => {
  const io = getIO();
  if (!io) return;
  io.to(room).emit(event, payload);
};

export const getRoomSize = async (room) => {
  const io = getIO();
  if (!io) return 0;
  const sockets = await io.in(room).fetchSockets();
  return sockets.length;
};
