import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const state = { permission: 'prompt', requestResult: 'granted', token: 'tok-1', registerFails: false, listeners: {} };
  const plugin = {
    checkPermissions: async () => ({ receive: state.permission }),
    requestPermissions: vi.fn(async () => { state.permission = state.requestResult; return { receive: state.requestResult }; }),
    createChannel: vi.fn(async () => {}),
    register: vi.fn(async () => {
      queueMicrotask(() => (state.registerFails ? state.listeners.registrationError?.({ error: 'x' }) : state.listeners.registration?.({ value: state.token })));
    }),
    unregister: vi.fn(async () => {}),
    addListener: vi.fn(async (event, fn) => { state.listeners[event] = fn; return { remove: () => { delete state.listeners[event]; } }; }),
  };
  return { state, plugin, api: { registerDevice: vi.fn(async () => {}), removeDevice: vi.fn(async () => {}), getPushConfig: vi.fn() } };
});
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, isPluginAvailable: () => h.state.pluginAvailable !== false } }));
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: h.plugin }));
vi.mock('../src/api/push.api', () => h.api);

import { enablePush, disablePush, getPushState, syncNativePush, ANDROID_CHANNEL_ID, pushSupported } from '../src/lib/push';
import { routeFromPush } from '../src/lib/native';
import { useAuthStore } from '../src/stores/authStore';

beforeEach(() => {
  localStorage.clear();
  Object.assign(h.state, { permission: 'prompt', requestResult: 'granted', token: 'tok-1', registerFails: false, listeners: {}, pluginAvailable: true });
  vi.clearAllMocks();
  useAuthStore.setState({ user: { id: 'u1' } });
});
afterEach(() => useAuthStore.setState({ user: null }));

describe('native push: enable', () => {
  it('asks permission, creates the channel, and registers the phone token as ANDROID', async () => {
    await enablePush();
    expect(h.plugin.requestPermissions).toHaveBeenCalledTimes(1);
    expect(h.plugin.createChannel).toHaveBeenCalledWith(expect.objectContaining({ id: ANDROID_CHANNEL_ID }));
    expect(h.api.registerDevice).toHaveBeenCalledWith({ platform: 'ANDROID', token: 'tok-1' });
    expect(await getPushState()).toMatchObject({ supported: true, permission: 'granted', subscribed: true, turnedOff: false });
  });

  it('does not ask again when permission is already granted', async () => {
    h.state.permission = 'granted';
    await enablePush();
    expect(h.plugin.requestPermissions).not.toHaveBeenCalled();
  });

  it('refuses with a readable message when the player denies, and registers nothing', async () => {
    h.state.requestResult = 'denied';
    await expect(enablePush()).rejects.toThrow('Notifications are blocked. Turn them on for guessIo in your phone settings.');
    expect(h.api.registerDevice).not.toHaveBeenCalled();
    expect(await getPushState()).toMatchObject({ permission: 'denied', subscribed: false });
  });

  it('reports a Firebase registration failure and registers nothing', async () => {
    h.state.registerFails = true;
    await expect(enablePush()).rejects.toThrow('Could not register this phone for notifications.');
    expect(h.api.registerDevice).not.toHaveBeenCalled();
    expect(Object.keys(h.state.listeners)).toHaveLength(0);
  });

  it('does not report on when the server refused the token', async () => {
    h.api.registerDevice.mockRejectedValueOnce(new Error('Server said no.'));
    await expect(enablePush()).rejects.toThrow('Server said no.');
    expect((await getPushState()).subscribed).toBe(false);
  });

  it('says to update the app when this APK has no push plugin', async () => {
    h.state.pluginAvailable = false;
    expect(pushSupported()).toBe(false);
    await expect(enablePush()).rejects.toThrow('Update guessIo');
    expect(await getPushState()).toMatchObject({ supported: false, permission: 'unsupported' });
  });
});

describe('native push: disable and sync', () => {
  it('removes the token from the account, forgets it, and remembers the choice', async () => {
    await enablePush();
    await disablePush();
    expect(h.api.removeDevice).toHaveBeenCalledWith('tok-1');
    expect(h.plugin.unregister).toHaveBeenCalled();
    expect(await getPushState()).toMatchObject({ subscribed: false, turnedOff: true });
  });

  it('keeps everything as it was when the server cannot be told', async () => {
    await enablePush();
    h.api.removeDevice.mockRejectedValueOnce(new Error('offline'));
    await expect(disablePush()).rejects.toThrow('offline');
    expect(await getPushState()).toMatchObject({ subscribed: true, turnedOff: false });
  });

  it('turning it on again clears the remembered choice', async () => {
    await enablePush();
    await disablePush();
    await enablePush();
    expect((await getPushState()).turnedOff).toBe(false);
  });

  it('sync does nothing for a player who never turned notifications on here', async () => {
    h.state.permission = 'granted';
    await syncNativePush('u1');
    expect(h.plugin.register).not.toHaveBeenCalled();
    expect(h.api.registerDevice).not.toHaveBeenCalled();
  });

  it('sync sends a rotated token to the server', async () => {
    await enablePush();
    h.api.registerDevice.mockClear();
    h.state.token = 'tok-2';
    await syncNativePush('u1');
    expect(h.api.registerDevice).toHaveBeenCalledWith({ platform: 'ANDROID', token: 'tok-2' });
    // A second account on the same phone is not opted in by the first one.
    h.api.registerDevice.mockClear();
    await syncNativePush('u2');
    expect(h.api.registerDevice).not.toHaveBeenCalled();
  });

  it('sync stays quiet when the system permission was taken away', async () => {
    await enablePush();
    h.api.registerDevice.mockClear();
    h.state.permission = 'denied';
    await syncNativePush('u1');
    expect(h.api.registerDevice).not.toHaveBeenCalled();
  });
});

describe('routeFromPush', () => {
  it.each([
    ['/leaderboard', '/leaderboards'],
    ['/friends?tab=requests', '/friends?tab=requests'],
    ['/friends', '/friends'],
    ['/daily', '/daily'],
    ['/players/ada_01', '/players/ada_01'],
    ['/dashboard', '/dashboard'],
  ])('opens %s as %s', (raw, expected) => expect(routeFromPush(raw)).toBe(expected));

  it.each([
    undefined, null, '', 'https://evil.example/x', '//evil.example/x', '/settings', '/gameplay', '/players/../admin', '/players/a b', '/friends/add',
  ])('falls back to the dashboard for %s', (raw) => expect(routeFromPush(raw)).toBe('/dashboard'));
});
