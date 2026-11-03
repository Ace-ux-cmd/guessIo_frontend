import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Avatar from '../../components/ui/Avatar';
import BottomNav from '../../components/ui/BottomNav';
import Icon from '../../components/ui/Icon';
import { AchievementMark, isFlawlessAchievement } from '../../components/achievements/AchievementBadge';
import { PageSkeleton, ErrorState } from '../../components/ui/Feedback';
import { EditProfileSheet, LogoutDialog } from '../../components/profile/AccountSheets';
import { useCurrentUser, useAchievements } from '../../hooks/useAuth';
import { useFeatures } from '../../hooks/useFeatures';
import * as profileApi from '../../api/profile.api';

const PREVIEW_COUNT = 6;

function formatJoined(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function Profile() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: achievementsData, isLoading: achievementsLoading } = useAchievements();
  const { friends, daily } = useFeatures();
  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const { data: p, isLoading, isError } = useQuery({
    queryKey: ['publicProfile', user?.username],
    queryFn: () => profileApi.getPublicProfile(user.username),
    enabled: Boolean(user?.username),
  });

  if (userLoading || isLoading || achievementsLoading) return (<><PageSkeleton cards={4} /><BottomNav /></>);
  if (isError) return <main className="mx-auto min-h-screen w-full max-w-[430px] px-5 pt-14"><ErrorState description="Could not load your profile." /></main>;

  const name = p?.displayName || p?.username;
  const stats = p?.statistics;
  const played = stats?.matchesPlayed ?? 0;
  const won = stats?.matchesWon ?? 0;
  const lost = stats?.matchesLost ?? 0;
  const drawn = stats?.matchesDrawn ?? 0;
  const winRate = played ? Math.round((won / played) * 100) : null;
  const achievements = achievementsData?.achievements || [];
  // Unlocked badges first, so the preview shows what the player has earned.
  const preview = [...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked)).slice(0, PREVIEW_COUNT);
  const banner = achievementsData?.topRankBanner;
  const bannerRankTone = banner?.rank === 1 ? 'gold' : banner?.rank === 2 ? 'silver' : banner?.rank === 3 ? 'bronze' : 'default';
  const joined = formatJoined(user?.createdAt);
  const streak = user?.dailyStreak;
  const requests = user?.friends?.incomingRequests ?? 0;

  return (
    <>
      <main className="app">
        <header className="profile-header">
          <p className="eyebrow profile-variant">Player profile</p>
          <Avatar
            name={name}
            url={p?.avatarUrl}
            size={90}
            className="profile-avatar"
            ringColor="#00E5FF"
            style={{ borderColor: 'var(--cyan)', ...(!p?.avatarUrl ? { background: 'radial-gradient(circle at 35% 20%, #5d74b9, #171d3a 62%)' } : {}) }}
          />
          <div className="name-row">
            <h1 className="profile-variant">{name}</h1>
            <button type="button" className="profile-action" aria-label="Edit profile" onClick={() => setEditOpen(true)}>
              <Icon name="edit" className="h-4 w-4" />
            </button>
          </div>
          {friends && (
            <Link
              to="/friends"
              replace
              className="profile-action friend"
              aria-label={requests ? `Friends, ${requests} new request${requests === 1 ? '' : 's'}` : 'Friends'}
            >
              <Icon name="friends" className="h-4 w-4" />
              {requests > 0 && <b className="action-count tnum">{requests}</b>}
            </Link>
          )}
          <p className="handle">@{p?.username}{joined ? ` · Joined ${joined}` : ''}</p>
          {banner?.active && <span className={`top-ten ${bannerRankTone}`}>Rank #{banner.rank} on the leaderboard</span>}
        </header>

        <section className="stats profile-variant" aria-label="Player totals">
          <div className="stat profile-variant"><strong className="tnum">{(p?.rating ?? 0).toLocaleString()}</strong><span>Rating</span></div>
          <div className="stat profile-variant"><strong className="tnum">{(p?.points ?? 0).toLocaleString()}</strong><span>Points</span></div>
          <div className="stat profile-variant"><strong className="tnum">{winRate !== null ? `${winRate}%` : '-'}</strong><span>Win rate</span></div>
          <div className="stat profile-variant"><strong className="tnum">{played.toLocaleString()}</strong><span>Matches</span></div>
        </section>

        <div className="content profile-variant">
          <section className="section" aria-labelledby="record-title">
            <div className="section-heading profile-variant">
              <h2 id="record-title">Match record</h2>
              <span>All time</span>
            </div>
            <div className="record">
              <div className="record-item win"><strong className="tnum">{won}</strong><span>Wins</span></div>
              <div className="record-item loss"><strong className="tnum">{lost}</strong><span>Losses</span></div>
              <div className="record-item draw"><strong className="tnum">{drawn}</strong><span>Draws</span></div>
            </div>
          </section>

          {achievements.length > 0 && (
            <section className="section" aria-labelledby="achievements-title">
              <div className="section-heading profile-variant">
                <h2 id="achievements-title">Achievements</h2>
                <Link className="section-link" to="/profile/achievements" replace>View all</Link>
              </div>
              <div className="achievement-list profile-variant">
                {preview.map((a) => (
                  <article key={a.key} className={`achievement profile-variant${a.unlocked ? '' : ' locked'}`}>
                    <span className="badge profile-variant" aria-hidden="true">
                      {a.unlocked || isFlawlessAchievement(a.key)
                        ? <AchievementMark achievementKey={a.key} icon={a.icon} className="h-5 w-5" />
                        : <Icon name="lock" className="h-4 w-4" />}
                    </span>
                    <div><strong>{a.title}</strong><span>{a.description}</span></div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="section" aria-labelledby="account-title">
            <div className="section-heading profile-variant">
              <h2 id="account-title">Account</h2>
            </div>
            <div className="account-actions">
              <Link to="/settings" replace className="account-button">Settings <span aria-hidden="true">&rarr;</span></Link>
              {daily && (
                <Link to="/daily" replace className="account-button">
                  <span style={{ color: 'inherit', fontSize: 'inherit' }}>Daily Challenge{streak ? ` · streak ${streak.current ?? 0}` : ''}</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              )}
              <Link to="/support" replace state={{ from: '/profile' }} className="account-button">Help <span aria-hidden="true">&rarr;</span></Link>
              <button type="button" className="account-button danger" onClick={() => setLogoutOpen(true)}>Sign out <span aria-hidden="true">&rarr;</span></button>
            </div>
          </section>
        </div>
      </main>
      <BottomNav />
      {editOpen && <EditProfileSheet open onClose={() => setEditOpen(false)} user={user} profile={p} />}
      <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </>
  );
}
