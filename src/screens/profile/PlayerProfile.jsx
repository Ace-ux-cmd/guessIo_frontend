import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BottomNav from '../../components/ui/BottomNav';
import Icon from '../../components/ui/Icon';
import { ICONS } from '../../components/ui/icons';
import { BlockConfirm, ReportSheet } from '../../components/social/PlayerSheet';
import { PageSkeleton, ErrorState } from '../../components/ui/Feedback';
import * as profileApi from '../../api/profile.api';
import * as friendsApi from '../../api/friends.api';
import { getErrorMessage } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { useFeatures } from '../../hooks/useFeatures';

/**
 * Another player's read-only profile. A blocked or unknown player is "not
 * found". A private profile says so. Friend actions follow the relationship the
 * server reports: add, requested, accept, friends. When requests are closed
 * the button reads as unavailable, with no reason given.
 */
export default function PlayerProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const signedIn = useAuthStore((s) => s.isAuthenticated());
  const me = useAuthStore((s) => s.user);
  const { friends, safety } = useFeatures();
  const [menu, setMenu] = useState(null); // 'block' | 'report'
  const [actionError, setActionError] = useState(null);

  const { data: p, isLoading, isError, error } = useQuery({
    queryKey: ['playerProfile', username],
    queryFn: () => profileApi.getPublicProfile(username),
    retry: false,
  });

  const relate = useMutation({
    mutationFn: ({ kind }) => {
      const handle = p.username; // the real username, whatever the page was opened with
      if (kind === 'add') return friendsApi.sendFriendRequest(handle);
      if (kind === 'accept') return friendsApi.acceptFriendRequest(handle);
      if (kind === 'cancel') return friendsApi.cancelFriendRequest(handle);
      return friendsApi.removeFriend(handle);
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['playerProfile', username] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
    onError: (err) => setActionError(getErrorMessage(err, 'That did not work. Try again.')),
  });

  // Back goes to where the player came from (replace, as everywhere in the app).
  const from = location.state?.from;
  const backTo = ['/friends', '/friends/add', '/leaderboards', '/dashboard'].includes(from) ? from : '/leaderboards';

  const shell = (children) => (
    <>
      <main className="app">
        <header className="topbar with-back leading">
          <Link to={backTo} replace aria-label="Back" className="back">&larr;</Link>
          <div>
            <p className="eyebrow">Player profile</p>
            <h1 className="sr-only">Profile</h1>
          </div>
        </header>
        {children}
      </main>
      {signedIn && <BottomNav active={backTo === '/dashboard' ? '/dashboard' : backTo.startsWith('/friends') ? '/profile' : '/leaderboards'} />}
    </>
  );

  if (isLoading) return (<><PageSkeleton cards={3} />{signedIn && <BottomNav active="/leaderboards" />}</>);
  const status = error?.response?.status;
  const code = error?.response?.data?.error?.code;
  if (isError && code === 'PROFILE_PRIVATE') {
    return shell(
      <div className="content">
        <section className="status-card" style={{ borderColor: 'rgba(156, 77, 255, 0.4)' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>This profile is private</h2>
          <p className="summary">{username} has turned off profile visibility.</p>
        </section>
      </div>
    );
  }
  if (isError && status === 404) {
    return shell(<div className="content"><section className="status-card"><h2 style={{ margin: 0, fontSize: '1.1rem' }}>Player not found</h2><p className="summary">That player does not exist or cannot be shown.</p></section></div>);
  }
  if (isError || !p) return shell(<div className="content"><ErrorState description="Could not load this profile." /></div>);

  const name = p.displayName || p.username;
  const isSelf = me?.username === p.username;
  const achievements = (p.achievements || []).filter((a) => a.unlocked);
  const rel = p.relationship;

  let action = null;
  if (signedIn && friends && !isSelf && rel) {
    const busy = relate.isPending;
    if (rel === 'FRIENDS') action = <button type="button" className="profile-cta" disabled={busy} onClick={() => relate.mutate({ kind: 'remove' })}>Friends</button>;
    else if (rel === 'REQUEST_SENT') action = <button type="button" className="profile-cta" disabled={busy} onClick={() => relate.mutate({ kind: 'cancel' })}>Sent</button>;
    else if (rel === 'REQUEST_RECEIVED') action = <button type="button" className="profile-cta primary" disabled={busy} onClick={() => relate.mutate({ kind: 'accept' })}>Accept</button>;
    else action = <button type="button" className="profile-cta primary" disabled={busy || !p.canRequest} onClick={() => relate.mutate({ kind: 'add' })}>{p.canRequest ? 'Add friend' : 'Unavailable'}</button>;
  }

  const stats = p.statistics;
  const played = stats?.matchesPlayed ?? 0;
  const won = stats?.matchesWon ?? 0;
  const lost = stats?.matchesLost ?? 0;
  const drawn = stats?.matchesDrawn ?? 0;
  const winRate = played ? Math.round((won / played) * 100) : null;

  return shell(
    <>
      <header className="profile-header">
        <div
          className="profile-avatar"
          role="img"
          aria-label={`${name} avatar`}
          style={p.avatarUrl ? { backgroundImage: `url(${p.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          {!p.avatarUrl && (name || '?').charAt(0).toUpperCase()}
        </div>
        <div className="name-row"><h2 className="profile-variant">{name}</h2></div>
        <p className="handle">@{p.username}</p>
        {action && <div style={{ marginTop: '0.7rem' }}>{action}</div>}
        {actionError && <p role="alert" className="setting-error">{actionError}</p>}
      </header>

      <section className="stats profile-variant" aria-label="Player totals">
        <div className="stat profile-variant"><strong className="tnum">{(p.rating ?? 0).toLocaleString()}</strong><span>Rating</span></div>
        <div className="stat profile-variant"><strong className="tnum">{(p.points ?? 0).toLocaleString()}</strong><span>Points</span></div>
        <div className="stat profile-variant"><strong className="tnum">{winRate !== null ? `${winRate}%` : '-'}</strong><span>Win rate</span><small>{won} {won === 1 ? 'win' : 'wins'}</small></div>
        <div className="stat profile-variant"><strong className="tnum">{played.toLocaleString()}</strong><span>Matches</span></div>
      </section>

      <div className="content profile-variant">
        <section className="section" aria-labelledby="record-title">
          <div className="section-heading profile-variant"><h2 id="record-title">Match record</h2><span>All time</span></div>
          <div className="record">
            <div className="record-item win"><strong className="tnum">{won}</strong><span>Wins</span></div>
            <div className="record-item loss"><strong className="tnum">{lost}</strong><span>Losses</span></div>
            <div className="record-item draw"><strong className="tnum">{drawn}</strong><span>Draws</span></div>
          </div>
        </section>

        <section className="section" aria-labelledby="achievements-title">
          <div className="section-heading profile-variant"><h2 id="achievements-title">Achievements</h2></div>
          {achievements.length ? (
            <div className="achievement-list profile-variant">
              {achievements.map((a) => (
                <article key={a.key} className="achievement profile-variant">
                  <span className="badge profile-variant" aria-hidden="true"><Icon name={ICONS[a.icon] ? a.icon : 'star'} className="h-4 w-4" /></span>
                  <div><strong>{a.title}</strong><span>{a.description}</span></div>
                </article>
              ))}
            </div>
          ) : <p className="helper">No achievements unlocked yet.</p>}
        </section>

        {(signedIn && !isSelf && safety) && (
          <section className="section" aria-labelledby="safety-title">
            <div className="section-heading profile-variant"><h2 id="safety-title">Safety</h2></div>
            <div className="account-actions">
              <button type="button" className="account-button" onClick={() => setMenu('block')}>Block <span aria-hidden="true">&rarr;</span></button>
              <button type="button" className="account-button danger" onClick={() => setMenu('report')}>Report <span aria-hidden="true">&rarr;</span></button>
            </div>
          </section>
        )}
        {isSelf && <Link to="/profile" replace className="account-button">Back to your profile <span aria-hidden="true">&rarr;</span></Link>}
      </div>
      {menu === 'block' && <BlockConfirm username={p.username} onCancel={() => setMenu(null)} onDone={() => { setMenu(null); navigate('/friends', { replace: true }); }} />}
      {menu === 'report' && <ReportSheet username={p.username} onClose={() => setMenu(null)} />}
    </>
  );
}
