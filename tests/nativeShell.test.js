import { describe, it, expect, beforeEach, vi } from 'vitest';

// These use the real Capacitor detection (the Android shell injects window.androidBridge),
// so they cover what the phone does, not just what a mock says.
beforeEach(() => {
  vi.resetModules();
  delete window.androidBridge;
  document.head.querySelectorAll('meta[name="referrer"]').forEach((m) => m.remove());
  sessionStorage.clear();
  localStorage.clear();
});

describe('Android app shell', () => {
  it('keeps the sign-in across a full app restart', async () => {
    window.androidBridge = { postMessage() {} };
    const first = (await import('../src/stores/authStore')).useAuthStore;
    first.getState().setSession({ user: { id: 'u1' }, accessToken: 'a1', refreshToken: 'r1' });

    sessionStorage.clear(); // closing the app wipes session storage
    vi.resetModules();
    const relaunched = (await import('../src/stores/authStore')).useAuthStore;
    expect(relaunched.getState().isAuthenticated()).toBe(true);
    expect(relaunched.getState().refreshToken).toBe('r1');
  });

  it('sends no Referer, so Google avatar pictures load', async () => {
    window.androidBridge = { postMessage() {} };
    const { hideReferrerInApp } = await import('../src/lib/native');
    hideReferrerInApp();
    hideReferrerInApp();
    const metas = document.head.querySelectorAll('meta[name="referrer"]');
    expect(metas).toHaveLength(1);
    expect(metas[0].content).toBe('no-referrer');
  });
});

describe('website', () => {
  it('still signs out when the tab closes and leaves the referrer policy alone', async () => {
    const store = (await import('../src/stores/authStore')).useAuthStore;
    store.getState().setSession({ accessToken: 'a1', refreshToken: 'r1' });
    expect(localStorage.getItem('guessio_refresh_token')).toBeNull();
    const { hideReferrerInApp } = await import('../src/lib/native');
    hideReferrerInApp();
    expect(document.head.querySelector('meta[name="referrer"]')).toBeNull();
  });
});
