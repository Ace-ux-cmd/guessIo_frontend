import { Fragment, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';
import PlayerSheet from '../../components/social/PlayerSheet';
import { useMatchStore } from '../../stores/matchStore';
import { useAuthStore } from '../../stores/authStore';
import { matchTypeLabel, ratingTransition, signed } from '../../lib/format';

const row = (label, value, tone = '') => (
  <div className="detail">
    <span>{label}</span>
    <strong className={`tnum ${tone}`}>{value}</strong>
  </div>
);

export default function Results() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const store = useMatchStore();
  const [selected, setSelected] = useState(null);
  // Set by the first tap on any exit button. A second tap is ignored, and the page
  // stops rendering result content (reset() empties the store, which would otherwise
  // flash the "Match cancelled" view for a frame before the route changes).
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);

  // A refresh empties the match store, leaving nothing to show. Checked once
  // at mount so the reset() in the buttons below cannot trigger this redirect.
  const [noMatchToShow] = useState(() => {
    const { status } = useMatchStore.getState();
    return status !== 'ENDED' && status !== 'CANCELLED';
  });

  const cancelled = store.status === 'CANCELLED';
  const result = store.matchResult;
  const cancellation = store.cancellation;

  // QUIT is its own outcome only when *I* forfeited. An opponent forfeiting
  // still reads as a WIN for me, with a note.
  const iForfeited = result?.forfeitedUserId === user?.id;
  const opponentForfeited = result?.forfeitedUserId && result.forfeitedUserId !== user?.id;
  const wonByDisconnect = opponentForfeited && result?.endReason === 'DISCONNECT_TIMEOUT';
  const wonByOpponentQuit = opponentForfeited && result?.endReason === 'QUIT';

  const outcome = cancelled ? 'CANCELLED'
    : !result ? null
      : iForfeited ? 'QUIT'
        : !result.winnerId ? 'DRAW'
          : result.winnerId === user?.id ? 'WIN' : 'LOSS';

  // Custom (private) matches are never saved and never change rating.
  const isPrivate = store.config?.matchType === 'PRIVATE';
  const isRanked = store.config?.matchType === 'RANKED';
  const winner = result && store.players.find((p) => p.userId === result.winnerId);
  const forfeiter = store.players.find((p) => p.userId === result?.forfeitedUserId);

  // My score first, then everyone else's, e.g. "2 - 1".
  const ordered = [...store.players].sort((a, b) => (a.userId === user?.id ? -1 : b.userId === user?.id ? 1 : 0));
  const scoreLine = result ? ordered.map((p) => result.finalScore?.[p.userId] ?? 0).join(' - ') : '';
  const me = store.players.find((p) => p.userId === user?.id);
  const opponents = store.players.filter((p) => p.userId !== user?.id);

  const ratingDelta = result?.ratingChanges?.[user?.id];
  // The server scores a lone remaining player at 0 on purpose, so an opponent
  // leaving cannot be used to farm rating.
  const noRatingFromForfeit = outcome === 'WIN' && opponentForfeited && ratingDelta === 0;
  const points = !isPrivate ? result?.pointsEarned?.[user?.id] : undefined;
  const cfg = store.config;
  const context = `${matchTypeLabel(cfg?.matchType)}, ${store.players.length} players, ${cfg?.difficulty === 'HARDCORE' ? 'Hardcore' : 'Standard'}`;
  const myTransition = isRanked && ratingDelta !== undefined ? ratingTransition(me?.rating, ratingDelta) : null;
  const ratingLine = myTransition ? `${myTransition.text} (${signed(myTransition.change)})` : null;
  // Every opponent shows old to new, coloured by their own change. The server
  // sends a change for everyone in a ranked match, including players who left.
  const opponentRatings = isRanked
    ? opponents.map((o) => ({ player: o, transition: ratingTransition(o.rating, result?.ratingChanges?.[o.userId]) }))
    : [];

  // Every exit goes through here: once, and with navigation first so the route has
  // already changed by the time the store empties.
  function leave(to) {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    navigate(to, { replace: true });
    store.reset();
  }
  const playAgain = () => leave('/play');
  const goHome = () => leave('/dashboard');
  const viewDetails = () => leave(!store.matchId || isPrivate ? '/dashboard' : `/history/${store.matchId}`);

  if (noMatchToShow) return <Navigate to="/dashboard" replace />;
  if (leaving) return null;

  const tone = outcome === 'WIN' ? 'win' : outcome === 'LOSS' || outcome === 'QUIT' ? 'loss' : outcome === 'DRAW' ? 'draw' : 'void';
  const heroCopy = {
    WIN: { title: 'Victory', text: opponentForfeited ? `${forfeiter?.username || 'An opponent'} left the match.` : 'You outsmarted the table and won the match.' },
    LOSS: { title: 'Defeat', text: `${winner?.username || 'Someone'} cracked the code first and took the match.` },
    DRAW: { title: 'Draw', text: 'No round winner took the match.' },
    QUIT: { title: 'You forfeited', text: 'You left before the match finished. Forfeits can affect your rating.' },
    CANCELLED: { title: 'Match cancelled', text: cancellation?.reason === 'INACTIVITY' ? 'Too many players went idle. No result.' : 'This match could not continue.' },
  }[outcome];
  const showScore = result && !cancelled && outcome !== 'QUIT' && ordered.length > 0;
  const finished = outcome !== 'QUIT' && outcome !== 'CANCELLED';

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Match result</p>
          <p className="round-copy">{finished ? context : 'Match ended'}</p>
        </div>
        <span className="round-copy">Final</span>
      </header>

      <section className={`hero ${tone}`} aria-labelledby="result-title">
        {(outcome === 'WIN' || outcome === 'LOSS' || outcome === 'DRAW') && (
          <div className={`avatar-ring ${tone}`}>
            <Avatar name={user?.username} url={user?.avatarUrl} size={72} />
          </div>
        )}
        <h1 id="result-title">{heroCopy.title}</h1>
        <p>{heroCopy.text}</p>
        {(wonByDisconnect || wonByOpponentQuit) && (
          <p role="status" style={{ color: 'var(--amber)', fontWeight: 700 }}>{wonByDisconnect ? 'Won by opponent disconnect.' : 'Won: opponent forfeited.'}</p>
        )}
      </section>

      {showScore && (
        <section
          className={`score-panel ${tone}`}
          aria-label="Final match score"
          style={{ gridTemplateColumns: ordered.flatMap((_, i) => (i === 0 ? ['minmax(0, 1fr)'] : ['1px', 'minmax(0, 1fr)'])).join(' ') }}
        >
          {ordered.map((p, i) => (
            <Fragment key={p.userId}>
              {i > 0 && <div className="score-divider" aria-hidden="true" />}
              <div className="score-block">
                <strong className="tnum">{result.finalScore?.[p.userId] ?? 0}</strong>
                <span>{p.userId === user?.id ? 'You' : p.username}</span>
              </div>
            </Fragment>
          ))}
        </section>
      )}

      <section className="breakdown" aria-labelledby="breakdown-title">
        {showScore && (
          <>
            <div className="heading">
              <h2 id="breakdown-title">Rounds won</h2>
              <span>Final score</span>
            </div>
            {ordered.map((p) => {
              const won = result.finalScore?.[p.userId] ?? 0;
              const mine = p.userId === user?.id;
              return (
                <div key={p.userId} className={`round-row${p.userId === result.winnerId ? ' win' : ''}`}>
                  <span>
                    {mine ? (
                      <span className="round-name">{p.username} (you)</span>
                    ) : (
                      <button type="button" className="round-name rank-link" onClick={() => setSelected(p)} aria-label={`${p.username}, player options`}>{p.username}</button>
                    )}
                  </span>
                  <span className="round-result tnum">{won} {won === 1 ? 'round' : 'rounds'}</span>
                </div>
              );
            })}
          </>
        )}

        {(ratingLine || points !== undefined) && (
          <>
            <div className="heading" style={{ marginTop: '1rem' }}>
              <h2>Match rewards</h2>
            </div>
            <div className="details" style={{ marginTop: 0 }}>
              {ratingLine && row('Rating', ratingLine, myTransition.tone)}
              {opponentRatings.map(({ player, transition }) => (
                <Fragment key={player.userId}>
                  {row(opponentRatings.length === 1 ? 'Opponent rating' : `${player.username} rating`, transition ? transition.text : '-', transition?.tone)}
                </Fragment>
              ))}
              {points !== undefined && row('Points', signed(points))}
            </div>
          </>
        )}
        {noRatingFromForfeit && (
          <p className="helper">
            No rating change when all your opponents leave, to prevent rating farming. Think this was a mistake? <Link to="/support" className="rank-link" style={{ color: 'var(--lime)' }}>Report it</Link>.
          </p>
        )}
        {cancellation && cancellation.reason === 'INACTIVITY' && (
          <p className="helper">
            No one submitted a valid guess for two full rotations.
            {!isPrivate && ' A rating and points penalty was applied to all remaining players.'}
          </p>
        )}
      </section>

      <footer className="actions results-victory-variant">
        {finished && <button type="button" className="action results-victory-variant primary" onClick={playAgain}>{outcome === 'LOSS' ? 'Try again' : 'Play again'}</button>}
        {store.matchId && !isPrivate && <button type="button" className="action results-victory-variant secondary" onClick={viewDetails}>Match details</button>}
        <button type="button" className={`action results-victory-variant ${finished ? 'tertiary' : 'primary'}`} onClick={goHome}>Back home</button>
      </footer>
      {selected && <PlayerSheet player={selected} matchId={isPrivate ? undefined : store.matchId} onClose={() => setSelected(null)} />}
    </main>
  );
}
