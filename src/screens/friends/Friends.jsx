import { useState } from 'react';
import { useFeatures } from '../../hooks/useFeatures';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BottomNav from '../../components/ui/BottomNav';
import Avatar from '../../components/ui/Avatar';
import Icon from '../../components/ui/Icon';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { PageSkeleton, ErrorState, EmptyState, Banner } from '../../components/ui/Feedback';
import * as friendsApi from '../../api/friends.api';
import { getErrorMessage } from '../../api/client';

function Card({ person, children, onOpen }) {
  return (
    <li className="person-card">
      <Avatar name={person.displayName || person.username} url={person.avatarUrl} size={34} className="mini-avatar" />
      <button type="button" onClick={onOpen} className="person-main">
        <strong>{person.displayName}</strong>
        <span className="tnum">@{person.username}{person.rating != null ? ` \u00b7 ${person.rating} rating` : ''}</span>
      </button>
      <div className="person-actions">{children}</div>
    </li>
  );
}

/** Friends and requests. Capped at 10 friends; the server enforces it on both sides. */
export default function Friends() {
  const navigate = useNavigate();
  const { friendInvites } = useFeatures();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'requests' ? 'requests' : 'friends';
  const [error, setError] = useState(null);
  const [removing, setRemoving] = useState(null);

  const friends = useQuery({ queryKey: ['friends', 'list'], queryFn: friendsApi.listFriends });
  const requests = useQuery({ queryKey: ['friends', 'requests'], queryFn: friendsApi.listRequests });

  const act = useMutation({
    mutationFn: ({ kind, username }) => {
      if (kind === 'accept') return friendsApi.acceptFriendRequest(username);
      if (kind === 'decline') return friendsApi.declineFriendRequest(username);
      if (kind === 'cancel') return friendsApi.cancelFriendRequest(username);
      return friendsApi.removeFriend(username);
    },
    onSuccess: () => { setError(null); setRemoving(null); queryClient.invalidateQueries({ queryKey: ['friends'] }); queryClient.invalidateQueries({ queryKey: ['me'] }); },
    onError: (err) => { setRemoving(null); setError(getErrorMessage(err, 'That did not work. Try again.')); },
  });

  const incoming = requests.data?.incoming || [];
  const outgoing = requests.data?.outgoing || [];
  const list = friends.data?.items || [];
  const cap = friends.data?.cap ?? 10;
  const open = (u) => navigate(`/players/${encodeURIComponent(u)}`, { state: { from: '/friends' } });

  if (friends.isLoading || requests.isLoading) return (<><PageSkeleton cards={4} /><BottomNav active="/profile" /></>);

  return (
    <>
      <main className="app">
        <header className="topbar with-back leading">
          <Link to="/profile" replace aria-label="Back" className="back">&larr;</Link>
          <div>
            <p className="eyebrow">Your circle</p>
            <h1>Friends</h1>
          </div>
          <Link to="/friends/add" replace aria-label="Add friends" className="select topbar-add">Add</Link>
        </header>

        <div className="filters two" role="group" aria-label="Friends view">
          <button type="button" className={`filter${tab === 'friends' ? ' active' : ''}`} aria-pressed={tab === 'friends'} onClick={() => setParams({})}>Friends {friends.data ? `${list.length}/${cap}` : ''}</button>
          <button type="button" className={`filter${tab === 'requests' ? ' active' : ''}`} aria-pressed={tab === 'requests'} onClick={() => setParams({ tab: 'requests' })}>Requests{incoming.length ? ` (${incoming.length})` : ''}</button>
        </div>

        {error && <div className="friends-pad"><Banner variant="error">{error}</Banner></div>}

        {tab === 'friends' ? (
          friends.isError ? (
            <div className="friends-pad"><ErrorState description="Could not load your friends." /></div>
          ) : list.length === 0 ? (
            <div className="friends-pad"><EmptyState title="No friends yet" description="Tap the plus to find players and add them." /></div>
          ) : (
            <ul className="person-list">
              {list.map((f) => (
                <Card key={f.username} person={f} onOpen={() => open(f.username)}>
                  <button
                    type="button"
                    className="select act primary"
                    onClick={() => navigate('/private-room?difficulty=STANDARD&playerCount=2', {
                      replace: true,
                      // The friend's id lets the server send them an in-game invite; without the feature it is only a room.
                      state: friendInvites && f.userId ? { invite: { userId: f.userId, name: f.displayName } } : undefined,
                    })}
                  >Challenge</button>
                  <button type="button" className="select act icon" aria-label={`Remove ${f.displayName}`} onClick={() => setRemoving(f)}><Icon name="close" /></button>
                </Card>
              ))}
            </ul>
          )
        ) : requests.isError ? (
          <div className="friends-pad"><ErrorState description="Could not load requests." /></div>
        ) : incoming.length === 0 && outgoing.length === 0 ? (
          <div className="friends-pad"><EmptyState title="No requests" description="Requests you send and receive show up here." /></div>
        ) : (
          <>
            {incoming.length > 0 && (
              <>
                <div className="section-heading friends-pad"><h2>Received</h2></div>
                <ul className="person-list">
                  {incoming.map((r) => (
                    <Card key={r.username} person={r} onOpen={() => open(r.username)}>
                      <button type="button" className="select act primary" disabled={act.isPending} onClick={() => act.mutate({ kind: 'accept', username: r.username })}>Accept</button>
                      <button type="button" className="select act" disabled={act.isPending} onClick={() => act.mutate({ kind: 'decline', username: r.username })}>Decline</button>
                    </Card>
                  ))}
                </ul>
              </>
            )}
            {outgoing.length > 0 && (
              <>
                <div className="section-heading friends-pad"><h2>Sent</h2></div>
                <ul className="person-list">
                  {outgoing.map((r) => (
                    <Card key={r.username} person={r} onOpen={() => open(r.username)}>
                      <button type="button" className="select act" disabled={act.isPending} onClick={() => act.mutate({ kind: 'cancel', username: r.username })}>Cancel</button>
                    </Card>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </main>
      <BottomNav active="/profile" />
      <ConfirmDialog
        open={Boolean(removing)}
        tone="danger"
        title={`Remove ${removing?.displayName || 'friend'}?`}
        body="You will no longer be friends. You can send a new request later."
        confirmLabel="Remove"
        busy={act.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => act.mutate({ kind: 'remove', username: removing.username })}
      />
    </>
  );
}
