import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Avatar from '../../components/ui/Avatar';
import Icon from '../../components/ui/Icon';
import { AchievementMark } from '../../components/achievements/AchievementBadge';
import { BlockConfirm, ReportSheet } from '../../components/social/PlayerSheet';
import { PageSkeleton, ErrorState } from '../../components/ui/Feedback';
import * as profileApi from '../../api/profile.api';
import * as friendsApi from '../../api/friends.api';
import { getErrorMessage } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { useFeatures } from '../../hooks/useFeatures';

function formatJoined(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

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
      <main className="app public-player">
        <header className="topbar with-back leading">
          <Link to={backTo} replace aria-label="Back" className="back">&larr;</Link>
          <div>
            <p className="eyebrow">Player profile</p>
            <h1 className="sr-only">Profile</h1>
          </div>
        </header>
        {children}
      </main>
    </>
  );

  if (isLoading) return <PageSkeleton cards={3} />;
  const status = error?.response?.status;
  const code = error?.response?.data?.error?.code;
  if (isError && code === 'PROFILE_PRIVATE') {
    return shell(
      <div className="content">
        <section className="status-card compact" style={{ borderColor: 'rgba(156, 77, 255, 0.4)' }}>
          <h2 style={{ margin: 0 }}>This profile is private</h2>
          <p className="summary">{username}&apos;s profile is not available for viewing.</p>
        </section>
      </div>
    );
  }
  if (isError && status === 404) {
    return shell(<div className="content"><section className="status-card compact"><h2 style={{ margin: 0 }}>Player not found</h2><p className="summary">That player does not exist or cannot be shown.</p></section></div>);
  }
  if (isError || !p) return shell(<div className="content"><ErrorState description="Could not load this profile." /></div>);

  const name = p.displayName || p.username;
  const isSelf = me?.username === p.username;
  const achievements = (p.achievements || []).filter((a) => a.unlocked);
  const rel = p.relationship;

  const showFriendAction = signedIn && friends && !isSelf && Boolean(rel);
  const friendSent = rel === 'REQUEST_SENT' || rel === 'FRIENDS';
  const friendCanAccept = rel === 'REQUEST_RECEIVED';
  const friendLabel = friendSent ? (rel === 'FRIENDS' ? `You are friends with ${name}` : `Friend request sent to ${name}`)
    : friendCanAccept ? `Accept friend request from ${name}`
      : p.canRequest ? `Send friend request to ${name}` : `Friend requests unavailable for ${name}`;
  const rankTone = p.rank === 1 ? 'gold' : p.rank === 2 ? 'silver' : p.rank === 3 ? 'bronze' : 'default';

  const stats = p.statistics;
  const played = stats?.matchesPlayed ?? 0;
  const won = stats?.matchesWon ?? 0;
  const lost = stats?.matchesLost ?? 0;
  const drawn = stats?.matchesDrawn ?? 0;
  const winRate = played ? Math.round((won / played) * 100) : null;
  const joined = formatJoined(p.createdAt);

  return shell(
    <>
      <header className="profile-header">
        <Avatar
          name={name}
          url={p.avatarUrl}
          size={90}
          className="profile-avatar"
          ringColor="#00E5FF"
          style={{ borderColor: 'var(--cyan)', ...(!p.avatarUrl ? { background: 'radial-gradient(circle at 35% 20%, #5d74b9, #171d3a 62%)' } : {}) }}
        />
        <div className="name-row player-profile-name-row">
          <div className="player-name-anchor">
            <h2 className="profile-variant">{name}</h2>
            {showFriendAction && (
              <button
                type="button"
                className={`player-friend-action${friendSent ? ' sent' : ''}`}
                aria-label={friendLabel}
                title={friendLabel}
                disabled={relate.isPending || friendSent || (!friendCanAccept && !p.canRequest)}
                onClick={() => relate.mutate({ kind: friendCanAccept ? 'accept' : 'add' })}
              >
                {friendSent ? <Icon name="check" className="h-4 w-4" /> : <span className="friend-plus-mark"><Icon name="friends" className="h-4 w-4" /><Icon name="plus" className="h-3 w-3" /></span>}
              </button>
            )}
          </div>
        </div>
        <p className="handle">@{p.username}{joined ? ` · Joined ${joined}` : ''}</p>
        {Number.isFinite(p.rank) && (
          <span className={`top-ten ${rankTone}`}>Rank #{p.rank} on the leaderboard</span>
        )}
        {actionError && <p role="alert" className="setting-error">{actionError}</p>}
      </header>

      <section className="stats profile-variant" aria-label="Player totals">
        <div className="stat profile-variant"><strong className="tnum">{(p.rating ?? 0).toLocaleString()}</strong><span>Rating</span></div>
        <div className="stat profile-variant"><strong className="tnum">{(p.points ?? 0).toLocaleString()}</strong><span>Points</span></div>
        <div className="stat profile-variant"><strong className="tnum">{winRate !== null ? `${winRate}%` : '-'}</strong><span>Win rate</span></div>
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
                  <span className="badge profile-variant" aria-hidden="true"><AchievementMark achievementKey={a.key} icon={a.icon} className="h-5 w-5" /></span>
                  <div><strong>{a.title}</strong><span>{a.description}</span></div>
                </article>
              ))}
            </div>
          ) : <p className="achievement-empty">No achievements unlocked yet.</p>}
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
