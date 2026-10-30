import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Feedback';
import ActiveMatchDialog from '../../components/ui/ActiveMatchDialog';
import ReconnectModal from '../../components/ui/ReconnectModal';
import { emit, getSocket } from '../../sockets/socketClient';
import { useMatchSocket } from '../../hooks/useMatchSocket';
import { useReconnectGate } from '../../hooks/useReconnectGate';
import { useMatchStore } from '../../stores/matchStore';
import { useAuthStore } from '../../stores/authStore';
import { matchTypeLabel } from '../../lib/format';

function formatElapsed(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function Matchmaking() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [elapsed, setElapsed] = useState(0);
  const [staleMatchId, setStaleMatchId] = useState(null);
  const status = useMatchStore((s) => s.status);
  const playersWaiting = useMatchStore((s) => s.queuePlayersWaiting);
  const setQueuePlayersWaiting = useMatchStore((s) => s.onQueueProgress);
  const queuePlayers = useMatchStore((s) => s.queuePlayers);
  const matchId = useMatchStore((s) => s.matchId);
  const rejection = useMatchStore((s) => s.lastRejection);
  const user = useAuthStore((s) => s.user);
  const matchInProgress = Boolean(matchId) && ['FOUND', 'STARTING', 'ACTIVE', 'ROUND_ENDED'].includes(status);

  const matchType = params.get('matchType');
  const difficulty = params.get('difficulty');
  const playerCount = Number(params.get('playerCount'));

  useMatchSocket();
  const reconnectGate = useReconnectGate();

  // Joining the queue takes a deliberate tap on Start in Play, which navigates here
  // with queueIntent. Reaching this URL any other way (Back, Forward, a refresh, a
  // bookmark) must never put the player in a queue, so it goes to /play instead.
  const queueIntent = useRef(location.state?.queueIntent === true);
  const joinedRef = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    // Back-navigation can land here while a match is already running; joining
    // the queue again would pull the player out of it, so go back to the match.
    if (matchInProgress) {
      navigate('/gameplay', { replace: true });
      return undefined;
    }
    if (!queueIntent.current) {
      navigate('/play', { replace: true });
      return undefined;
    }
    // Use the permission up: this history entry can no longer queue anyone, even if
    // it is reached again later.
    navigate(`${location.pathname}${location.search}`, { replace: true, state: { queueIntent: false } });
    // Reset to 1 (just me) before joining, in case a previous queue attempt
    // in this session left a stale count in the store.
    joinedRef.current = true;
    joinQueue();
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      clearInterval(interval);
      // statusRef, not status: the closure above would still hold the status from the
      // first render and always ask to leave, even right after a match was found.
      if (joinedRef.current && statusRef.current !== 'FOUND') emit('queue.leave');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function joinQueue() {
    useMatchStore.setState({ lastRejection: null });
    setQueuePlayersWaiting({ playersWaiting: 1 });
    emit('queue.join', { matchType, difficulty, playerCount });
  }

  // The server still seats this player in a match the client never heard
  // about (they left while the pairing was completing, so match.found was
  // missed). The rejection's envelope carries that match's id.
  useEffect(() => {
    const socket = getSocket();
    function onRejected(env) {
      const code = env.payload?.code;
      if (code === 'ALREADY_IN_MATCH' && env.matchId) setStaleMatchId(env.matchId);
      // The match ended while the prompt was open: nothing left to resume.
      if (code === 'MATCH_NOT_FOUND' && env.matchId === staleMatchId) {
        setStaleMatchId(null);
        joinQueue();
      }
    }
    socket.on('guess.rejected', onRejected);
    return () => socket.off('guess.rejected', onRejected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staleMatchId]);

  // Reconnecting is answered with a match.snapshot, which useMatchSocket
  // applies to the store; that is the signal to enter the match.
  useEffect(() => {
    if (staleMatchId && matchInProgress) navigate('/gameplay', { replace: true });
  }, [staleMatchId, matchInProgress, navigate]);

  function resumeStaleMatch() {
    emit('match.reconnect', { matchId: staleMatchId });
  }

  // match.forfeit and queue.join travel on the same socket and the server
  // handles them in order, so the seat is already released when the join runs.
  function abandonStaleMatch() {
    emit('match.forfeit', { matchId: staleMatchId });
    setStaleMatchId(null);
    joinQueue();
  }

  function cancel() {
    emit('queue.leave');
    navigate('/play', { replace: true });
  }

  const joined = Math.min(playersWaiting || 1, playerCount || 1);
  const open = Math.max(0, (playerCount || 1) - joined);
  const found = status === 'FOUND';
  const myName = user?.displayName || user?.username || 'You';

  // Nothing to show while the redirect above runs.
  if (!queueIntent.current && !matchInProgress) return null;

  // Seats are filled from the live queue count. The server reports how many
  // players are waiting, not who they are, so other seats show no names.
  const others = queuePlayers.filter((p) => p.userId !== user?.id);
  const seats = Array.from({ length: playerCount || 1 }, (_, i) => {
    if (i === 0) return { state: 'me' };
    if (i < joined) return { state: 'joined', player: others[i - 1] };
    return { state: 'searching' };
  });

  return (
    <>
      <main className="app">
        <header className="topbar">
          <button type="button" onClick={cancel} className="back" aria-label="Leave matchmaking">&larr;</button>
          <div className="header-copy"><p className="eyebrow">Matchmaking</p></div>
        </header>

        <div className="content matchmaking-variant">
          <section className="queue-hero" aria-live="polite">
            <div className="signal" aria-hidden="true">&#x2301;</div>
            <h1>{found ? 'Match found' : 'Finding opponents'}</h1>
            <p role="status">{open ? `Waiting for ${open} more player${open > 1 ? 's' : ''}` : 'Everyone is in'}</p>
            <div className="setup-summary matchmaking-variant">
              <span className="chip">{matchTypeLabel(matchType)}</span>
              <span className="chip">{playerCount} players</span>
              <span className="chip">{difficulty === 'HARDCORE' ? 'Hardcore' : 'Standard'}</span>
            </div>
          </section>

          {rejection && <div className="mt-4"><Banner variant="error">{rejection.message}</Banner></div>}

          <section className="section" aria-labelledby="players-title">
            <div className="section-heading">
              <h2 id="players-title">Players in queue</h2>
              <span>{joined} / {playerCount || 1} found</span>
            </div>
            <div className="players">
              {seats.map((seat, i) => {
                const searching = seat.state === 'searching';
                const name = seat.state === 'me' ? myName : seat.player?.username || 'Searching...';
                const initial = searching ? '?' : (name || '?').charAt(0).toUpperCase();
                return (
                  <article key={i} className={`player matchmaking-variant${seat.state === 'me' ? ' you' : ''}`}>
                    <span className="avatar">{initial}</span>
                    <div className="player-info">
                      <strong>{name}</strong>
                      <span>{seat.state === 'me' ? 'You · Ready' : searching ? 'Open seat' : 'Ready to crack'}</span>
                    </div>
                    <span className="player-skill is-waiting">{searching ? '-' : 'Waiting'}</span>
                  </article>
                );
              })}
            </div>
          </section>

          <div className="mt-6 text-center">
            <p className="font-display text-3xl font-bold tnum">{formatElapsed(elapsed)}</p>
          </div>

          <button type="button" onClick={cancel} className="cancel">Cancel search</button>
        </div>
      </main>
      <ReconnectModal open={reconnectGate.exhausted} onRetry={reconnectGate.retry} />
      <ActiveMatchDialog open={Boolean(staleMatchId)} onResume={resumeStaleMatch} onAbandon={abandonStaleMatch} />
    </>
  );
}
