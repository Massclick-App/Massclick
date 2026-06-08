import { io } from 'socket.io-client';

const WS_URL =
  process.env.REACT_APP_WS_URL ||
  (process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/, '');

const LOG = (...args) => console.log('[WS]', ...args);
const WARN = (...args) => console.warn('[WS]', ...args);
const ERR = (...args) => console.error('[WS]', ...args);

let socket = null;
let currentToken = null;
let getTokenFn = null;

// Fired when server rejects with INVALID_TOKEN — components listen to this
export const AUTH_EXPIRED_EVENT = 'ws:auth:expired';

const fireAuthExpired = () => {
  LOG('Auth expired — firing', AUTH_EXPIRED_EVENT);
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
};

/**
 * connectSocket(token)
 *
 * Pass token as a string OR as a function () => string.
 * Passing a function is preferred: Socket.IO calls it fresh on every
 * reconnect attempt, so a rotated/refreshed token is picked up automatically.
 *
 * WHY THE TOKEN IS REQUIRED:
 *   WebSocket is a single persistent connection with no per-request headers.
 *   The server reads socket.handshake.auth.token in wsAuthMiddleware to:
 *     1. Identify the user (admin vs customer)
 *     2. Auto-join the right rooms (admin:chat, user:{id}, …)
 *     3. Authorize access to specific conversations
 *   Without it the server rejects the handshake entirely.
 */
export const connectSocket = (token) => {
  if (!token) {
    WARN('connectSocket called with no token — skipping');
    return socket;
  }

  const resolvedToken = typeof token === 'function' ? token() : token;

  // Same token: reuse existing socket whether it's connected OR still connecting.
  // Do NOT tear down a socket that is mid-handshake — that causes a torn-down-
  // then-recreated cycle (visible as "transport close" in logs) where the new
  // socket connects but the component's listeners were registered on the old one.
  if (socket && currentToken === resolvedToken) {
    LOG('Reusing socket — connected:', socket.connected, '| id:', socket.id || '(connecting)');
    return socket;
  }

  // Token changed — tear down the stale socket and start fresh
  if (socket) {
    LOG('Token changed — tearing down old socket before creating new one');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = resolvedToken;
  // Store getter so reconnects always use the freshest token
  getTokenFn = typeof token === 'function' ? token : () => token;

  LOG('Creating new socket — URL:', WS_URL);

  socket = io(WS_URL, {
    // auth as a FUNCTION: Socket.IO calls this on every reconnect attempt.
    // This ensures a refreshed token (e.g. after OAuth relogin) is used
    // instead of the stale one baked in at creation time.
    auth: (callback) => {
      const t = getTokenFn();
      LOG('Socket.IO auth callback — providing token:', t ? t.slice(0, 12) + '…' : 'null');
      callback({ token: t });
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
    reconnectionAttempts: 10,
  });

  // ── Core lifecycle ───────────────────────────────────────────────────────────
  socket.on('connect', () => {
    LOG('✅ connected — socket.id:', socket.id, '| transport:', socket.io.engine.transport.name);
  });

  socket.on('disconnect', (reason) => {
    LOG('🔌 disconnected — reason:', reason);
    if (reason === 'io server disconnect') {
      // Server actively closed us. Don't auto-reconnect unless token is refreshed.
      WARN('Server closed the socket — will NOT auto-reconnect');
    }
  });

  socket.on('connect_error', (error) => {
    WARN('⚠️ connect_error:', error.message);

    if (error.message === 'INVALID_TOKEN' || error.message === 'AUTH_REQUIRED') {
      ERR('Token rejected by server — stopping reconnection, firing auth expired event');
      // Disable Socket.IO's auto-retry so we don't spam the server
      socket.io.reconnection(false);
      socket.disconnect();
      fireAuthExpired();
    }
  });

  socket.on('reconnect_attempt', (attempt) => {
    const freshToken = getTokenFn?.();
    LOG(`🔄 reconnect attempt #${attempt} — token starts with:`, freshToken ? freshToken.slice(0, 12) + '…' : 'null');
  });

  socket.on('reconnect', (attempt) => {
    LOG(`✅ reconnected after ${attempt} attempt(s) — socket.id:`, socket.id);
  });

  socket.on('reconnect_failed', () => {
    ERR('❌ reconnect_failed — exhausted all attempts');
    fireAuthExpired();
  });

  socket.on('ws:error', (e) => {
    ERR('Server-side ws:error:', e);
  });

  socket.on('room:joined', ({ room }) => {
    LOG('🚪 room:joined —', room);
  });

  socket.on('room:left', ({ room }) => {
    LOG('🚪 room:left —', room);
  });

  socket.on('connected', (data) => {
    LOG('📡 server welcomed us — rooms:', data?.rooms, '| ts:', data?.ts);
  });

  return socket;
};

export const getSocket = () => socket;

/**
 * Call this after a token refresh to hot-swap the token.
 * The next reconnect attempt will automatically pick up the new value
 * because auth is a function, but this also clears the stale socket
 * so a fresh handshake is made immediately.
 */
export const refreshSocketToken = (newToken) => {
  LOG('refreshSocketToken called — forcing reconnect with new token');
  return connectSocket(newToken);
};

/**
 * emitWithTimeout — emit a socket event and wait for ACK.
 * Rejects after `timeout` ms so spinners never hang forever.
 */
export const emitWithTimeout = (event, data, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      WARN('emitWithTimeout: socket not connected, event:', event);
      reject(new Error('SOCKET_NOT_CONNECTED'));
      return;
    }

    LOG(`emitWithTimeout: emitting "${event}" with ${timeout}ms timeout`);

    const timeoutId = setTimeout(() => {
      ERR(`emitWithTimeout: timeout after ${timeout}ms for event "${event}"`);
      reject(new Error('SOCKET_TIMEOUT'));
    }, timeout);

    socket.emit(event, data, (response) => {
      clearTimeout(timeoutId);
      LOG(`emitWithTimeout: ACK received for "${event}" — ok:`, response?.ok);
      if (response?.ok === false) {
        reject(new Error(response?.error || 'Socket operation failed'));
      } else {
        resolve(response);
      }
    });
  });
};

export const disconnectSocket = () => {
  if (socket) {
    LOG('disconnectSocket — cleaning up');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentToken = null;
    getTokenFn = null;
  }
};
