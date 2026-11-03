import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import Avatar from '../../components/ui/Avatar';
import { Banner } from '../../components/ui/Feedback';
import Toggle from '../../components/ui/Toggle';
import { SKILL_INFO, SKILL_ORDER, skillName } from '../../constants/skills';
import ReconnectModal from '../../components/ui/ReconnectModal';
import { emit, getSocket, connectSocket } from '../../sockets/socketClient';
import { useMatchSocket } from '../../hooks/useMatchSocket';
import { useReconnectGate } from '../../hooks/useReconnectGate';
import { useAuthStore } from '../../stores/authStore';
import { useFeatures } from '../../hooks/useFeatures';
import { useSecondsLeft } from '../../hooks/useSecondsLeft';

// What the host is told when an invite could not be sent. Not friends and blocked share the generic text on purpose.
export function inviteNotSentText(reason, name) {
  switch (reason) {
    case 'OFFLINE': return `${name} is offline. Share the room code instead.`;
    case 'BUSY': return `${name} is in a match.`;
    case 'RATE_LIMITED': return `You invited ${name} a moment ago. Try again shortly.`;
    default: return `Could not invite ${name}.`;
  }
}

/** K7M42Q -> K7M-42Q. Display only; the server always works with the plain code. */
const formatCode = (code) => (code.length > 3 ? `${code.slice(0, 3)}-${code.slice(3)}` : code);
/** Keeps letters and digits only, upper-cased, so a pasted "k7m-42q" joins like the plain code. */
const cleanCode = (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

export default function PrivateRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  // From Friends > Challenge: who to invite. From an accepted invite: the room to join.
  const invite = location.state?.invite ?? null;
  const joinInvite = location.state?.joinInvite ?? null;
  const [inviteState, setInviteState] = useState(null); // { status: 'sent'|'declined'|'expired'|'not_sent', inviteId, expiresAt, reason }
  const inviteLeft = useSecondsLeft(inviteState?.status === 'sent' ? inviteState.expiresAt : null);
  const initialDifficulty = params.get('difficulty') || 'STANDARD';
  const initialPlayerCount = Number(params.get('playerCount')) || 2;

  const user = useAuthStore((s) => s.user);
  const [room, setRoom] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [skillsOn, setSkillsOn] = useState(true);
  const { skills: skillsAvailable } = useFeatures();

  useMatchSocket();
  const reconnectGate = useReconnectGate();

  // The latest room, readable from socket callbacks and the unmount cleanup
  // without re-subscribing. Kept in step with `room` by adoptRoom().
  const roomRef = useRef(null);
  // Set once the server has launched the match; the room is gone by then, so
  // there is nothing to leave.
  const launchedRef = useRef(false);
  // True while a room.join sent after a reconnect is awaiting its answer.
  const resumingRef = useRef(false);
  const joinedFromInviteRef = useRef(false);

  function adoptRoom(next) {
    roomRef.current = next;
    setRoom(next);
  }

  useEffect(() => {
    connectSocket();
    const socket = getSocket();
    let hasConnectedBefore = socket.connected;

    const onPlayerJoined = (env) => {
      resumingRef.current = false;
      adoptRoom(env.payload.room);
    };
    // Server sends the full post-departure room (including any host
    // migration) on both an explicit room.leave and a disconnect-triggered
    // removal, so the client just adopts it.
    const onPlayerLeft = (env) => adoptRoom(env.payload.room);
    const onRoomUpdated = (env) => adoptRoom(env.payload.room);
    const onMatchFound = () => { launchedRef.current = true; };
    const onInviteResult = (env) => {
      const p = env.payload;
      setInviteState(p.sent ? { status: 'sent', inviteId: p.inviteId, expiresAt: p.expiresAt } : { status: 'not_sent', reason: p.reason });
    };
    const onInviteDeclined = () => setInviteState((cur) => (cur?.status === 'sent' ? { ...cur, status: 'declined' } : cur));
    const onRejected = (env) => {
      const { code, message } = env.payload;
      // The reconnect resume below was refused: the 10 second seat hold ran
      // out (or the room is gone), so drop the stale room instead of showing
      // a lobby this player no longer belongs to.
      if (resumingRef.current && ['ROOM_NOT_FOUND', 'ROOM_FULL', 'ROOM_NOT_JOINABLE'].includes(code)) {
        resumingRef.current = false;
        adoptRoom(null);
        setError('You were disconnected for too long and were removed from the room.');
        return;
      }
      setError(message);
    };
    // After an automatic reconnect the server normally hands the seat straight
    // back (room.playerJoined). Re-sending room.join covers the case where it
    // could not, and is a harmless resume when it did.
    const onConnect = () => {
      if (hasConnectedBefore && roomRef.current && !launchedRef.current) {
        resumingRef.current = true;
        emit('room.join', { roomCode: roomRef.current.roomCode });
      }
      hasConnectedBefore = true;
    };

    socket.on('room.playerJoined', onPlayerJoined);
    socket.on('room.playerLeft', onPlayerLeft);
    socket.on('room.updated', onRoomUpdated);
    socket.on('match.found', onMatchFound);
    socket.on('room.inviteResult', onInviteResult);
    socket.on('room.inviteDeclined', onInviteDeclined);
    socket.on('guess.rejected', onRejected);
    socket.on('connect', onConnect);
    // Arrived by accepting an invite: join by code, with the invite id so the server can refuse a stale one.
    if (joinInvite && !joinedFromInviteRef.current) {
      joinedFromInviteRef.current = true;
      emit('room.join', { roomCode: joinInvite.roomCode, inviteId: joinInvite.inviteId });
    }
    return () => {
      socket.off('room.inviteResult', onInviteResult);
      socket.off('room.inviteDeclined', onInviteDeclined);
      socket.off('room.playerJoined', onPlayerJoined);
      socket.off('room.playerLeft', onPlayerLeft);
      socket.off('room.updated', onRoomUpdated);
      socket.off('match.found', onMatchFound);
      socket.off('guess.rejected', onRejected);
      socket.off('connect', onConnect);
      // Leaving this screen by any route (back, dashboard, a link) must free
      // the seat. Otherwise the server keeps it and the player is later told
      // they are "already in a room". Backgrounding the app does not unmount
      // this screen, so a short switch to WhatsApp keeps the seat.
      if (roomRef.current && !launchedRef.current) {
        emit('room.leave', { roomId: roomRef.current.roomId });
        roomRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function createRoom() {
    setError(null);
    setInviteState(null);
    emit('room.create', {
      playerCount: initialPlayerCount,
      difficulty: initialDifficulty,
      skills: skillsAvailable && skillsOn,
      ...(invite?.userId ? { inviteUserId: invite.userId } : {}),
    });
  }

  function joinRoom() {
    setError(null);
    emit('room.join', { roomCode: cleanCode(joinCode) });
  }

  function leaveRoom() {
    if (room) emit('room.leave', { roomId: room.roomId });
    adoptRoom(null);
  }

  function back() {
    if (room) leaveRoom();
    navigate('/play', { replace: true });
  }

  function nextRoomStep() {
    if (!room) return;
    setError(null);
    if (room.skills && !room.skillSelectionOpen) emit('room.skills.open', { roomId: room.roomId });
    else emit('match.start', { roomId: room.roomId });
  }

  function chooseSkill(skill) {
    if (room?.skillSelectionOpen) emit('room.skill.pick', { roomId: room.roomId, skill });
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Copy is not available here. Select the code and copy it by hand.');
    }
  }

  const isHost = room && user && room.hostUserId === user.id;
  const full = room && room.players.length === room.playerCount;
  const skillPicks = room?.skillPicks || {};
  const skillsReady = !room?.skills || room.players.every((p) => Boolean(skillPicks[p.userId]));

  if (!room) {
    const joinReady = cleanCode(joinCode).length === 6;
    return (
      <>
        <main className="app" style={{ display: 'flex', flexDirection: 'column' }}>
          <header className="topbar">
            <button type="button" onClick={back} className="back" aria-label="Back to match setup">&larr;</button>
            <div className="header-copy"><p className="eyebrow">Custom room</p></div>
          </header>

          <section className="content" style={{ textAlign: 'center' }}>
            <div className="room-mark" aria-hidden="true"><Icon name="settings" className="w-5 h-5" /></div>
            <h1>{invite ? `Challenge ${invite.name}` : 'Build your room'}</h1>
            <p className="intro">{invite ? `${invite.name} gets an invite as soon as you create the room. You can also share the room code.` : 'Invite your crew with a private code, or join a room someone has already created.'}</p>

            {error && <div className="mt-4" style={{ textAlign: 'left' }}><Banner variant="error">{error}</Banner></div>}

            <section className="room-card" aria-labelledby="create-room-title">
              <p className="card-label" id="create-room-title">Your setup</p>
              <div className="setup-summary" aria-label="Selected play setup">
                <span className="chip">Custom</span>
                <span className="chip">{initialPlayerCount} players</span>
                <span className="chip">{initialDifficulty === 'HARDCORE' ? 'Hardcore' : 'Standard'}</span>
              </div>
              {skillsAvailable && (
                <Toggle
                  variant="custom-room"
                  label="Skill power-ups"
                  description="Give each player access to tactical abilities during the match."
                  checked={skillsOn}
                  onChange={setSkillsOn}
                />
              )}
            </section>

            <div className="join-divider">Have a code?</div>

            <div className="join-panel">
              <label id="join-title" htmlFor="join-code">Enter a room code</label>
              <form className="join-row" onSubmit={(e) => { e.preventDefault(); if (joinReady) joinRoom(); }}>
                <input
                  className="join-input"
                  id="join-code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(formatCode(cleanCode(e.target.value).slice(0, 6)))}
                  maxLength={7}
                  placeholder="ABC-123"
                  autoComplete="off"
                  autoCapitalize="characters"
                  aria-describedby="room-status"
                />
                <button type="submit" className="join-button" disabled={!joinReady}>Join room</button>
              </form>
              <p className="room-status" id="room-status" role="status">Room codes are 6 characters.</p>
            </div>

            <button type="button" onClick={createRoom} className="create-button">{invite ? 'Create room and invite' : 'Create room'} <span aria-hidden="true">&rarr;</span></button>
          </section>
        </main>
        <ReconnectModal open={reconnectGate.exhausted} onRetry={reconnectGate.retry} />
      </>
    );
  }

  const emptySeats = Math.max(0, room.playerCount - room.players.length);
  const displayCode = formatCode(room.roomCode);

  return (
    <>
      <main className="app">
        <header className="topbar">
          <button type="button" onClick={back} className="back" aria-label="Leave room">&larr;</button>
          <div className="header-copy"><p className="eyebrow">Waiting room</p></div>
        </header>

        <div className="content">
          {error && <div className="mb-4"><Banner variant="error">{error}</Banner></div>}

          {invite && room.players.length < room.playerCount && inviteState && (
            <div className="mb-4" role="status" aria-live="polite" data-testid="invite-status">
              {inviteState.status === 'sent' && inviteLeft > 0 && (
                <Banner variant="info">Invite sent to {invite.name}. Waiting for an answer ({inviteLeft}s).</Banner>
              )}
              {inviteState.status === 'sent' && inviteLeft === 0 && (
                <>
                  <Banner variant="warn">The invite to {invite.name} expired.</Banner>
                  <button type="button" className="btn mt-2 w-full" onClick={createRoom}>Invite again</button>
                </>
              )}
              {inviteState.status === 'declined' && (
                <>
                  <Banner variant="warn">{invite.name} declined the invite.</Banner>
                  <button type="button" className="btn mt-2 w-full" onClick={createRoom}>Invite again</button>
                </>
              )}
              {inviteState.status === 'not_sent' && <Banner variant="warn">{inviteNotSentText(inviteState.reason, invite.name)}</Banner>}
            </div>
          )}

          <section className="room-hero" aria-label="Room information">
            <p className="room-hero-label">Private room</p>
            <div className="code-line">
              <strong className="room-code room-variant">{displayCode}</strong>
              <button type="button" className="copy-code" onClick={() => copyCode(room.roomCode)} aria-label={copied ? 'Room code copied' : 'Copy room code'}>
                <Icon name={copied ? 'check' : 'copy'} className="w-4 h-4" />
              </button>
            </div>
            <div className="room-details">
              <span className="chip">Custom</span>
              <span className="chip">{room.playerCount} players</span>
              <span className="chip">{room.difficulty === 'HARDCORE' ? 'Hardcore' : 'Standard'}</span>
              <span className="chip">{room.skills ? 'Skills on' : 'Skills off'}</span>
            </div>
          </section>

          <section className="section" aria-labelledby="players-title">
            <div className="section-heading">
              <h2 id="players-title">Players in queue</h2>
              <span>{room.players.length} / {room.playerCount} joined</span>
            </div>
            <div className="players">
              {room.players.map((p) => {
                const isYou = user && p.userId === user.id;
                const isHostPlayer = p.userId === room.hostUserId;
                return (
                  <article key={p.userId} className={`player room-variant${isYou ? ' you' : ''}`}>
                    <Avatar name={p.username} url={p.avatarUrl} size={35} className="avatar" />
                    <div className="player-info">
                      <strong>{p.username}</strong>
                <span>{skillPicks[p.userId] ? `${skillName(skillPicks[p.userId])} selected` : isYou ? `You${isHostPlayer ? ' · Room creator' : ''}` : 'Ready to crack'}</span>
                    </div>
                    <span className="host" style={{ visibility: isHostPlayer ? 'visible' : 'hidden' }}>Host</span>
                  </article>
                );
              })}
              {Array.from({ length: emptySeats }).map((_, i) => (
                <div key={`empty-${i}`} className="empty">
                  <span className="empty-icon" aria-hidden="true">+</span>
                  <span>Waiting for one more player...</span>
                </div>
              ))}
            </div>
          </section>

          {room.skills && (
            <section className="section" aria-labelledby="skills-title">
              <div className="section-heading">
                <h2 id="skills-title">Skill slots</h2>
                <span>{room.skillSelectionOpen ? 'Choose one skill' : 'Locked until the host continues'}</span>
              </div>
              <div className="skills room-variant">
                {SKILL_ORDER.map((skill) => {
                  const ownerId = Object.entries(skillPicks).find(([, picked]) => picked === skill)?.[0];
                  const selectedByMe = skillPicks[user?.id] === skill;
                  const unavailable = !room.skillSelectionOpen || (ownerId && ownerId !== user?.id);
                  return (
                    <button key={skill} type="button" className={`skill room-variant room-skill-choice${selectedByMe ? ' selected' : ''}`} disabled={Boolean(unavailable)} onClick={() => chooseSkill(skill)}>
                      <span className="room-skill-title"><strong>{skillName(skill)}</strong><Icon name={selectedByMe ? 'check' : unavailable ? 'lock' : 'plus'} className="w-4 h-4" /></span>
                      <p>{ownerId && ownerId !== user?.id ? `${room.players.find((p) => p.userId === ownerId)?.username || 'A player'} selected this` : SKILL_INFO[skill]}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {isHost ? (
            <>
              <button type="button" onClick={nextRoomStep} disabled={!full || (room.skillSelectionOpen && !skillsReady)} className="start">
                {!full ? 'Waiting for players' : room.skills && !room.skillSelectionOpen ? 'Next' : 'Start match'} <span aria-hidden="true">&rarr;</span>
              </button>
              <p className="waiting">
                {!full ? 'The host can continue when all seats are filled.' : room.skills && !room.skillSelectionOpen ? 'All players are here. Continue to choose skills.' : room.skills ? (skillsReady ? 'Everyone has a skill. Start when ready.' : 'Each player must choose one skill before the match starts.') : 'All seats filled. Start when ready.'}
              </p>
            </>
          ) : (
            <p className="waiting">Only the host can start the match.</p>
          )}
        </div>
      </main>
      <ReconnectModal open={reconnectGate.exhausted} onRetry={reconnectGate.retry} />
    </>
  );
}
