import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Avatar from '../ui/Avatar';
import { connectSocket, emit } from '../../sockets/socketClient';
import { useAuthStore } from '../../stores/authStore';
import { useMatchStore } from '../../stores/matchStore';
import { useFeatures } from '../../hooks/useFeatures';
import { useSecondsLeft } from '../../hooks/useSecondsLeft';

// Screens where an invite must not appear: a match, a search, or a room the player is already in.
const BUSY_PATHS = ['/gameplay', '/matchmaking', '/private-room'];
const IN_MATCH = ['FOUND', 'STARTING', 'ACTIVE', 'ROUND_ENDED'];

/**
 * Receives `room.invited` on every screen except an active match, a search or a room.
 * Shows only the latest invite, ignores repeats by inviteId, drops it when the server
 * cancels it or its time runs out. Invites are not restored after a reconnect.
 * Accepting goes to the private room and joins by code with the inviteId, so the
 * server can still refuse an expired or withdrawn invite.
 */
export default function InvitePrompt() {
  const { friendInvites } = useFeatures();
  const authed = useAuthStore((s) => s.isAuthenticated());
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [invite, setInvite] = useState(null);
  const seen = useRef(new Set());
  // Read at the moment an invite arrives, not captured when the listener was set up.
  const busyRef = useRef(false);
  busyRef.current = BUSY_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!authed || !friendInvites) return undefined;
    const socket = connectSocket();

    const onInvited = (env) => {
      const next = env.payload;
      if (!next?.inviteId || seen.current.has(next.inviteId)) return;
      seen.current.add(next.inviteId);
      if (busyRef.current || IN_MATCH.includes(useMatchStore.getState().status)) return;
      setInvite(next);
    };
    const onCancelled = (env) => setInvite((cur) => (cur && cur.inviteId === env.payload?.inviteId ? null : cur));

    socket.on('room.invited', onInvited);
    socket.on('room.inviteCancelled', onCancelled);
    return () => {
      socket.off('room.invited', onInvited);
      socket.off('room.inviteCancelled', onCancelled);
    };
  }, [authed, friendInvites]);

  // Walking into a match, search or room hides an invite that is already showing.
  useEffect(() => {
    if (invite && busyRef.current) setInvite(null);
  }, [pathname, invite]);

  const left = useSecondsLeft(invite?.expiresAt);
  useEffect(() => {
    if (invite && left === 0) setInvite(null);
  }, [invite, left]);

  if (!invite) return null;
  const { from } = invite;

  function accept() {
    const current = invite;
    setInvite(null);
    navigate('/private-room', { state: { joinInvite: { roomCode: current.roomCode, inviteId: current.inviteId } } });
  }
  function decline() {
    emit('room.invite.decline', { inviteId: invite.inviteId });
    setInvite(null);
  }

  return (
    <section className="invite-prompt" role="alertdialog" aria-labelledby="invite-title" aria-describedby="invite-desc">
      <div className="invite-head">
        <Avatar name={from.username} url={from.avatarUrl} size={40} />
        <div className="min-w-0">
          <p id="invite-title" className="font-bold">{from.username} challenged you to a private match</p>
          <p id="invite-desc" className="text-sm text-mute">
            {invite.difficulty === 'HARDCORE' ? 'Hardcore' : 'Standard'} &middot; {invite.playerCount} players &middot; {left}s left
          </p>
        </div>
      </div>
      <div className="invite-actions">
        <button type="button" className="btn" onClick={accept}>Accept</button>
        <button type="button" className="btn alt" onClick={decline}>Decline</button>
      </div>
    </section>
  );
}
