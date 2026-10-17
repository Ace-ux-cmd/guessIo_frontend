/**
 * The short-lived appeal token the backend appends to /error/suspended and
 * /error/banned (as `#appeal=<token>`) when a Google sign-in is refused for a
 * suspended or banned account. No session exists in that case, so this token
 * is what lets the screen load the account's email and reason and file an
 * appeal. It travels in the URL fragment so it is never sent to a server or
 * logged; it is moved into sessionStorage (this tab only) and stripped from
 * the address bar as soon as it is read.
 */
const KEY = 'guessio_appeal_token';
let cached; // undefined = not read yet, null = none

/** Idempotent: safe to call on every render and under React StrictMode. */
export function captureAppealToken() {
  try {
    const match = /[#&]appeal=([^&]+)/.exec(window.location.hash);
    if (match) {
      cached = decodeURIComponent(match[1]);
      sessionStorage.setItem(KEY, cached);
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
  } catch (_) { /* storage or history unavailable: the in-memory copy still works */ }
  if (cached === undefined) {
    try { cached = sessionStorage.getItem(KEY) || null; } catch (_) { cached = null; }
  }
  return cached || null;
}

export function clearAppealToken() {
  cached = null;
  try { sessionStorage.removeItem(KEY); } catch (_) { /* ignore */ }
}
