import { getPushConfig, registerDevice, removeDevice } from '../api/push.api';

/** Web push in the browser. The native Android app needs its own provider, which this build does not include. */
export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const pushPermission = () => (pushSupported() ? Notification.permission : 'unsupported');

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function registration() {
  return navigator.serviceWorker.register('/sw.js');
}

/** True when this browser already has a push subscription. */
export async function isSubscribed() {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  return Boolean(reg && (await reg.pushManager.getSubscription()));
}

/** Asks permission, subscribes and registers the device. Throws a readable Error on failure. */
export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser cannot receive notifications.');
  const { webPushPublicKey } = await getPushConfig();
  if (!webPushPublicKey) throw new Error('Notifications are not set up on the server yet.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser settings.');
  const reg = await registration();
  const sub = (await reg.pushManager.getSubscription())
    || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(webPushPublicKey) }));
  await registerDevice({ platform: 'WEB', token: JSON.stringify(sub.toJSON()) });
}

/** Unsubscribes this browser and removes its token from the account. */
export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return;
  try {
    await removeDevice(JSON.stringify(sub.toJSON()));
  } finally {
    await sub.unsubscribe();
  }
}
