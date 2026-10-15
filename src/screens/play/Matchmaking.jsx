import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';
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

  useEffect(() => {
    // Back-navigation can land here while a match is already running; joining
    // the queue again would pull the player out of it, so go back to the match.
    if (matchInProgress) {
      navigate('/gameplay', { replace: true });
      return undefined;
    }
    // Reset to 1 (just me) before joining, in case a previous queue attempt
    // in this session left a stale count in the store.
    joinQueue();
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      clearInterval(interval);
      if (status !== 'FOUND') emit('queue.leave');
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
      <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col px-5 pt-6 pb-8">
        <p className="text-mute text-sm">{matchTypeLabel(matchType)}, {playerCount} players, {difficulty === 'HARDCORE' ? 'Hardcore' : 'Standard'}</p>
        <h1 className="mt-1 text-3xl font-bold">{found ? 'Match found' : 'Finding players'}</h1>
        <p className="mt-1 text-sm text-mute" role="status">
          {open ? `Waiting for ${open} more player${open > 1 ? 's' : ''}` : 'Everyone is in'}
        </p>

        {rejection && <div className="mt-4"><Banner variant="error">{rejection.message}</Banner></div>}

        <div className="mt-8 space-y-3">
          {seats.map((seat, i) => {
            const searching = seat.state === 'searching';
            const name = seat.state === 'me' ? myName : seat.player?.username || 'Player';
            const avatarUrl = seat.state === 'me' ? user?.avatarUrl : seat.player?.avatarUrl;
            return (
              <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${searching ? 'border-dashed border-line' : 'border-g bg-s2'}`}>
                {searching
                  ? <span className="w-10 h-10 rounded-full border-2 border-line border-t-g animate-spin" aria-hidden="true" />
                  : <Avatar name={name} size={40} url={avatarUrl} />}
                <span className={`flex-1 font-semibold truncate ${searching ? 'text-mute' : ''}`}>{searching ? 'Open seat' : name}</span>
                <span className={`text-sm font-semibold ${searching ? 'text-mute' : 'text-g'}`}>
                  {searching ? 'Searching' : seat.state === 'me' ? 'Ready' : 'Joined'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-auto text-center pt-8">
          <div className="font-display font-black text-3xl tnum">{formatElapsed(elapsed)}</div>
          <p className="text-sm text-mute mt-1">Usually 10 to 30 seconds</p>
          <button type="button" onClick={cancel} className="mt-5 block w-full h-12 rounded-lg border border-line font-semibold">Cancel</button>
        </div>
      </main>
      <ReconnectModal open={reconnectGate.exhausted} onRetry={reconnectGate.retry} />
      <ActiveMatchDialog open={Boolean(staleMatchId)} onResume={resumeStaleMatch} onAbandon={abandonStaleMatch} />
    </>
  );
}
