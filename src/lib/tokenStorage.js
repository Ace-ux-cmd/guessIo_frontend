import { isNative } from './native';

/**
 * Where the sign-in tokens live.
 *
 * Web: sessionStorage, so one tab is one session and closing it signs the
 * player out.
 * Android app: localStorage inside the Capacitor WebView, so the session
 * survives the app being closed and lasts until the backend expires the
 * refresh token (the 401/403 handling in api/client.js then clears it).
 *
 * Every call is wrapped: storage can throw (disabled, quota). Reads then
 * return null and writes are skipped, which only costs a sign-in next launch.
 */
const primary = () => (isNative() ? localStorage : sessionStorage);

export function readToken(key) {
  try {
    return primary().getItem(key) || null;
  } catch {
    return null;
  }
}

export function writeToken(key, value) {
  try {
    primary().setItem(key, value);
  } catch {
    // Storage unavailable: the in-memory copy still works for this launch.
  }
}

/** Removes the token from both stores, so a stale copy can never bring a signed-out session back. */
export function removeToken(key) {
  for (const store of [() => sessionStorage, () => localStorage]) {
    try {
      store().removeItem(key);
    } catch {
      // Nothing to remove if this store is unavailable.
    }
  }
}
