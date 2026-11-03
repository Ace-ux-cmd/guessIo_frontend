import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Sheet from '../ui/Sheet';
import Avatar from '../ui/Avatar';
import ConfirmDialog from '../ui/ConfirmDialog';
import { acceptFriendRequest, sendFriendRequest } from '../../api/friends.api';
import { getPublicProfile } from '../../api/profile.api';
import { blockPlayer, reportPlayer } from '../../api/safety.api';
import { getErrorMessage } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { useFeatures } from '../../hooks/useFeatures';

const REPORT_REASONS = [
  ['harassment', 'Harassment'],
  ['inappropriate_name_or_picture', 'Inappropriate name or picture'],
  ['cheating', 'Cheating'],
  ['other', 'Other'],
];
const REPORT_NOTE_MAX = 500;

/** Reason picker plus an optional note. Used from profiles and from the player sheet. */
export function ReportSheet({ username, matchId, onClose }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const send = useMutation({
    mutationFn: () => reportPlayer({ username, reason, note: note.trim(), matchId }),
  });

  return (
    <Sheet open onClose={onClose} accent="r" title={`Report ${username}`}>
      {send.isSuccess ? (
        <div role="status">
          <p className="mt-3">Thanks. We will review your report.</p>
          <button type="button" className="btn mt-5 w-full" onClick={onClose}>Close</button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (reason) send.mutate(); }}>
          <fieldset className="mt-3">
            <legend className="text-sm font-bold text-mute">Reason</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {REPORT_REASONS.map(([key, label]) => (
                <button key={key} type="button" className="chip" aria-pressed={reason === key} onClick={() => setReason(key)}>{label}</button>
              ))}
            </div>
          </fieldset>
          <label htmlFor="report-note" className="mt-4 block text-sm font-bold">Note (optional)</label>
          <textarea
            id="report-note"
            rows={3}
            maxLength={REPORT_NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full resize-none rounded-lg border border-edge bg-s2 px-3 py-2 text-white"
          />
          <p className="text-right text-xs text-mute tnum">{note.length} / {REPORT_NOTE_MAX}</p>
          {send.isError && <p role="alert" className="mt-2 text-sm font-bold text-[#FF506E]">{getErrorMessage(send.error, 'Could not send the report.')}</p>}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" className="btn alt" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn" disabled={!reason || send.isPending}>{send.isPending ? 'Sending…' : 'Send report'}</button>
          </div>
        </form>
      )}
    </Sheet>
  );
}

/** Block confirmation. The copy says plainly that public ranked matchmaking can still pair you. */
export function BlockConfirm({ username, onCancel, onDone }) {
  const queryClient = useQueryClient();
  const block = useMutation({
    mutationFn: () => blockPlayer(username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['blocked'] });
      onDone();
    },
  });
  return (
    <ConfirmDialog
      open
      tone="danger"
      eyebrow="Block player"
      title={`Block ${username}?`}
      body="You will not see each other in search or profiles, and any friendship ends. They are not told. Ranked matchmaking can still put you in the same public match."
      confirmLabel="Block"
      busy={block.isPending}
      onCancel={onCancel}
      onConfirm={() => block.mutate()}
    >
      {block.isError && <p role="alert" className="mt-3 text-sm font-bold text-[#FF506E]">{getErrorMessage(block.error, 'Could not block this player.')}</p>}
    </ConfirmDialog>
  );
}

function FriendButton({ relation, canRequest, loading, done, busy, onAdd }) {
  if (relation === 'FRIENDS') return <button type="button" className="btn alt" disabled>Friends</button>;
  if (relation === 'REQUEST_SENT' || (done && relation !== 'REQUEST_RECEIVED')) return <button type="button" className="btn alt" disabled>Sent</button>;
  if (relation === 'REQUEST_RECEIVED') return <button type="button" className="btn" disabled={busy} onClick={onAdd}>Accept</button>;
  if (loading) return <button type="button" className="btn alt" disabled>Add friend</button>;
  // A closed inbox (or a private profile) reads as unavailable, with no reason given.
  if (canRequest === false || relation === undefined) return <button type="button" className="btn alt" disabled>Unavailable</button>;
  return <button type="button" className="btn alt" disabled={busy} onClick={onAdd}>Add friend</button>;
}

/**
 * What you can do with a player you tapped on the leaderboard, podium or a
 * result: open their profile, send a friend request, block or report.
 * `matchId` marks a report as coming from a result screen.
 */
export default function PlayerSheet({ player, matchId, onClose }) {
  // Leaderboard rows show the call sign as `username` and carry the real
  // username as `handle`; match players already have the real one. Lookups,
  // requests, blocks and reports all go by the real username.
  const handle = player?.handle || player?.username;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const signedIn = useAuthStore((s) => s.isAuthenticated());
  const { friends, safety } = useFeatures();
  const [message, setMessage] = useState(null);
  const [mode, setMode] = useState(null); // 'block' | 'report'

  const isSelfPlayer = me?.username === handle;
  // The relationship decides the button: Friends, Sent, Accept, Add friend or Unavailable.
  const { data: profile, isLoading: relationLoading } = useQuery({
    queryKey: ['playerProfile', handle],
    queryFn: () => getPublicProfile(handle),
    enabled: Boolean(handle) && signedIn && friends && !isSelfPlayer,
    retry: false,
    staleTime: 30_000,
  });

  const add = useMutation({
    mutationFn: () => (profile?.relationship === 'REQUEST_RECEIVED' ? acceptFriendRequest(handle) : sendFriendRequest(handle)),
    onSuccess: (res) => {
      setMessage(res.relationship === 'FRIENDS' ? 'You are now friends.' : 'Friend request sent.');
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile', handle] });
    },
    onError: (err) => setMessage(getErrorMessage(err, 'Could not send the request.')),
  });

  if (!player) return null;
  const isSelf = me?.username === handle;
  const others = signedIn && !isSelf;

  if (mode === 'block') return <BlockConfirm username={handle} onCancel={() => setMode(null)} onDone={onClose} />;
  if (mode === 'report') return <ReportSheet username={handle} matchId={matchId} onClose={onClose} />;

  return (
    <Sheet open onClose={onClose} accent="c" labelledBy="player-sheet-title">
      <div className="text-center">
        <div className="flex justify-center"><Avatar name={player.username} url={player.avatarUrl} size={72} /></div>
        <p id="player-sheet-title" className="mt-2 font-display text-2xl font-bold">{player.username}</p>
      </div>
      <div className="mt-5 grid gap-3">
        <button type="button" className="btn" onClick={() => { onClose(); navigate(`/players/${encodeURIComponent(handle)}`, { state: { from: pathname } }); }}>View profile</button>
        {others && friends && (
          <FriendButton relation={profile?.relationship} canRequest={profile?.canRequest} loading={relationLoading} done={add.isSuccess} busy={add.isPending} onAdd={() => add.mutate()} />
        )}
        {others && safety && (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn alt" onClick={() => setMode('block')}>Block</button>
            <button type="button" className="btn alt" onClick={() => setMode('report')}>Report</button>
          </div>
        )}
      </div>
      {message && <p role="status" className="mt-3 text-center text-sm font-bold">{message}</p>}
    </Sheet>
  );
}
