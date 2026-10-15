import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket, connectSocket } from '../sockets/socketClient';
import { useMatchStore } from '../stores/matchStore';

/**
 * Connects the socket (if needed) and wires every server -> client match
 * event (API contract §3.3) into the match store for the lifetime of the
 * mounting component. Also handles the FOUND -> gameplay screen redirect.
 */
export function useMatchSocket() {
  const navigate = useNavigate();
  const store = useMatchStore();

  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    const bindings = {
      'match.found': (env) => {
        store.onMatchFound(env.payload);
        navigate('/gameplay');
      },
      'queue.progress': (env) => store.onQueueProgress(env.payload),
      'match.starting': (env) => store.onMatchStarting(env.payload),
      'round.started': (env) => store.onRoundStarted(env.payload),
      'turn.started': (env) => store.onTurnStarted(env.payload),
      'turn.expired': (env) => store.onTurnExpired(env.payload),
      'guess.accepted': (env) => store.onGuessAccepted(env.payload),
      'guess.feedback': (env) => store.onGuessFeedback(env.payload),
      'guess.rejected': (env) => store.onGuessRejected(env.payload),
      'match.inactivityWarning': (env) => store.onInactivityWarning(env.payload),
      'round.ended': (env) => store.onRoundEnded(env.payload),
      'match.ended': (env) => store.onMatchEnded(env.payload),
      'match.cancelled': (env) => store.onMatchCancelled(env.payload),
      'player.disconnected': (env) => store.onPlayerDisconnected(env.payload),
      'player.reconnected': (env) => store.onPlayerReconnected(env.payload),
      'match.snapshot': (env) => store.applySnapshot(env.payload),
    };

    const bound = Object.entries(bindings).map(([event, handler]) => {
      if (event === 'match.found') return [event, handler];
      return [event, (env) => {
        const activeMatchId = useMatchStore.getState().matchId;
        if (env.matchId && activeMatchId && env.matchId !== activeMatchId) return;
        handler(env);
      }];
    });

    for (const [event, handler] of bound) {
      socket.on(event, handler);
    }
    return () => {
      for (const [event, handler] of bound) {
        socket.off(event, handler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
