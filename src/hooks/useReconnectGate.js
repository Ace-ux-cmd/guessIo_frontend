import { useCallback, useEffect, useState } from 'react';
import { getSocket, retryConnection } from '../sockets/socketClient';
import { useAuthStore } from '../stores/authStore';

/**
 * Surfaces the moment an authenticated session's socket gives up trying to
 * reconnect on its own (see RECONNECT_ATTEMPT_LIMIT in sockets/socketClient.js) -
 * so a screen with an active session (e.g. Gameplay) can put up a blocking
 * modal offering "Reconnect" (retry) or "Play as Guest" (bail out to
 * client-only play) instead of leaving the player staring at a stalled
 * match with no way forward.
 *
 * Deliberately separate from useConnectionStatus: that hook drives the
 * always-present, non-blocking .conn-banner and intentionally reports
 * 'offline' for guests (who have no socket at all). This hook only cares
 * about one thing - has THIS authenticated session's auto-reconnect been
 * exhausted - and never fires for guests, since they have nothing to
 * reconnect.
 *
 * @returns {{ exhausted: boolean, retry: () => void, dismiss: () => void }}
 */
export function useReconnectGate() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setExhausted(false);
      return undefined;
    }

    const socket = getSocket();

    function handleReconnectFailed() {
      setExhausted(true);
    }
    function handleConnect() {
      setExhausted(false);
    }

    socket.io.on('reconnect_failed', handleReconnectFailed);
    socket.on('connect', handleConnect);

    return () => {
      socket.io.off('reconnect_failed', handleReconnectFailed);
      socket.off('connect', handleConnect);
    };
  }, [isAuthenticated]);

  const retry = useCallback(() => {
    setExhausted(false);
    retryConnection();
  }, []);

  const dismiss = useCallback(() => setExhausted(false), []);

  return { exhausted, retry, dismiss };
}
