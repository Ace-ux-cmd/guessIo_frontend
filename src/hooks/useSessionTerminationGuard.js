import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { getSocket, connectSocket, disconnectSocket } from '../sockets/socketClient';

/**
 * Enforces "only one active session per account" on the client side: while
 * authenticated, keeps a socket connection alive purely to receive
 * `session:terminated` (pushed by the server the instant another login
 * rotates this account's session - see backend/src/realtime/socketServer.js).
 * On receipt, clears the local session and stashes the server's message so
 * the next Login render can explain why the user landed there.
 *
 * Mount this once, near the root of the authenticated app shell.
 */
export function useSessionTerminationGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    connectSocket();
    const socket = getSocket();

    function handleTerminated(payload) {
      clearSession(payload?.message || 'You were signed out because this account was logged in elsewhere.');
      disconnectSocket();
    }

    // The session is kept on purpose: the suspended/banned screens use it to
    // authenticate the appeal form (same reasoning as api/client.js).
    function handleRestricted(payload) {
      const target = payload?.status === 'BANNED' ? '/error/banned' : '/error/suspended';
      disconnectSocket();
      if (window.location.pathname !== target) window.location.assign(target);
    }

    socket.on('session:terminated', handleTerminated);
    socket.on('account:restricted', handleRestricted);
    return () => {
      socket.off('session:terminated', handleTerminated);
      socket.off('account:restricted', handleRestricted);
    };
  }, [isAuthenticated, clearSession]);
}
