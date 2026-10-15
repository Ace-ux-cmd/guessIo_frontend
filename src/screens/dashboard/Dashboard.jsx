import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNav from '../../components/ui/BottomNav';
import Avatar from '../../components/ui/Avatar';
import Icon from '../../components/ui/Icon';
import Tile from '../../components/ui/Tile';
import Wordmark from '../../components/ui/Wordmark';
import ConnectionBanner from '../../components/ui/ConnectionBanner';
import HowToPlayOverlay from '../../components/ui/HowToPlayOverlay';
import ActiveMatchDialog from '../../components/ui/ActiveMatchDialog';
import { Banner, LoadingScreen, ErrorState } from '../../components/ui/Feedback';
import Button from '../../components/ui/Button';
import { useCurrentUser } from '../../hooks/useAuth';
import { useMatches } from '../../hooks/useMatches';
import { useActiveMatchCheck } from '../../hooks/useActiveMatchCheck';
import { useAuthStore } from '../../stores/authStore';
import { formatRelativeTime, joinNames, matchTypeLabel, outcomeInfo, scoreText, signed } from '../../lib/format';

// Decorative hero tiles (design art, not data).
const HERO_TILES = [
  ['5', 'c'], ['2', 'p'], ['8', 'w'], ['1', 'c'], ['9', 'w'],
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [howToOpen, setHowToOpen] = useState(false);
  const consumeBackToLoginBlockedMessage = useAuthStore((s) => s.consumeBackToLoginBlockedMessage);
  // See useBackNavigationGuard.js: shown once when we landed here because an
  // authenticated user tried to back into /login.
  const [backBlockedMessage] = useState(() => consumeBackToLoginBlockedMessage());
  const { data: user, isLoading: userLoading, isError: userError } = useCurrentUser();
  const { data: matchesPage, isLoading: matchesLoading } = useMatches({ pageSize: 3 });
  const activeMatch = useActiveMatchCheck();

  if (userLoading) return <main className="mx-auto w-full max-w-[430px] min-h-screen"><LoadingScreen label="Loading…" /></main>;
  if (userError || !user) {
    return (
      <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col px-5 pt-14">
        <ErrorState
          title="Couldn't load your home"
          description="Check your connection and try again."
          action={<Button onClick={() => window.location.reload()}>Retry</Button>}
        />
      </main>
    );
  }

  const name = user.displayName || user.username;
  const played = user.statistics?.matchesPlayed ?? 0;
  const won = user.statistics?.matchesWon ?? 0;
  const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
  const matches = matchesPage?.items || [];
  const last = matches[0];
  const lastInfo = last ? outcomeInfo(last.outcome) : null;

  return (
    <>
      <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col pb-24">
        <header className="flex items-center justify-between px-5 pt-5">
          <Wordmark className="text-xl" />
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setHowToOpen(true)} className="p-2 text-mute" aria-label="How to play">
              <Icon name="help" />
            </button>
            <Link to="/profile" replace aria-label="Profile">
              <Avatar name={name} size={32} url={user.avatarUrl} />
            </Link>
          </div>
        </header>

        {(backBlockedMessage) && (
          <div className="px-5 mt-4"><Banner variant="info">{backBlockedMessage}</Banner></div>
        )}
        <div className="px-5 empty:hidden mt-4 empty:mt-0"><ConnectionBanner /></div>

        <section className="px-5 mt-5">
          <div className="surface rounded-md border border-line px-5 pt-5 pb-4">
            <p className="text-sm text-mute">Welcome back, {name}</p>
            <div className="mt-5 flex justify-center gap-2" aria-hidden="true">
              {HERO_TILES.map(([d, s], i) => (
                <Tile key={i} state={s} className="flip" size="w-14 h-14 text-3xl" style={{ animationDelay: `${i * 120}ms` }}>{d}</Tile>
              ))}
            </div>
            <h1 className="mt-6 font-display font-black text-3xl leading-tight">Crack the code.</h1>
            <p className="mt-1 text-sm text-mute">Ranked match, 2 to 4 players</p>
            <Link to="/play" replace className="cut mt-5 flex items-center justify-center h-14 bg-g text-bg text-lg font-bold">Play</Link>
            {last && (
              <Link to={`/history/${last.id}`} replace className="mt-4 pt-3 border-t border-line flex items-center justify-between text-sm">
                <span className="text-mute">Last game</span>
                <span className="font-semibold tnum">
                  <span className={lastInfo.text}>{lastInfo.label}</span> · {scoreText(last)} · {signed(last.ratingChange)}
                </span>
              </Link>
            )}
          </div>
        </section>

        <section className="px-5 mt-7">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Recent matches</h2>
            <Link to="/history" replace className="text-sm text-g font-semibold">See all</Link>
          </div>
          {matchesLoading ? (
            <div className="mt-3 space-y-2"><div className="h-14 rounded-md bg-s1 animate-pulse" /><div className="h-14 rounded-md bg-s1 animate-pulse" /></div>
          ) : matches.length ? (
            <div className="mt-1 divide-y divide-line">
              {matches.map((m) => {
                const info = outcomeInfo(m.outcome);
                return (
                  <Link key={m.id} to={`/history/${m.id}`} replace className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">
                        <span className={info.text}>{info.label}</span>{' '}
                        <span className="text-mute font-normal">vs {joinNames(m.opponents.map((o) => o.username))}</span>
                      </div>
                      <div className="mt-1 text-xs text-mute">{matchTypeLabel(m.type)} · {formatRelativeTime(m.endedAt || m.startedAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold tnum ${m.ratingChange == null || m.ratingChange === 0 ? 'text-mute' : m.ratingChange < 0 ? 'text-bad' : 'text-g'}`}>{signed(m.ratingChange)}</div>
                      <div className="text-xs text-mute tnum">{scoreText(m)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-line p-6 text-center">
              <div className="font-bold">No matches yet</div>
              <p className="text-sm text-mute mt-1">Play your first game and it shows up here.</p>
            </div>
          )}
        </section>

        <section className="px-5 mt-8 pt-5 border-t border-line flex items-end justify-between">
          <div>
            <div className="text-xs text-mute">Rating</div>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-black text-2xl tnum">{user.rating}</span>
              {last?.ratingChange != null && (
                <span className={`font-bold text-sm tnum ${last.ratingChange < 0 ? 'text-bad' : 'text-g'}`}>{signed(last.ratingChange)}</span>
              )}
            </div>
          </div>
          <div className="flex gap-6 text-right">
            <div><div className="text-xs text-mute">Win rate</div><div className="font-bold tnum">{winRate}%</div></div>
            <div><div className="text-xs text-mute">Matches</div><div className="font-bold tnum">{played}</div></div>
          </div>
        </section>
      </main>
      <BottomNav />
      <HowToPlayOverlay open={howToOpen} onClose={() => setHowToOpen(false)} />
      <ActiveMatchDialog open={Boolean(activeMatch.matchId)} onResume={activeMatch.resume} onAbandon={activeMatch.abandon} />
    </>
  );
}
