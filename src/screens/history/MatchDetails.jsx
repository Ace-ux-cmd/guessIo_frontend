import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { PageSkeleton, ErrorState } from '../../components/ui/Feedback';
import Avatar from '../../components/ui/Avatar';
import * as matchesApi from '../../api/matches.api';
import { useAuthStore } from '../../stores/authStore';
import { matchTypeLabel, signed } from '../../lib/format';

/** "03:50" from a number of seconds. */
function formatClock(seconds) {
  if (seconds === null || seconds === undefined) return '-';
  const total = Math.round(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function MatchDetails() {
  const { id } = useParams();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const backTo = ['/history', '/dashboard', '/results'].includes(location.state?.from) ? location.state.from : '/history';

  const { data: match, isLoading, isError } = useQuery({
    queryKey: ['match', id],
    queryFn: () => matchesApi.getMatchDetails(id),
  });

  const shell = (children) => (
    <main className="app">
      <header className="topbar with-back leading">
        <Link to={backTo} replace aria-label="Back" className="back">&larr;</Link>
        <div>
          <h1 className="sr-only">Match details</h1>
          <p className="eyebrow">Match details</p>
        </div>
      </header>
      {children}
    </main>
  );

  if (isLoading) return <PageSkeleton cards={4} />;
  if (isError || !match) return shell(<div className="content"><ErrorState description="Could not load this match." /></div>);

  const label = { WIN: 'Victory', LOSS: match.myForfeited ? 'Forfeit' : 'Defeat', DRAW: 'Draw', CANCELLED: 'Cancelled' }[match.outcome] || '-';
  const started = match.startedAt ? new Date(match.startedAt) : null;
  const dateText = started ? started.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const durationSeconds = match.statistics?.totalMatchTimeSeconds;
  const me = match.participants.find((p) => p.userId === user?.id);
  const myName = me?.username;
  const scores = match.participants.map((p) => p.roundsWon);
  const hasResult = match.outcome === 'WIN' || match.outcome === 'LOSS' || match.outcome === 'DRAW';
  const showRating = match.ratingChange !== null && match.ratingChange !== undefined;
  const showPoints = match.pointsEarned !== null && match.pointsEarned !== undefined;

  return shell(
    <div className="content">
      <section className="result-strip" aria-label="Match result" style={match.outcome === 'LOSS' ? { borderColor: 'rgba(255, 80, 110, 0.35)', background: 'radial-gradient(circle at center, rgba(255, 80, 110, 0.14), transparent 68%), rgba(255, 80, 110, 0.07)', boxShadow: '0 0 35px rgba(255, 80, 110, 0.1)' } : undefined}>
        <div>
          <strong style={match.outcome === 'LOSS' ? { color: 'var(--red)' } : match.outcome === 'DRAW' || match.outcome === 'CANCELLED' ? { color: 'var(--amber)' } : undefined}>{label}</strong>
          <span>{matchTypeLabel(match.type)} &middot; {match.difficulty === 'HARDCORE' ? 'Hardcore' : 'Standard'}{dateText ? ` · ${dateText}` : ''}</span>
        </div>
        {hasResult && <div className="final-score tnum">{scores.join(' - ')}</div>}
      </section>

      <section className="section match-details-variant" aria-labelledby="players-title">
        <div className="section-heading match-details-variant">
          <h2 id="players-title">Players</h2>
          <span>Rounds won</span>
        </div>
        <div className="players match-details-variant">
          {match.participants.map((p) => {
            const isMe = p.userId === user?.id;
            const winner = p.userId === match.winnerId;
            return (
              <article key={p.userId} className={`player match-details-variant${isMe ? ' you' : ''}`}>
                <Avatar name={p.username} url={p.avatarUrl} size={32} className="avatar match-details-variant mini-avatar" />
                <span>
                  <span className="player-name match-details-variant">{isMe ? `${p.username} (you)` : p.username}</span>
                  <span className="player-detail">{winner ? 'Match winner' : isMe ? 'You' : 'Opponent'}</span>
                </span>
                <span className="player-score tnum">{p.roundsWon}</span>
              </article>
            );
          })}
        </div>
      </section>

      {match.rounds.length > 0 && (
        <section className="section match-details-variant" aria-labelledby="rounds-title">
          <div className="section-heading match-details-variant">
            <h2 id="rounds-title">Rounds</h2>
            <span>Codes revealed</span>
          </div>
          <div className="rounds">
            {match.rounds.map((r) => {
              const won = r.winnerUsername && r.winnerUsername === myName;
              const status = !r.winnerUsername ? 'Draw' : won ? 'Won' : 'Lost';
              return (
                <article key={r.roundNumber} className={`round-card${won ? ' won' : ''}`}>
                  <div className="round-head"><strong>Round {r.roundNumber}</strong> <span className="round-status" style={won ? undefined : { color: r.winnerUsername ? 'var(--red)' : 'var(--amber)' }}>{status}</span></div>
                  {r.secretCode ? (
                    <div className="code" aria-label={`Code ${r.secretCode}`}>
                      {r.secretCode.split('').map((d, i) => <span key={i} className="digit match-details-variant">{d}</span>)}
                    </div>
                  ) : (
                    <p className="player-detail">Code not available</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="section match-details-variant" aria-labelledby="stats-title">
        <div className="section-heading match-details-variant">
          <h2 id="stats-title">Match statistics</h2>
        </div>
        <div className="stats match-details-variant">
          <div className="stat match-details-variant"><strong className="tnum">{formatClock(durationSeconds)}</strong><span>Total time</span></div>
          <div className="stat match-details-variant"><strong className="tnum">{match.statistics?.totalGuesses ?? '-'}</strong><span>Total guesses</span></div>
          {showRating && <div className="stat match-details-variant"><strong className="tnum" style={{ color: match.ratingChange > 0 ? 'var(--lime)' : match.ratingChange < 0 ? 'var(--red)' : undefined }}>{signed(match.ratingChange)}</strong><span>Rating</span></div>}
          {showPoints && <div className="stat match-details-variant"><strong className="tnum">{signed(match.pointsEarned)}</strong><span>Points</span></div>}
        </div>
      </section>

      <footer className="footer" style={{ padding: '1.25rem 0 0' }}>
        <Link to="/dashboard" replace className="home-button" style={{ display: 'block', textAlign: 'center' }}>Back to home</Link>
      </footer>
    </div>
  );
}
