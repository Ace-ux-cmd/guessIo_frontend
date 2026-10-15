import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import BottomNav from '../../components/ui/BottomNav';
import Avatar from '../../components/ui/Avatar';
import Icon from '../../components/ui/Icon';
import Tile from '../../components/ui/Tile';
import Button from '../../components/ui/Button';
import { LoadingScreen, ErrorState } from '../../components/ui/Feedback';
import * as matchesApi from '../../api/matches.api';
import { useAuthStore } from '../../stores/authStore';
import { matchTypeLabel, signed } from '../../lib/format';

/** "1m 48s" for >=60s, "42s" under a minute. */
function formatMatchTime(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.round(seconds)}s`;
}

const CHIP = 'inline-flex items-center h-6 px-2 rounded text-xs font-semibold border text-mute border-line';

export default function MatchDetails() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);

  const { data: match, isLoading, isError } = useQuery({
    queryKey: ['match', id],
    queryFn: () => matchesApi.getMatchDetails(id),
  });

  const shell = (children) => (
    <>
      <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col pb-24">
        <header className="flex items-center gap-1 px-4 pt-5 pb-3">
          <Link to="/history" replace className="p-2 text-mute" aria-label="Back"><Icon name="back" /></Link>
          <h1 className="text-xl font-bold flex-1">Match details</h1>
        </header>
        {children}
      </main>
      <BottomNav active="/history" />
    </>
  );

  if (isLoading) return shell(<LoadingScreen />);
  if (isError || !match) return shell(<div className="px-5"><ErrorState description="Could not load this match." /></div>);

  const label = { WIN: 'Victory', LOSS: match.myForfeited ? 'Forfeit' : 'Defeat', DRAW: 'Draw', CANCELLED: 'Cancelled' }[match.outcome] || '—';
  const labelCls = match.outcome === 'WIN' ? 'text-g border-g bg-s2' : match.outcome === 'LOSS' ? 'text-bad border-bad' : 'text-mute border-line';
  const started = match.startedAt ? new Date(match.startedAt) : null;
  const durationSeconds = match.statistics?.totalMatchTimeSeconds;
  const whenText = started
    ? `${started.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}, ${started.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    : null;

  return shell(
    <>
      <section className="px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center h-6 px-2 rounded text-xs font-semibold border ${labelCls}`}>{label}</span>
          <span className={CHIP}>{matchTypeLabel(match.type)}</span>
          <span className={CHIP}>{match.difficulty === 'HARDCORE' ? 'Hardcore' : 'Standard'}</span>
          <span className={CHIP}>{match.playerCount} players</span>
        </div>
        <div className="mt-1 text-sm text-mute">{whenText}{whenText && durationSeconds != null ? '. ' : ''}{durationSeconds != null ? `Lasted ${formatMatchTime(durationSeconds)}.` : ''}</div>

        <div className="mt-5 flex rounded-md bg-s1 py-4">
          {match.participants.map((p) => {
            const win = p.userId === match.winnerId;
            return (
              <div key={p.userId} className="flex-1 text-center">
                <Avatar name={p.username} size={44} url={p.avatarUrl} />
                <div className={`text-sm mt-1 ${p.userId === user?.id || win ? 'font-bold' : 'text-mute'}`}>{p.username}{p.userId === user?.id ? ' (you)' : ''}</div>
                <div className={`font-display font-black text-3xl tnum ${win ? 'text-g' : ''}`}>{p.roundsWon}</div>
              </div>
            );
          })}
        </div>

        {(match.ratingChange !== null || match.pointsEarned !== null) && (
          <div className="mt-3 flex gap-8 justify-center py-2">
            {match.ratingChange !== null && (
              <div>
                <div className="text-xs text-mute">Rating</div>
                <div className={`text-xl font-bold tnum ${match.ratingChange > 0 ? 'text-g' : match.ratingChange < 0 ? 'text-bad' : 'text-mute'}`}>{signed(match.ratingChange)}</div>
              </div>
            )}
            {match.pointsEarned !== null && (
              <div>
                <div className="text-xs text-mute">Points</div>
                <div className="text-xl font-bold tnum">{signed(match.pointsEarned)}</div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="px-5 mt-4">
        <h2 className="font-bold mb-2">Rounds</h2>
        <div className="space-y-2">
          {match.rounds.map((r) => (
            <div key={r.roundNumber} className="flex items-center gap-3 rounded-md bg-s1 p-3">
              <span className="text-xs text-mute w-14 shrink-0">Round {r.roundNumber}</span>
              <div className="flex gap-1">
                {r.secretCode
                  ? r.secretCode.split('').map((d, i) => <Tile key={i} state="raw" size="w-8 h-8 text-sm">{d}</Tile>)
                  : <span className="text-mute">—</span>}
              </div>
              <span className={`ml-auto text-sm font-semibold ${r.winnerId === user?.id ? 'text-g' : 'text-mute'}`}>{r.winnerUsername || 'Draw'}</span>
            </div>
          ))}
        </div>

        <h2 className="font-bold mt-6 mb-2">Stats</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-s1 p-3"><div className="text-xs text-mute">Total guesses</div><div className="text-lg font-bold tnum">{match.statistics?.totalGuesses ?? '—'}</div></div>
          <div className="rounded-md bg-s1 p-3"><div className="text-xs text-mute">Match time</div><div className="text-lg font-bold tnum">{formatMatchTime(durationSeconds)}</div></div>
        </div>

        <div className="mt-7">
          <Link to="/history" replace><Button variant="outline" tabIndex={-1}>Back to history</Button></Link>
        </div>
      </section>
    </>
  );
}
