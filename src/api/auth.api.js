import { apiClient } from './client';

export async function logout() {
  await apiClient.post('/auth/logout');
}

export async function deleteAccount() {
  await apiClient.delete('/me');
}

// Result is one of:
//   { onboarding: true, onboardingToken, suggestedUsername }
//   { onboarding: false, user, accessToken, refreshToken }
// The server code is single-use, so concurrent calls for the same code (React
// StrictMode runs the callback effect twice in dev) must share one request.
const inflightExchanges = new Map();

export function exchangeGoogleCode(code) {
  if (inflightExchanges.has(code)) return inflightExchanges.get(code);
  const request = apiClient
    .post('/auth/google/exchange', { code, nonce: readGoogleNonce() ?? undefined })
    .then(({ data }) => data)
    .finally(() => {
      clearGoogleNonce();
      inflightExchanges.delete(code);
    });
  inflightExchanges.set(code, request);
  return request;
}

export async function completeOnboarding({ onboardingToken, username }) {
  const { data } = await apiClient.post('/auth/onboarding/complete', { onboardingToken, username });
  return data;
}

export async function checkUsernameAvailability({ onboardingToken, username }, { signal } = {}) {
  const { data } = await apiClient.post('/auth/onboarding/username-available', { onboardingToken, username }, { signal });
  return data;
}

const GOOGLE_NONCE_KEY = 'guessio_google_nonce';

function readGoogleNonce() {
  try {
    return localStorage.getItem(GOOGLE_NONCE_KEY);
  } catch {
    return null;
  }
}

function clearGoogleNonce() {
  try {
    localStorage.removeItem(GOOGLE_NONCE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

// The nonce stays in this browser and is sent back with the exchange, so a
// sign-in code started in someone else's browser cannot be redeemed here.
// localStorage rather than sessionStorage: Google's redirect can land in a
// different tab or a restored page on mobile, and sessionStorage does not
// follow it there.
export function getGoogleLoginUrl() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const nonce = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem(GOOGLE_NONCE_KEY, nonce);
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  return `${baseURL}/auth/google?nonce=${nonce}`;
}
