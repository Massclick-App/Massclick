import { io } from 'socket.io-client';

// Derive WS URL from REACT_APP_WS_URL or strip /api from REACT_APP_API_URL
const WS_URL =
  process.env.REACT_APP_WS_URL ||
  (process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/, '');

let socket = null;
let currentToken = null;

export const connectSocket = (token) => {
  if (!token) return socket;
  if (socket?.connected && currentToken === token) return socket;

  // Tear down any stale disconnected socket before recreating
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = token;
  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
  });

  socket.on('connect', () => {
    console.log('[WS] connected - socket.id:', socket.id);
  });
  socket.on('disconnect', (reason) => {
    console.log('[WS] disconnected:', reason);
  });
  socket.on('connect_error', (error) => {
    console.warn('[WS] connection error:', error.message);
  });
  socket.on('ws:error', (e) => {
    console.error('[WS] server error:', e);
  });
  socket.on('room:joined', ({ room }) => {
    console.log('[WS] room:joined -', room);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
};
