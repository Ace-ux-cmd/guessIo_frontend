import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../sockets/socketClient';
import { useAuthStore } from '../stores/authStore';
import {
  refreshPendingAchievements,
  resetAchievementNotifications,
  useAchievementNotificationStore,
} from '../stores/achievementNotifications';

/**
 * Keeps the pending achievement unlocks in sync with the server while a
 * signed-in user is present. Mount once, near the app root.
 *
 * Re-reads the server list on startup, on every socket (re)connect, when the
 * server pushes `achievements.unlocked`, and when the tab becomes visible
 * again - the last two cover phones that suspend the page in the background.
 */
export function useAchievementNotificationSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const enabled = isAuthenticated && Boolean(userId);

  useEffect(() => {
    if (!enabled) return undefined;

    const socket = getSocket();
    const refresh = () => {
      refreshPendingAchievements();
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    // A new unlock makes any cached achievements list out of date.
    const unsubscribe = useAchievementNotificationStore.subscribe((state, previous) => {
      if (state.pending.length > previous.pending.length) {
        queryClient.invalidateQueries({ queryKey: ['achievements'] });
      }
    });

    refresh();
    socket.on('connect', refresh);
    socket.on('achievements.unlocked', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      socket.off('connect', refresh);
      socket.off('achievements.unlocked', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      unsubscribe();
      resetAchievementNotifications();
    };
  }, [enabled, userId, queryClient]);
}
