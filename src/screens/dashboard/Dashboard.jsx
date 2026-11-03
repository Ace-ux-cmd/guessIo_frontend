import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import BottomNav from '../../components/ui/BottomNav';
import ConnectionBanner from '../../components/ui/ConnectionBanner';
import HowToPlayOverlay from '../../components/ui/HowToPlayOverlay';
import ActiveMatchDialog from '../../components/ui/ActiveMatchDialog';
import MatchRow from '../../components/ui/MatchRow';
import Avatar from '../../components/ui/Avatar';
import Podium from '../../components/social/Podium';
import WeeklyRecap from '../../components/social/WeeklyRecap';
import PlayerSheet from '../../components/social/PlayerSheet';
import { WelcomeTip, SkillsIntro, useWelcomeState } from '../../components/ui/Welcome';
import { Banner, PageSkeleton, ErrorState } from '../../components/ui/Feedback';
import Button from '../../components/ui/Button';
import { useCurrentUser } from '../../hooks/useAuth';
import { useMatches } from '../../hooks/useMatches';
import { useActiveMatchCheck } from '../../hooks/useActiveMatchCheck';
import { useFeatures } from '../../hooks/useFeatures';
import { useAuthStore } from '../../stores/authStore';
import * as leaderboardsApi from '../../api/leaderboards.api';
import * as profileApi from '../../api/profile.api';

const LAST_GAMES = 3;

export default function Dashboard() {
  const [howToOpen, setHowToOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const consumeBackToLoginBlockedMessage = useAuthStore((s) => s.consumeBackToLoginBlockedMessage);
  // See useBackNavigationGuard.js: shown once when we landed here because an
  // authenticated user tried to back into /login.
  const [backBlockedMessage] = useState(() => consumeBackToLoginBlockedMessage());
  const { data: user, isLoading: userLoading, isError: userError } = useCurrentUser();
  const { data: matchesPage, isLoading: matchesLoading } = useMatches({ pageSize: LAST_GAMES });
  const activeMatch = useActiveMatchCheck();
  const { daily } = useFeatures();
  const helpRef = useRef(null);
  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ['leaderboard', 'rating'],
    queryFn: () => leaderboardsApi.getRatingLeaderboard(),
  });
  // The template's "your statistics" row (rating, win rate, matches) comes from
  // the same public-profile stats used on Profile/PlayerProfile, not from /me.
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['publicProfile', user?.username],
    queryFn: () => profileApi.getPublicProfile(user.username),
    enabled: Boolean(user?.username),
  });
  const welcome = useWelcomeState(user?.id);

  // Everything arrives together: one placeholder until the user, the last games,
  // the podium and the stats have all answered, so the screen never fills in piece by piece.
  if (userLoading || matchesLoading || boardLoading || profileLoading) {
    return (<><PageSkeleton cards={4} /><BottomNav variant="home-variant" /></>);
  }
  if (userError || !user) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pt-14">
        <ErrorState
          title="Couldn't load your home"
          description="Check your connection and try again."
          action={<Button onClick={() => window.location.reload()}>Retry</Button>}
        />
      </main>
    );
  }

  const matches = (matchesPage?.items || []).slice(0, LAST_GAMES);
  const top = (board?.items || []).slice(0, 3);
  const stats = profile?.statistics;
  const played = stats?.matchesPlayed ?? 0;
  const won = stats?.matchesWon ?? 0;
  const winRate = played ? Math.round((won / played) * 100) : null;
  const name = profile?.displayName || user.username;

  return (
    <>
      <main className="app">
        <header className="topbar">
          <div>
            <p className="eyebrow">Welcome back,</p>
            <h1>{name}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button ref={helpRef} type="button" onClick={() => setHowToOpen(true)} className="avatar" aria-label="How to play" style={{ width: '2rem', height: '2rem', fontSize: '0.8rem' }}>?</button>
            {daily && <Link to="/daily" replace className="avatar" style={{ width: 'auto', padding: '0 0.7rem', borderRadius: '0.6rem', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Daily</Link>}
            <Link to="/profile" replace className="home-profile-link" aria-label="Open profile">
              <Avatar name={name || user.username} url={profile?.avatarUrl || user?.avatarUrl} size={34} />
            </Link>
          </div>
        </header>

        {backBlockedMessage && <div className="px-5 pt-3"><Banner variant="info">{backBlockedMessage}</Banner></div>}
        <div className="px-5 pt-3 empty:hidden"><ConnectionBanner /></div>

        <section className="podium" aria-labelledby="podium-title">
          <div className="podium-heading">
            <div>
              <p className="eyebrow">Code Legends</p>
              <h2 id="podium-title">The sharpest minds on guessIo right now</h2>
            </div>
            <Link to="/leaderboards" replace aria-label="View full leaderboard">View rank</Link>
          </div>

          {top.length > 0 ? (
            <Podium items={top} unit="rating" onSelect={setSelected} />
          ) : (
            <p className="text-xs text-mute" style={{ marginTop: '1rem' }}>No ranked players yet. Be the first to climb the board.</p>
          )}

          <div className="home-stats" aria-label="Your statistics">
            <div className="stat home-variant"><strong className="tnum">{(profile?.rating ?? 0).toLocaleString()}</strong><span>Rating</span></div>
            <div className="stat home-variant"><strong className="tnum">{winRate !== null ? `${winRate}%` : '-'}</strong><span>Win rate</span></div>
            <div className="stat home-variant"><strong className="tnum">{played.toLocaleString()}</strong><span>Matches</span></div>
          </div>
        </section>

        <section className="last-games" aria-labelledby="games-title">
          <div className="section-heading home-variant">
            <h2 id="games-title">Last games</h2>
            <Link to="/play" replace className="play">Play now <span aria-hidden="true">&rarr;</span></Link>
          </div>
          {matches.length ? (
            <>
              <div className="game-list">{matches.map((m) => <MatchRow key={m.id} match={m} />)}</div>
              <Link to="/history" replace className="block py-2 text-center text-xs font-bold underline">See all</Link>
            </>
          ) : (
            <p className="card p-3 text-[0.8667rem]">No games yet. Play one and it shows up here.</p>
          )}
        </section>
      </main>
      <BottomNav variant="home-variant" />
      <WelcomeTip userId={user.id} anchorRef={helpRef} open={welcome.tip} onDone={welcome.closeTip} />
      <SkillsIntro open={welcome.intro} onDone={welcome.closeIntro} />
      <WeeklyRecap canShow={!welcome.tip && !welcome.intro} />
      {selected && <PlayerSheet player={selected} onClose={() => setSelected(null)} />}
      <HowToPlayOverlay open={howToOpen} onClose={() => setHowToOpen(false)} />
      <ActiveMatchDialog open={Boolean(activeMatch.matchId)} onResume={activeMatch.resume} onAbandon={activeMatch.abandon} />
    </>
  );
}
