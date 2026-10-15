import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, emit } from '../sockets/socketClient';
import { useMatchStore } from '../stores/matchStore';

/**
 * Asks the server, every time the calling screen mounts and again after each
 * socket reconnect, whether this player is still seated in a live match. A
 * player who dropped mid-match would otherwise only find out by opening the
 * play screen, by which time the 60 second forfeit window may have run out.
 *
 * `matchId` is the live match to prompt about, or null when there is none.
 * resume() rejoins it and navigates to /gameplay once the server's snapshot
 * has been applied to the store. abandon() forfeits it.
 */
export function useActiveMatchCheck() {
  const navigate = useNavigate();
  const [matchId, setMatchId] = useState(null);
  const resumingMatchId = useRef(null);

  useEffect(() => {
    const socket = connectSocket();

    function check() {
      emit('match.checkActive');
    }
    function onActive(env) {
      setMatchId(env.payload.matchId);
    }
    function onSnapshot(env) {
      if (!resumingMatchId.current || env.matchId !== resumingMatchId.current) return;
      resumingMatchId.current = null;
      useMatchStore.getState().applySnapshot(env.payload);
      navigate('/gameplay', { replace: true });
    }
    // The match ended between the check and the tap on Reconnect.
    function onRejected(env) {
      if (env.payload?.code !== 'MATCH_NOT_FOUND' || env.matchId !== resumingMatchId.current) return;
      resumingMatchId.current = null;
      setMatchId(null);
    }

    socket.on('connect', check);
    socket.on('match.active', onActive);
    socket.on('match.snapshot', onSnapshot);
    socket.on('guess.rejected', onRejected);
    if (socket.connected) check();

    return () => {
      socket.off('connect', check);
      socket.off('match.active', onActive);
      socket.off('match.snapshot', onSnapshot);
      socket.off('guess.rejected', onRejected);
    };
  }, [navigate]);

  const resume = useCallback(() => {
    resumingMatchId.current = matchId;
    emit('match.reconnect', { matchId });
  }, [matchId]);

  const abandon = useCallback(() => {
    emit('match.forfeit', { matchId });
    useMatchStore.getState().reset();
    setMatchId(null);
  }, [matchId]);

  return { matchId, resume, abandon };
}
