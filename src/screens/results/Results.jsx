import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Avatar from '../../components/ui/Avatar';
import { useMatchStore } from '../../stores/matchStore';
import { useAuthStore } from '../../stores/authStore';
import { matchTypeLabel, signed } from '../../lib/format';

// Headline treatment per outcome (09 / 09.2 / 09.3 / 09.4 / 09.5).
const META = {
  WIN: { title: 'Victory', titleCls: 'text-g text-6xl', bg: 'bg-gradient-to-b from-g/25 to-transparent' },
  LOSS: { title: 'Defeat', titleCls: 'text-5xl', bg: '' },
  DRAW: { title: 'Draw', titleCls: 'text-ink text-5xl', bg: 'bg-gradient-to-b from-line to-transparent' },
  QUIT: { title: 'Forfeit', titleCls: 'text-bad text-5xl', bg: '' },
  CANCELLED: { title: 'Cancelled', titleCls: 'text-ink text-5xl', bg: 'bg-gradient-to-b from-line to-transparent' },
};

export default function Results() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const store = useMatchStore();

  // A refresh empties the match store, leaving nothing to show. Checked once
  // at mount so the reset() in the buttons below cannot trigger this redirect.
  const [noMatchToShow] = useState(() => {
    const { status } = useMatchStore.getState();
    return status !== 'ENDED' && status !== 'CANCELLED';
  });

  const cancelled = store.status === 'CANCELLED';
  const result = store.matchResult;
  const cancellation = store.cancellation;

  // QUIT is its own outcome only when *I* forfeited - an opponent forfeiting
  // still reads as a WIN for me, with a note below.
  const iForfeited = result?.forfeitedUserId === user?.id;
  const opponentForfeited = result?.forfeitedUserId && result.forfeitedUserId !== user?.id;
  const wonByDisconnect = opponentForfeited && result?.endReason === 'DISCONNECT_TIMEOUT';
  const wonByOpponentQuit = opponentForfeited && result?.endReason === 'QUIT';

  const outcome = cancelled ? 'CANCELLED'
    : !result ? null
      : iForfeited ? 'QUIT'
        : !result.winnerId ? 'DRAW'
          : result.winnerId === user?.id ? 'WIN' : 'LOSS';
  const meta = META[outcome] || { title: '—', titleCls: 'text-5xl', bg: '' };

  // Private-room matches are never persisted server-side, so no /history/:id.
  const isPrivate = store.config?.matchType === 'PRIVATE';
  const winner = result && store.players.find((p) => p.userId === result.winnerId);

  // My score first, then everyone else's, e.g. "2 - 1".
  const ordered = [...store.players].sort((a, b) => (a.userId === user?.id ? -1 : b.userId === user?.id ? 1 : 0));
  const scoreLine = result ? ordered.map((p) => result.finalScore?.[p.userId] ?? 0).join(' - ') : '';

  const ratingDelta = result?.ratingChanges?.[user?.id];
  // The server scores a lone remaining player at 0 on purpose, so an opponent
  // leaving cannot be used to farm rating.
  const noRatingFromForfeit = outcome === 'WIN' && opponentForfeited && ratingDelta === 0;
  const points = !isPrivate ? result?.pointsEarned?.[user?.id] : undefined;
  const cfg = store.config;
  const context = outcome === 'QUIT' || outcome === 'CANCELLED'
    ? 'Match ended'
    : `${matchTypeLabel(cfg?.matchType)}, ${store.players.length} players, ${cfg?.difficulty === 'HARDCORE' ? 'Hardcore' : 'Standard'}`;

  const sub = outcome === 'QUIT' ? 'You left before the match finished'
    : outcome === 'CANCELLED' ? (cancellation?.reason === 'INACTIVITY' ? 'Too many players went idle. No result.' : 'This match could not continue.')
      : outcome === 'DRAW' ? 'No round winner took the match'
        : outcome === 'WIN' ? (opponentForfeited ? `${store.players.find((p) => p.userId === result.forfeitedUserId)?.username || 'An opponent'} left the match` : 'You took the match')
          : outcome === 'LOSS' ? `${winner?.username || 'Someone'} took the match` : '';

  function playAgain() { store.reset(); navigate('/play', { replace: true }); }
  function goHome() { store.reset(); navigate('/dashboard', { replace: true }); }
  function viewDetails() {
    if (!store.matchId || isPrivate) return goHome();
    const matchId = store.matchId;
    store.reset();
    navigate(`/history/${matchId}`, { replace: true });
  }

  if (noMatchToShow) return <Navigate to="/dashboard" replace />;

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col pb-6">
      <section className={`relative px-5 pt-14 pb-8 text-center ${meta.bg}`}>
        <div className="text-sm text-mute">{context}</div>
        <h1 className={`mt-2 font-display font-black animate-pop ${meta.titleCls}`}>{meta.title}</h1>
        <p className="mt-2 text-mute">{sub}</p>

        {(wonByDisconnect || wonByOpponentQuit) && (
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-warn font-semibold">
            <Icon name="alert" className="w-4 h-4" />{wonByDisconnect ? 'Won by opponent disconnect' : 'Won: opponent forfeited'}
          </div>
        )}
        {outcome === 'QUIT' && (
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-warn font-semibold">
            <Icon name="alert" className="w-4 h-4" />Forfeits can affect your rating
          </div>
        )}

        {result && outcome !== 'QUIT' && scoreLine && (
          <div className="mt-2 font-display font-black text-5xl tnum">{scoreLine}</div>
        )}

        {(ratingDelta !== undefined || points !== undefined) && (
          <div className="mt-6 flex justify-center gap-8">
            {ratingDelta !== undefined && (
              <div>
                <div className="text-xs text-mute">Rating</div>
                <div className={`text-2xl font-bold tnum ${ratingDelta > 0 ? 'text-g' : ratingDelta < 0 ? 'text-bad' : 'text-mute'}`}>{signed(ratingDelta)}</div>
              </div>
            )}
            {points !== undefined && (
              <div>
                <div className="text-xs text-mute">Points</div>
                <div className="text-2xl font-bold tnum">{signed(points)}</div>
              </div>
            )}
          </div>
        )}

        {noRatingFromForfeit && (
          <p className="mt-4 mx-auto max-w-[30ch] text-xs text-mute">
            No rating change when all your opponents leave, to prevent rating farming.
            {' '}Think this was a mistake? <Link to="/support" className="text-g font-semibold">Report it</Link>.
          </p>
        )}
      </section>

      <section className="px-5">
        {result && !cancelled && outcome !== 'QUIT' && (
          <>
            <h2 className="font-bold mb-2">Rounds won</h2>
            <div className="space-y-2">
              {ordered.map((p) => {
                const won = result.finalScore?.[p.userId] ?? 0;
                return (
                  <div key={p.userId} className="flex items-center gap-3 rounded-md bg-s1 p-3">
                    <Avatar name={p.username} size={32} url={p.avatarUrl} />
                    <span className={`flex-1 font-semibold ${p.userId === result.winnerId ? 'text-g' : ''}`}>
                      {p.username}{p.userId === user?.id && <span className="ml-2 text-xs text-mute font-normal">You</span>}
                    </span>
                    <span className="font-display font-bold tnum">{won}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {cancellation && cancellation.reason === 'INACTIVITY' && (
          <p className="mt-4 text-sm text-mute text-center">
            No one submitted a valid guess for two full rotations.
            {!isPrivate && ' A rating and points penalty was applied to all remaining players.'}
          </p>
        )}

        <div className="mt-7 space-y-2.5">
          {outcome !== 'QUIT' && outcome !== 'CANCELLED' && <Button onClick={playAgain}>{outcome === 'LOSS' ? 'Try again' : 'Play again'}</Button>}
          {store.matchId && !isPrivate && <Button variant="outline" onClick={viewDetails}>Match details</Button>}
          <Button variant={outcome === 'QUIT' || outcome === 'CANCELLED' ? 'primary' : 'text'} onClick={goHome}>Back home</Button>
        </div>
      </section>
    </main>
  );
}
