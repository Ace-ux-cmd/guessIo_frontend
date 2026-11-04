import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ native: false }));
vi.mock('../src/lib/native', () => ({ isNative: () => h.native }));

async function freshStore() {
  vi.resetModules();
  return (await import('../src/stores/authStore')).useAuthStore;
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('auth token storage', () => {
  it('web: tokens go to sessionStorage only, so a closed tab signs out', async () => {
    h.native = false;
    const store = await freshStore();
    store.getState().setSession({ user: { id: 'u1' }, accessToken: 'a1', refreshToken: 'r1' });
    expect(sessionStorage.getItem('guessio_refresh_token')).toBe('r1');
    expect(localStorage.getItem('guessio_refresh_token')).toBeNull();
  });

  it('app: tokens go to localStorage and are restored on the next launch', async () => {
    h.native = true;
    const first = await freshStore();
    first.getState().setSession({ user: { id: 'u1' }, accessToken: 'a1', refreshToken: 'r1' });
    expect(localStorage.getItem('guessio_access_token')).toBe('a1');
    expect(sessionStorage.getItem('guessio_access_token')).toBeNull();

    sessionStorage.clear(); // a full app close wipes session storage
    const relaunched = await freshStore();
    expect(relaunched.getState().accessToken).toBe('a1');
    expect(relaunched.getState().refreshToken).toBe('r1');
    expect(relaunched.getState().isAuthenticated()).toBe(true);
  });

  it('app: a rotated refresh token replaces the stored one', async () => {
    h.native = true;
    const store = await freshStore();
    store.getState().setSession({ accessToken: 'a1', refreshToken: 'r1' });
    store.getState().setSession({ accessToken: 'a2', refreshToken: 'r2' });
    expect(localStorage.getItem('guessio_refresh_token')).toBe('r2');
  });

  it('clearSession removes the tokens from both stores', async () => {
    h.native = true;
    const store = await freshStore();
    store.getState().setSession({ accessToken: 'a1', refreshToken: 'r1' });
    sessionStorage.setItem('guessio_access_token', 'stale');
    store.getState().clearSession();
    expect(localStorage.getItem('guessio_access_token')).toBeNull();
    expect(sessionStorage.getItem('guessio_access_token')).toBeNull();
    expect((await freshStore()).getState().isAuthenticated()).toBe(false);
  });
});
