import { Capacitor } from '@capacitor/core';
import { getPushConfig, registerDevice, removeDevice } from '../api/push.api';
import { isNative } from './native';
import { useAuthStore } from '../stores/authStore';

/**
 * Push in the browser (Web Push) and in the Android app (Firebase Cloud
 * Messaging through @capacitor/push-notifications). Both paths register the
 * device with the same backend endpoints, so the rest of the app only deals
 * with getPushState, enablePush and disablePush.
 */

/** Must equal ANDROID_CHANNEL_ID in the backend (modules/push/fcm.js). */
export const ANDROID_CHANNEL_ID = 'guessio_general';
const TOKEN_TIMEOUT_MS = 15000;

const currentUserId = () => useAuthStore.getState().user?.id || null;

// Per-account, per-install memory: the phone's FCM token, and whether the player turned notifications off on purpose.
const tokenKey = (userId) => `guessio:fcmToken:${userId}`;
const offKey = (userId) => `guessio:pushOff:${userId}`;
const read = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* storage unavailable: falls back to the server's view */ } };
const erase = (key) => { try { localStorage.removeItem(key); } catch { /* nothing to erase */ } };

const webSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** An APK built before the push plugin was added has no native side for it, even though the web bundle was updated over the air. */
const nativePluginReady = () => {
  try {
    return Capacitor.isPluginAvailable('PushNotifications');
  } catch {
    return false;
  }
};

export const pushSupported = () => (isNative() ? nativePluginReady() : webSupported());

async function loadPlugin() {
  return (await import('@capacitor/push-notifications')).PushNotifications;
}

// ---- Web ----

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function registration() {
  return navigator.serviceWorker.register('/sw.js');
}

async function webSubscribed() {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  return Boolean(reg && (await reg.pushManager.getSubscription()));
}

async function enableWeb() {
  const { webPushPublicKey } = await getPushConfig();
  if (!webPushPublicKey) throw new Error('Notifications are not set up on the server yet.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser settings.');
  const reg = await registration();
  const sub = (await reg.pushManager.getSubscription())
    || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(webPushPublicKey) }));
  await registerDevice({ platform: 'WEB', token: JSON.stringify(sub.toJSON()) });
}

async function disableWeb() {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return;
  try {
    await removeDevice(JSON.stringify(sub.toJSON()));
  } finally {
    await sub.unsubscribe();
  }
}

// ---- Android app ----

const mapPermission = (receive) => (receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'default');

async function ensureChannel(plugin) {
  // Android 8+ shows notifications only through a channel; the backend names this one in every message.
  await plugin.createChannel({ id: ANDROID_CHANNEL_ID, name: 'guessIo', description: 'Rank, friend and daily streak alerts', importance: 4, visibility: 1 });
}

/** Asks Firebase for this phone's token. It arrives as an event after register(). */
function fetchNativeToken(plugin) {
  return new Promise((resolve, reject) => {
    const handles = [];
    let timer;
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      handles.forEach((h) => h.remove());
      fn(value);
    };
    Promise.all([
      plugin.addListener('registration', (token) => finish(resolve, token.value)),
      plugin.addListener('registrationError', () => finish(reject, new Error('Could not register this phone for notifications. Check your connection and try again.'))),
    ])
      .then((subs) => {
        handles.push(...subs);
        if (settled) { handles.forEach((h) => h.remove()); return undefined; }
        timer = setTimeout(() => finish(reject, new Error('Registering for notifications took too long. Try again.')), TOKEN_TIMEOUT_MS);
        return plugin.register();
      })
      .catch((err) => finish(reject, err));
  });
}

async function enableNative(userId) {
  if (!nativePluginReady()) throw new Error('Notifications need the latest version of the app. Update guessIo and try again.');
  const plugin = await loadPlugin();
  let permission = (await plugin.checkPermissions()).receive;
  if (permission !== 'granted') permission = (await plugin.requestPermissions()).receive;
  if (permission !== 'granted') throw new Error('Notifications are blocked. Turn them on for guessIo in your phone settings.');
  await ensureChannel(plugin);
  const token = await fetchNativeToken(plugin);
  await registerDevice({ platform: 'ANDROID', token });
  if (userId) write(tokenKey(userId), token);
}

async function disableNative(userId) {
  const token = userId ? read(tokenKey(userId)) : null;
  if (!token) return;
  // If the server cannot be told, this throws and nothing changes, so the switch never reads off while pushes keep coming.
  await removeDevice(token);
  erase(tokenKey(userId));
  try {
    await (await loadPlugin()).unregister();
  } catch { /* the server no longer sends to it either way */ }
}

/**
 * Keeps a phone that already opted in registered. Firebase can hand out a new
 * token at any time, so each launch re-reads it and tells the server. Does
 * nothing for a player who has not turned notifications on here.
 */
export async function syncNativePush(userId) {
  if (!userId || !isNative() || !nativePluginReady() || !read(tokenKey(userId))) return;
  const plugin = await loadPlugin();
  if ((await plugin.checkPermissions()).receive !== 'granted') return;
  await ensureChannel(plugin);
  const token = await fetchNativeToken(plugin);
  await registerDevice({ platform: 'ANDROID', token });
  write(tokenKey(userId), token);
}

// ---- Shared ----

/**
 * What this device can do right now.
 * permission: 'default' | 'granted' | 'denied' | 'unsupported'.
 * turnedOff: the player switched notifications off here, so nothing should ask again.
 */
export async function getPushState() {
  const userId = currentUserId();
  const turnedOff = Boolean(userId) && read(offKey(userId)) === '1';
  if (!pushSupported()) return { supported: false, permission: 'unsupported', subscribed: false, turnedOff };
  if (isNative()) {
    const permission = mapPermission((await (await loadPlugin()).checkPermissions()).receive);
    return { supported: true, permission, subscribed: permission === 'granted' && Boolean(userId && read(tokenKey(userId))), turnedOff };
  }
  return { supported: true, permission: Notification.permission, subscribed: await webSubscribed(), turnedOff };
}

/** Asks permission, registers the device with the server. Throws a readable Error on failure. */
export async function enablePush() {
  if (!pushSupported()) throw new Error(isNative() ? 'Notifications need the latest version of the app. Update guessIo and try again.' : 'This browser cannot receive notifications.');
  const userId = currentUserId();
  if (isNative()) await enableNative(userId); else await enableWeb();
  if (userId) erase(offKey(userId));
}

/** Removes this device's token from the account and remembers that the player chose this. */
export async function disablePush() {
  if (!pushSupported()) return;
  const userId = currentUserId();
  if (isNative()) await disableNative(userId); else await disableWeb();
  if (userId) write(offKey(userId), '1');
}
