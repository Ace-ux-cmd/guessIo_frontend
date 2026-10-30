import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BottomNav from '../../components/ui/BottomNav';
import { LoadingScreen, ErrorState, Banner } from '../../components/ui/Feedback';
import * as friendsApi from '../../api/friends.api';
import { getErrorMessage } from '../../api/client';

const MIN = 2;

function actionFor(item) {
  switch (item.relationship) {
    case 'FRIENDS': return { label: 'Friends', disabled: true };
    case 'REQUEST_SENT': return { label: 'Requested', disabled: true };
    case 'REQUEST_RECEIVED': return { label: 'Accept', kind: 'accept' };
    default:
      // A closed inbox reads as unavailable, with no reason given.
      return item.canRequest ? { label: 'Add', kind: 'add' } : { label: 'Unavailable', disabled: true };
  }
}

/** Search by exact username, or by call sign (every player who uses it). */
export default function FriendSearch() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => { setTerm(text.trim()); setPage(1); }, 300);
    return () => clearTimeout(id);
  }, [text]);

  const enabled = term.length >= MIN;
  const { data, isFetching, isError } = useQuery({
    queryKey: ['friends', 'search', term, page],
    queryFn: () => friendsApi.searchPlayers(term, page),
    enabled,
    placeholderData: (prev) => prev,
  });

  const act = useMutation({
    mutationFn: ({ kind, username }) => (kind === 'accept' ? friendsApi.acceptFriendRequest(username) : friendsApi.sendFriendRequest(username)),
    onSuccess: () => { setError(null); queryClient.invalidateQueries({ queryKey: ['friends'] }); queryClient.invalidateQueries({ queryKey: ['me'] }); },
    onError: (err) => setError(getErrorMessage(err, 'That did not work. Try again.')),
  });

  const items = data?.items || [];

  return (
    <>
      <main className="app">
        <header className="topbar with-back leading">
          <Link to="/friends" replace aria-label="Back" className="back">&larr;</Link>
          <div>
            <p className="eyebrow">Your circle</p>
            <h1>Add friends</h1>
          </div>
        </header>

        <div className="friends-pad">
          <label htmlFor="friend-q" className="search-label">Search by username or call sign</label>
          <input
            id="friend-q"
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={30}
            autoComplete="off"
            placeholder="Exact name"
            className="search-input"
          />
          <p className="helper">Type at least {MIN} characters. Names must match exactly.</p>
        </div>

        {error && <div className="friends-pad"><Banner variant="error">{error}</Banner></div>}

        <div className="friends-pad" aria-live="polite">
          {!enabled ? null : isError ? (
            <ErrorState description="Could not search right now." />
          ) : !data && isFetching ? <LoadingScreen label="Searching…" /> : items.length === 0 ? (
            <p className="helper">No player with that name.</p>
          ) : (
            <ul className="person-list flush">
              {items.map((item) => {
                const a = actionFor(item);
                return (
                  <li key={item.username} className="person-card">
                    <span className="mini-avatar" aria-hidden="true" style={item.avatarUrl ? { backgroundImage: `url(${item.avatarUrl})`, backgroundSize: 'cover' } : undefined}>{!item.avatarUrl && (item.displayName || '?').charAt(0).toUpperCase()}</span>
                    <button type="button" onClick={() => navigate(`/players/${encodeURIComponent(item.username)}`, { state: { from: '/friends/add' } })} className="person-main">
                      <strong>{item.displayName}</strong>
                      <span>@{item.username}</span>
                    </button>
                    <div className="person-actions">
                      <button type="button" className={`select act${a.disabled ? '' : ' primary'}`} disabled={a.disabled || act.isPending} onClick={() => act.mutate({ kind: a.kind, username: item.username })}>{a.label}</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {data?.hasMore && (
            <button type="button" className="select act wide" disabled={isFetching} onClick={() => setPage((p) => p + 1)}>Next page</button>
          )}
          {page > 1 && (
            <button type="button" className="select act wide" onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous page</button>
          )}
        </div>
      </main>
      <BottomNav active="/profile" />
    </>
  );
}
