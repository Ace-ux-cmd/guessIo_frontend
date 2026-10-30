import { io } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { refreshAccessToken } from '../api/client';
import { APP_VERSION } from '../lib/version';

const WS_URL = import.meta.env.VITE_WS_URL;

// After this many failed auto-reconnect attempts, socket.io-client gives up
// and fires 'reconnect_failed' - see useConnectionStatus.js, which surfaces
// that as the "offline" status driving the reconnect-or-guest modal on any
// screen with an active session. Left uncapped (the library default is
// Infinity), the client would retry silently forever and that modal would
// never appear.
const RECONNECT_ATTEMPT_LIMIT = 3;

let socket = null;

const TOKEN_EXPIRY_MARGIN_SECONDS = 30;

function secondsUntilExpiry(token) {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return exp - Date.now() / 1000;
  } catch {
    return Infinity;
  }
}

/** Access tokens last 15 minutes, so a socket that drops late in a session
 * would otherwise retry with a dead token, be refused, and never recover. */
async function currentAccessToken() {
  const { accessToken } = useAuthStore.getState();
  if (!accessToken || secondsUntilExpiry(accessToken) > TOKEN_EXPIRY_MARGIN_SECONDS) return accessToken;
  try {
    return await refreshAccessToken();
  } catch {
    return accessToken;
  }
}

/**
 * Lazily creates (or returns) the single Socket.IO connection for the app.
 * Re-authenticates automatically using the current access token.
 */
export function getSocket() {
  if (socket) return socket;

  socket = io(WS_URL, {
    autoConnect: false,
    // A function, so every automatic reconnect attempt sends the token the
    // app holds at that moment rather than the one from when the socket was
    // first created.
    auth: (sendAuth) => {
      currentAccessToken().then((token) => sendAuth({ token, clientVersion: APP_VERSION }));
    },
    reconnectionAttempts: RECONNECT_ATTEMPT_LIMIT,
  });

  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

/**
 * Manually retries after the client has given up (reconnect_failed) - the
 * built-in reconnection manager stops trying once RECONNECT_ATTEMPT_LIMIT is
 * exhausted, so resuming requires an explicit connect() call, same as the
 * first-ever connection.
 */
export function retryConnection() {
  const s = getSocket();
  s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket && socket.connected) socket.disconnect();
}

/**
 * Emits a client -> server event with the raw payload shape the API contract
 * expects on the wire (the envelope's `event`/`version`/`timestamp`/`matchId`
 * wrapping is server -> client only per contract §3.1's examples; client
 * emits are plain payloads keyed by Socket.IO event name).
 */
export function emit(event, payload) {
  getSocket().emit(event, payload);
}
