import { useEffect, useState } from 'react';
import { getSocket, connectSocket, emit } from '../sockets/socketClient';
import { useMatchStore, readPersistedMatchId } from '../stores/matchStore';

// How long to wait after a hard refresh for the server to answer
// match.reconnect before giving up and showing "No active match". Generous
// on purpose: a slow connection answering late beats abandoning a match
// that is still running.
const RECONNECT_RESPONSE_TIMEOUT_MS = 8000;

// While a match is live, re-ask the server for its state this often. Socket
// events are fire-and-forget: a device that missed one (backgrounded phone,
// brief radio drop) would otherwise sit on a stale round or turn until the
// next event happened to arrive, and two devices in one match would disagree.
const RESYNC_INTERVAL_MS = 10_000;
const LIVE_STATUSES = ['FOUND', 'STARTING', 'ACTIVE', 'ROUND_ENDED'];

/**
 * Keeps the client in step with the server's copy of the match. Two cases:
 *
 * 1. Hard refresh. The store is empty (Gameplay.jsx would show "No active
 *    match") but a matchId was persisted by matchStore.js. The server is
 *    asked for a snapshot, which rebuilds the whole screen.
 *
 * 2. Network blip. socket.io reconnects on its own, but the new connection
 *    has not joined the match room and has missed every event in between,
 *    so the board would silently freeze. A snapshot is requested on every
 *    socket 'connect' to catch up.
 *
 * The server answers with match.snapshot (applied to the store, whatever
 * state the match is in, including already finished) or MATCH_NOT_FOUND
 * once the match is gone for good, which clears the persisted id.
 *
 * Returns a status Gameplay.jsx renders around:
 *   'skip'         - nothing to wait on.
 *   'reconnecting' - refresh in flight; show a loading state instead of
 *                     flashing "No active match".
 *   'failed'       - the server said the match is gone, or never answered
 *                     in time. A late snapshot still takes over, because
 *                     Gameplay.jsx renders off store.matchId first.
 */
export function useMatchReconnect() {
  const [status, setStatus] = useState(() =>
    useMatchStore.getState().matchId ? 'skip' : readPersistedMatchId() ? 'reconnecting' : 'skip'
  );

  useEffect(() => {
    const socket = getSocket();
    const resumingAfterRefresh = !useMatchStore.getState().matchId && Boolean(readPersistedMatchId());
    let timeoutId = null;

    function currentMatchId() {
      return useMatchStore.getState().matchId || readPersistedMatchId();
    }

    function requestSnapshot() {
      const matchId = currentMatchId();
      if (matchId) emit('match.reconnect', { matchId });
    }

    function onSnapshot(env) {
      if (env.matchId !== currentMatchId()) return;
      clearTimeout(timeoutId);
      useMatchStore.getState().applySnapshot(env.payload);
    }

    function onRejected(env) {
      if (env.payload?.code !== 'MATCH_NOT_FOUND' || env.matchId !== currentMatchId()) return;
      clearTimeout(timeoutId);
      useMatchStore.getState().reset();
      setStatus('failed');
    }

    function resyncIfLive() {
      const { matchId, status: matchStatus } = useMatchStore.getState();
      if (!matchId || !LIVE_STATUSES.includes(matchStatus)) return;
      if (socket.connected) requestSnapshot();
      else connectSocket();
    }

    // A backgrounded tab or a network change can leave the socket dead without
    // the client giving up cleanly; coming back to the foreground or online
    // is the moment to reconnect and catch up.
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') resyncIfLive();
    }
    const resyncTimer = setInterval(resyncIfLive, RESYNC_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', resyncIfLive);

    socket.on('connect', requestSnapshot);
    socket.on('match.snapshot', onSnapshot);
    socket.on('guess.rejected', onRejected);

    if (resumingAfterRefresh) {
      timeoutId = setTimeout(() => setStatus('failed'), RECONNECT_RESPONSE_TIMEOUT_MS);
      if (socket.connected) requestSnapshot();
    }
    // When not yet connected, the 'connect' listener above sends the request.
    connectSocket();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(resyncTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', resyncIfLive);
      socket.off('connect', requestSnapshot);
      socket.off('match.snapshot', onSnapshot);
      socket.off('guess.rejected', onRejected);
    };
  }, []);

  return status;
}
