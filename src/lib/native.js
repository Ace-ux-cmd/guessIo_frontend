import { Capacitor } from '@capacitor/core';

/** True only inside the Android app shell; always false in a browser or in tests. */
export const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/** Custom URL scheme the backend redirects to after Google sign-in (APP_DEEP_LINK_SCHEME, matches appId). */
export const APP_SCHEME = 'io.guessio.app';

const base64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const VERIFIER_KEY = 'guessio_google_verifier';

export function readGoogleVerifier() {
  try {
    return localStorage.getItem(VERIFIER_KEY);
  } catch {
    return null;
  }
}

export function clearGoogleVerifier() {
  try {
    localStorage.removeItem(VERIFIER_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

/**
 * Google refuses sign-in inside an embedded WebView, so the app opens the
 * backend's /auth/google in the system browser (Custom Tab) with a PKCE
 * challenge. The backend redirects back to io.guessio.app://auth/google/callback,
 * and the exchange then proves possession of the verifier kept here.
 */
export async function startNativeGoogleSignIn() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32))); // 43 chars
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  localStorage.setItem(VERIFIER_KEY, verifier);
  const { Browser } = await import('@capacitor/browser');
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  await Browser.open({ url: `${baseURL}/auth/google?client=app&challenge=${challenge}` });
}

// Only these in-app destinations may be opened from a deep link, whatever the URL says.
const ALLOWED_LINKS = [/^auth\/google\/callback$/, /^login$/, /^error\/(suspended|banned)$/];

/** Turns io.guessio.app://auth/google/callback?code=x into a router target, or null if not allowed. */
export function routeFromDeepLink(url) {
  const prefix = `${APP_SCHEME}://`;
  if (typeof url !== 'string' || !url.startsWith(prefix)) return null;
  let parsed;
  try {
    parsed = new URL(`https://app.invalid/${url.slice(prefix.length)}`);
  } catch {
    return null;
  }
  const path = parsed.pathname.replace(/^\/+|\/+$/g, '');
  if (!ALLOWED_LINKS.some((re) => re.test(path))) return null;
  return { pathname: `/${path}`, search: parsed.search, hash: parsed.hash };
}
