import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import BottomNav from '../../components/ui/BottomNav';
import Avatar from '../../components/ui/Avatar';
import Icon from '../../components/ui/Icon';
import AchievementBadge from '../../components/achievements/AchievementBadge';
import { LoadingScreen, ErrorState } from '../../components/ui/Feedback';
import { EditProfileSheet } from '../../components/profile/AccountSheets';
import { useCurrentUser, useAchievements } from '../../hooks/useAuth';
import * as profileApi from '../../api/profile.api';

function formatJoined(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function Profile() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: achievementsData } = useAchievements();
  const [editOpen, setEditOpen] = useState(false);

  const { data: p, isLoading, isError } = useQuery({
    queryKey: ['publicProfile', user?.username],
    queryFn: () => profileApi.getPublicProfile(user.username),
    enabled: Boolean(user?.username),
  });

  if (userLoading || isLoading) return <main className="mx-auto w-full max-w-[430px] min-h-screen"><LoadingScreen /></main>;
  if (isError) return <main className="mx-auto w-full max-w-[430px] min-h-screen px-5 pt-14"><ErrorState description="Could not load your profile." /></main>;

  const stats = p?.statistics;
  const played = stats?.matchesPlayed ?? 0;
  const won = stats?.matchesWon ?? 0;
  const drawn = stats?.matchesDrawn ?? 0;
  const lost = stats?.matchesLost ?? 0;
  const pct = (n) => (played ? (n / played) * 100 : 0);
  const winRate = played ? Math.round((won / played) * 100) : null;
  const name = p?.displayName || p?.username;
  const achievements = achievementsData?.achievements || [];
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const banner = achievementsData?.topRankBanner;
  const joined = formatJoined(user?.createdAt);

  return (
    <>
      <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col pb-24">
        <header className="flex items-center justify-end gap-1 px-4 pt-5">
          <Link to="/support" replace state={{ from: '/profile' }} className="p-2 text-mute" aria-label="Help and feedback"><Icon name="headset" /></Link>
          <Link to="/settings" replace className="p-2 text-mute" aria-label="Settings"><Icon name="settings" /></Link>
        </header>

        <section className="px-5 flex items-center gap-4 mt-1">
          <Avatar name={name} size={72} url={p?.avatarUrl} />
          <div className="min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <div className="text-3xl font-bold truncate">{name}</div>
              <button type="button" onClick={() => setEditOpen(true)} className="p-2 text-mute shrink-0" aria-label="Edit profile"><Icon name="edit" className="w-5 h-5" /></button>
            </div>
            <div className="text-sm text-mute">@{p?.username}{joined ? ` · joined ${joined}` : ''}</div>
          </div>
        </section>

        <section className="px-5 mt-6 flex items-end justify-between">
          <div>
            <div className="text-xs text-mute">Rating</div>
            <div className="font-display font-black text-4xl tnum">{p?.rating}</div>
          </div>
          <div className="flex gap-6 text-right">
            <div><div className="text-xs text-mute">Points</div><div className="text-xl font-bold tnum">{(p?.points ?? 0).toLocaleString()}</div></div>
            <div><div className="text-xs text-mute">Matches</div><div className="text-xl font-bold tnum">{played}</div></div>
          </div>
        </section>

        <section className="px-5 mt-5">
          <div className="flex h-2 rounded overflow-hidden gap-0.5" role="img" aria-label={`${won} wins, ${drawn} draws, ${lost} losses`}>
            <span className="bg-g" style={{ width: `${pct(won)}%` }} />
            <span className="bg-mute/50" style={{ width: `${pct(drawn)}%` }} />
            <span className="bg-bad" style={{ width: `${pct(lost)}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span><b className="text-g tnum">{won}</b> wins</span>
            <span><b className="tnum">{drawn}</b> draws</span>
            <span><b className="text-bad tnum">{lost}</b> losses</span>
          </div>
          <div className="mt-1 text-sm text-mute">Win rate {winRate !== null ? `${winRate}%` : '—'}</div>
        </section>

        <section className="px-5 mt-7">
          <h2 className="font-bold mb-2">Competitive status</h2>
          <Link to="/leaderboards" replace className="surface rounded-md border border-line p-4 flex flex-col">
            <div className="text-xs font-semibold tracking-wider text-mute">LEADERBOARD</div>
            {banner?.active ? (
              <>
                <div className="mt-2 font-display font-black text-3xl tnum leading-none">#{banner.rank}</div>
                <div className="mt-1 text-sm text-mute">Top 10 player, current position</div>
              </>
            ) : (
              <div className="mt-2 text-sm text-mute">See how your rating compares with everyone else.</div>
            )}
            <div className="pt-3 flex items-center gap-1 text-sm font-semibold text-g">View leaderboard<Icon name="chev" className="w-4 h-4" /></div>
          </Link>
        </section>

        {achievements.length > 0 && (
          <section className="px-5 mt-7">
            <h2 className="font-bold mb-1">Achievements</h2>
            <div className="divide-y divide-line">
              {[...achievements].sort((x, y) => Number(y.unlocked) - Number(x.unlocked)).slice(0, 4).map((a) => (
                <div key={a.key} className={`flex items-center gap-3 py-3 ${a.unlocked ? '' : 'opacity-70'}`}>
                  <AchievementBadge icon={a.icon} unlocked={a.unlocked} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-sm text-mute">{a.description}</div>
                  </div>
                  {a.unlocked && <Icon name="check" className="w-4 h-4 text-g" />}
                </div>
              ))}
            </div>
            <Link to="/profile/achievements" replace className="flex items-center justify-between py-3 border-t border-line text-g font-semibold">
              <span>See all achievements</span>
              <span className="flex items-center gap-1 text-sm text-mute tnum">{unlockedCount} of {achievements.length}<Icon name="chev" className="w-4 h-4" /></span>
            </Link>
          </section>
        )}

        <section className="px-5 mt-7 border-t border-line">
          <Link to="/settings" replace className="flex items-center justify-between py-4">
            <span className="flex items-center gap-3"><Icon name="settings" className="w-5 h-5 text-mute" />Settings</span>
            <Icon name="chev" className="w-4 h-4 text-mute" />
          </Link>
        </section>
      </main>
      <BottomNav />
      {editOpen && <EditProfileSheet open onClose={() => setEditOpen(false)} user={user} profile={p} />}
    </>
  );
}
