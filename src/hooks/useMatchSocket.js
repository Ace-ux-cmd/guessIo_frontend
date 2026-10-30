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

  useEffect(() => {
    // Actions are stable, so read them once. Subscribing to the whole store here
    // would re-render the host screen on every single match event.
    const store = useMatchStore.getState();
    connectSocket();
    const socket = getSocket();

    const bindings = {
      'match.found': (env) => {
        store.onMatchFound(env.payload);
        // Replace, never push: leaving /matchmaking or /private-room underneath the
        // match would let Back from the results land there and re-queue the player.
        navigate('/gameplay', { replace: true });
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
      'skill.lobby': (env) => store.onSkillLobby(env.payload),
      'skill.lobby.closed': () => store.onSkillLobbyClosed(),
      'skill.assigned': (env) => store.onSkillAssigned(env.payload),
      'skill.result': (env) => store.onSkillResult(env.payload),
      'skill.xray': (env) => store.onSkillXray(env.payload),
      'skill.frozen': () => store.onSkillFrozen(),
      'skill.monitored': () => store.onSkillMonitored(),
      'skill.rejected': (env) => store.onSkillRejected(env.payload),
    };

    const bound = Object.entries(bindings).map(([event, handler]) => {
      if (event === 'match.found') return [event, handler];
      return [event, (env) => {
        const activeMatchId = useMatchStore.getState().matchId;
        if (env.matchId) {
          // An event from another match is stale. With no match in the store (it was
          // just reset) every match event is stale too, except a snapshot, which is
          // how a refreshed tab learns about its match.
          if (activeMatchId ? env.matchId !== activeMatchId : event !== 'match.snapshot') return;
        }
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
