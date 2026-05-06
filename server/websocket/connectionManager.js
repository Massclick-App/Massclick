// In-memory store: socketId → { userId, userName, mobileNumber, role, connectedAt, rooms: Set }
// Single-server only. To scale horizontally, replace with a Redis-backed adapter.
const _connections = new Map();

export const addConnection = (socketId, meta) => {
  _connections.set(socketId, { ...meta, rooms: new Set(), connectedAt: new Date() });
};

export const removeConnection = (socketId) => _connections.delete(socketId);

export const getConnection = (socketId) => _connections.get(socketId);

export const addRoomToConnection = (socketId, room) => {
  _connections.get(socketId)?.rooms.add(room);
};

export const removeRoomFromConnection = (socketId, room) => {
  _connections.get(socketId)?.rooms.delete(room);
};

export const getStats = () => {
  const all = [..._connections.values()];
  return {
    totalConnections: _connections.size,
    byRole: all.reduce((acc, c) => {
      acc[c.role || "unknown"] = (acc[c.role || "unknown"] || 0) + 1;
      return acc;
    }, {}),
  };
};
