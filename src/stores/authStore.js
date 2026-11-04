import { create } from 'zustand';
import { readToken, writeToken, removeToken } from '../lib/tokenStorage';

const ACCESS_TOKEN_KEY = 'guessio_access_token';
const REFRESH_TOKEN_KEY = 'guessio_refresh_token';

export const useAuthStore = create((set, get) => ({
  user: null,
  // Web keeps these per tab (sessionStorage); the Android app keeps them
  // until the backend expires them (see lib/tokenStorage.js).
  accessToken: readToken(ACCESS_TOKEN_KEY),
  refreshToken: readToken(REFRESH_TOKEN_KEY),
  // A one-shot notice to surface on the next Login screen render (e.g.
  // "logged out because this account signed in elsewhere"). Consumed and
  // cleared by whatever screen displays it.
  sessionMessage: null,
  // Separate one-shot notice for Dashboard specifically: set when the
  // back-navigation guard blocks an authenticated user's back-press away
  // from /login (see useBackNavigationGuard.js) and redirects them to
  // /dashboard instead of leaving them stuck with no feedback.
  backToLoginBlockedMessage: null,

  isAuthenticated: () => Boolean(get().accessToken),

  setSession: ({ user, accessToken, refreshToken }) => {
    if (accessToken) writeToken(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) writeToken(REFRESH_TOKEN_KEY, refreshToken);
    set({ user: user ?? get().user, accessToken, refreshToken });
  },

  /** @param {string} [message] Optional notice to show on the next login screen. */
  clearSession: (message) => {
    removeToken(ACCESS_TOKEN_KEY);
    removeToken(REFRESH_TOKEN_KEY);
    set({ user: null, accessToken: null, refreshToken: null, sessionMessage: message ?? null });
  },

  consumeSessionMessage: () => {
    const message = get().sessionMessage;
    if (message) set({ sessionMessage: null });
    return message;
  },

  consumeBackToLoginBlockedMessage: () => {
    const message = get().backToLoginBlockedMessage;
    if (message) set({ backToLoginBlockedMessage: null });
    return message;
  },

  setBackToLoginBlockedMessage: (message) => set({ backToLoginBlockedMessage: message }),
}));
