import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { APP_VERSION } from '../lib/version';

const baseURL = import.meta.env.VITE_API_BASE_URL;

export const apiClient = axios.create({ baseURL });

apiClient.interceptors.request.use((config) => {
  // The bundle version rides on requests the app already makes.
  config.headers['X-Client-Version'] = APP_VERSION;
  const { accessToken } = useAuthStore.getState();
  // A caller that sets its own Authorization header (the appeal token) keeps it.
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise = null;

/** Shared by the 401 interceptor and the socket's reconnect auth, so two
 * concurrent callers never spend the same single-use refresh token twice. */
export async function refreshAccessToken() {
  const { refreshToken, setSession } = useAuthStore.getState();
  if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post('/auth/refresh', { refreshToken })
      .finally(() => {
        refreshPromise = null;
      });
  }
  const { data } = await refreshPromise;
  setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.accessToken;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;

    const isAuthEndpoint = originalRequest.url?.includes('/auth/');

    if (status === 403 && (code === 'ACCOUNT_SUSPENDED' || code === 'ACCOUNT_BANNED')) {
      // A previously-valid session's account was suspended/banned by an
      // admin mid-session (see backend middleware/auth.js requireAuth,
      // which now checks status on every request, not just login).
      // Deliberately NOT calling clearSession() here, unlike
      // SESSION_SUPERSEDED below: the access token is still what lets the
      // Suspended/Banned screen's appeal form authenticate as this account
      // (see requireSuspendedOrBanned on the backend) - clearing it now
      // would strand the user with no way to file an appeal. Those screens
      // clear the session themselves once the user actually leaves (Back
      // to Home).
      const target = code === 'ACCOUNT_BANNED' ? '/error/banned' : '/error/suspended';
      if (window.location.pathname !== target) {
        window.location.assign(target);
      }
      return Promise.reject(error);
    }

    if (status === 401 && code === 'SESSION_SUPERSEDED') {
      const { clearSession } = useAuthStore.getState();
      clearSession(error.response?.data?.error?.message || 'You were signed out because this account was logged in elsewhere.');
      return Promise.reject(error);
    }

    if (status === 401 && code === 'SESSION_EXPIRED' && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      const { refreshToken, clearSession } = useAuthStore.getState();

      if (!refreshToken) {
        clearSession();
        return Promise.reject(error);
      }

      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Only a definitive rejection from the server ends the session. A
        // network failure or 5xx says nothing about the refresh token, which
        // may still be valid on the next attempt.
        const refreshStatus = refreshError.response?.status;
        if (refreshStatus === 401 || refreshStatus === 403 || refreshError.message === 'NO_REFRESH_TOKEN') {
          clearSession();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/** Extracts a user-facing message from the API contract's error envelope. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.error?.message || fallback;
}
