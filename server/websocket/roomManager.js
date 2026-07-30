import { getIO } from "./ioInstance.js";

export const emitToRoom = (room, event, payload) => {
  const io = getIO();
  if (!io) return;
  io.to(room).emit(event, payload);
};

export const emitToAdminSessions = async (
  event,
  payload,
  { subjectId = null, tokenId = null, excludeTokenId = null } = {}
) => {
  const io = getIO();
  if (!io) return 0;

  const sockets = await io.fetchSockets();
  let emitted = 0;

  sockets.forEach((socket) => {
    const actor = socket.data?.authActor;
    if (actor?.actorType !== "admin") return;
    if (subjectId && String(actor.subjectId) !== String(subjectId)) return;
    if (tokenId && String(actor.tokenId) !== String(tokenId)) return;
    if (excludeTokenId && String(actor.tokenId) === String(excludeTokenId)) return;

    socket.emit(event, payload);
    emitted += 1;
  });

  return emitted;
};

export const getRoomSize = async (room) => {
  const io = getIO();
  if (!io) return 0;
  const sockets = await io.in(room).fetchSockets();
  return sockets.length;
};
