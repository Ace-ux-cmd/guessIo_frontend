import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import Tile from '../../components/ui/Tile';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import { Banner } from '../../components/ui/Feedback';
import ReconnectModal from '../../components/ui/ReconnectModal';
import { emit, getSocket, connectSocket } from '../../sockets/socketClient';
import { useMatchSocket } from '../../hooks/useMatchSocket';
import { useReconnectGate } from '../../hooks/useReconnectGate';
import { useAuthStore } from '../../stores/authStore';

const CHIP = 'inline-flex items-center h-6 px-2 rounded text-xs font-semibold border text-mute border-line';

export default function PrivateRoom() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialDifficulty = params.get('difficulty') || 'STANDARD';
  const initialPlayerCount = Number(params.get('playerCount')) || 2;

  const user = useAuthStore((s) => s.user);
  const [room, setRoom] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useMatchSocket();
  const reconnectGate = useReconnectGate();

  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    const onPlayerJoined = (env) => setRoom(env.payload.room);
    // Server sends the full post-departure room (including any host
    // migration) on both an explicit room.leave and a disconnect-triggered
    // removal, so the client just adopts it.
    const onPlayerLeft = (env) => setRoom(env.payload.room);
    const onRejected = (env) => setError(env.payload.message);

    socket.on('room.playerJoined', onPlayerJoined);
    socket.on('room.playerLeft', onPlayerLeft);
    socket.on('guess.rejected', onRejected);
    return () => {
      socket.off('room.playerJoined', onPlayerJoined);
      socket.off('room.playerLeft', onPlayerLeft);
      socket.off('guess.rejected', onRejected);
    };
  }, []);

  function createRoom() {
    setError(null);
    emit('room.create', { playerCount: initialPlayerCount, difficulty: initialDifficulty });
  }

  function joinRoom() {
    setError(null);
    emit('room.join', { roomCode: joinCode.trim().toUpperCase() });
  }

  function leaveRoom() {
    if (room) emit('room.leave', { roomId: room.roomId });
    setRoom(null);
  }

  function back() {
    if (room) leaveRoom();
    navigate('/play', { replace: true });
  }

  function startMatch() {
    if (room) emit('match.start', { roomId: room.roomId });
  }

  function copyCode() {
    if (!room) return;
    navigator.clipboard?.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const isHost = room && user && room.hostUserId === user.id;
  const full = room && room.players.length === room.playerCount;

  const header = (
    <header className="flex items-center gap-1 px-4 pt-5 pb-3">
      <button type="button" onClick={back} className="p-2 text-mute" aria-label={room ? 'Leave room' : 'Back'}><Icon name="back" /></button>
      <h1 className="text-xl font-bold flex-1">Private room</h1>
    </header>
  );

  if (!room) {
    return (
      <>
        <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col pb-6">
          {header}
          <section className="px-5 mt-3 space-y-4">
            {error && <Banner variant="error">{error}</Banner>}
            <div className="rounded-md bg-s1 border border-line p-5">
              <h2 className="font-bold">Create a room</h2>
              <p className="text-sm text-mute mt-1">{initialPlayerCount} players, {initialDifficulty === 'HARDCORE' ? 'Hardcore' : 'Standard'}. Share the code with friends.</p>
              <div className="mt-4"><Button onClick={createRoom}>Create room</Button></div>
            </div>
            <div className="rounded-md bg-s1 border border-line p-5">
              <label htmlFor="roomCode" className="font-bold block">Join with a code</label>
              <input
                id="roomCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Room code"
                autoComplete="off"
                className="mt-3 w-full h-12 px-4 rounded-md bg-bg border border-line text-ink placeholder:text-mute focus:border-g outline-none uppercase tracking-widest"
              />
              <div className="mt-3"><Button variant="outline" onClick={joinRoom} disabled={!joinCode.trim()}>Join room</Button></div>
            </div>
          </section>
        </main>
        <ReconnectModal open={reconnectGate.exhausted} onRetry={reconnectGate.retry} />
      </>
    );
  }

  const emptySeats = Math.max(0, room.playerCount - room.players.length);

  return (
    <>
      <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col pb-6">
        {header}
        {error && <div className="px-5 mt-1"><Banner variant="error">{error}</Banner></div>}

        <section className="px-5 mt-3">
          <div className="rounded-md bg-s1 border border-line p-5 text-center">
            <div className="text-sm text-mute">Room code</div>
            <div className="mt-3 flex justify-center gap-2" role="img" aria-label={`Room code ${[...room.roomCode].join(' ')}`}>
              {[...room.roomCode].map((c, i) => <Tile key={i} state="raw" size="w-14 h-14 text-3xl">{c}</Tile>)}
            </div>
            <button type="button" onClick={copyCode} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-ink border border-line rounded-md px-3 h-9">
              <Icon name={copied ? 'check' : 'copy'} className="w-4 h-4" />{copied ? 'Copied' : 'Copy code'}
            </button>
            <p className="mt-4 text-sm text-mute tnum">{room.players.length} of {room.playerCount} players joined</p>
          </div>
        </section>

        <section className="px-5 mt-6">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-bold">Players</h2>
            <span className="text-sm text-mute tnum">{room.players.length} of {room.playerCount}</span>
          </div>
          <div className="space-y-2">
            {room.players.map((p) => (
              <div key={p.userId} className="flex items-center gap-3 rounded-md bg-s1 p-3">
                <Avatar name={p.username} size={40} url={p.avatarUrl} />
                <div className="flex-1 font-semibold">{p.username}</div>
                {p.userId === room.hostUserId && (
                  <span className="inline-flex items-center h-6 px-2 rounded text-xs font-semibold border text-g border-g bg-s2">Host</span>
                )}
              </div>
            ))}
            {Array.from({ length: emptySeats }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-3 rounded-md border border-dashed border-line p-3 text-mute">
                <span className="w-10 h-10 rounded-md bg-s2" />Waiting for a player<span className="animate-blink">...</span>
              </div>
            ))}
          </div>
        </section>

        <section className="px-5 mt-6">
          <h2 className="font-bold mb-2">Settings</h2>
          <div className="flex flex-wrap gap-2">
            <span className={CHIP}>{room.playerCount} players</span>
            <span className={CHIP}>{room.difficulty === 'HARDCORE' ? 'Hardcore' : 'Standard'}</span>
            <span className={CHIP}>Casual</span>
          </div>
          <p className="mt-2 text-xs text-mute">Fixed when the room was created.</p>
        </section>

        <div className="mt-auto px-5 pt-8 space-y-2">
          {isHost ? (
            <>
              <Button onClick={startMatch} disabled={!full}>Start match</Button>
              <p className="text-center text-xs text-mute">{full ? 'Everyone is in. Start when ready.' : 'Waiting for all players to join.'}</p>
            </>
          ) : (
            <p className="text-center text-xs text-mute">Only the host can start the match.</p>
          )}
        </div>
      </main>
      <ReconnectModal open={reconnectGate.exhausted} onRetry={reconnectGate.retry} />
    </>
  );
}
