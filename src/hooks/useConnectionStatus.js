import { useEffect, useState } from 'react';
import { getSocket } from '../sockets/socketClient';
import { useAuthStore } from '../stores/authStore';

/**
 * Tracks the real state of the shared socket connection, for the
 * .conn-banner shown on authenticated screens (Dashboard, Gameplay, etc.).
 * Guests never open a socket (guest play is entirely client-side - see
 * game/GuestMatch.js), so there is no live connection to report - this
 * hook reports 'offline' for guests to reflect that honestly, rather than
 * a misleading "Connected" for a connection that was never established.
 *
 * @returns {'connected'|'reconnecting'|'offline'}
 */
export function useConnectionStatus() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [status, setStatus] = useState('connected');

  useEffect(() => {
    if (!isAuthenticated) {
      setStatus('offline'); // guest: no socket - nothing is actually connected
      return undefined;
    }

    const socket = getSocket();
    setStatus(socket.connected ? 'connected' : 'reconnecting');

    function handleConnect() {
      setStatus('connected');
    }
    function handleDisconnect(reason) {
      // 'io client disconnect' means we called disconnect() ourselves
      // (e.g. on logout) - not a connectivity problem worth surfacing.
      setStatus(reason === 'io client disconnect' ? 'connected' : 'reconnecting');
    }
    function handleReconnectFailed() {
      setStatus('offline');
    }
    // Also fires for the retry loop a manual reconnect starts, so the banner
    // reads "Reconnecting" while it runs and "Connection lost" again if it fails.
    function handleReconnectAttempt() {
      setStatus('reconnecting');
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.io.on('reconnect_failed', handleReconnectFailed);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.io.off('reconnect_failed', handleReconnectFailed);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
    };
  }, [isAuthenticated]);

  return status;
}
