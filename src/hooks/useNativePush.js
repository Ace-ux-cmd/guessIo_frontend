import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNative, routeFromPush } from '../lib/native';
import { pushSupported, syncNativePush } from '../lib/push';
import { useAuthStore } from '../stores/authStore';

/**
 * Android app only. Opens the right screen when a notification is tapped, and
 * keeps a phone that already turned notifications on registered with the
 * server once the player is signed in (Firebase can rotate the token).
 */
export function useNativePush() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!isNative() || !pushSupported()) return undefined;
    let handle;
    let cancelled = false;
    (async () => {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const sub = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        navigate(routeFromPush(action.notification?.data?.url));
      });
      if (cancelled) sub.remove(); else handle = sub;
    })().catch(() => { /* no push plugin in this build: nothing to open */ });
    return () => { cancelled = true; handle?.remove(); };
  }, [navigate]);

  useEffect(() => {
    if (userId) syncNativePush(userId).catch(() => { /* retried on the next launch */ });
  }, [userId]);
}
