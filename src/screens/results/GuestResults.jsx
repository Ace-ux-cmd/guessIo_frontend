import { useNavigate, useSearchParams } from 'react-router-dom';

const PLAYER_LABELS = { guest: 'Guest', system: 'System', 'player-2': 'Player 2' };

/**
 * Results for a finished guest (offline) match. No rating/points (guests earn
 * neither - see game/GuestMatch.js) and a sign-up nudge instead of "Match
 * details" (there's no persisted match to view).
 */
export default function GuestResults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const winnerId = searchParams.get('winnerId') || null;
  const winnerName = searchParams.get('winnerName') || null;
  const mode = searchParams.get('mode') || 'VS_COMPUTER';
  const roundsPlayed = searchParams.get('rounds');
  const score = searchParams.get('score'); // "p1RoundsWon-p2RoundsWon"

  const isDraw = !winnerId;
  const winnerLabel = winnerName || (winnerId ? PLAYER_LABELS[winnerId] || winnerId : null);
  const iWon = winnerId === 'guest' || (mode === 'PASS_AND_PLAY' && !isDraw);

  const title = isDraw ? 'Draw' : iWon ? 'Victory' : 'Defeat';
  const tone = isDraw ? 'draw' : iWon ? 'win' : 'loss';
  const [mine, theirs] = score ? score.split('-') : [null, null];
  const nameFor = (side) => (mode === 'PASS_AND_PLAY' ? (side === 0 ? 'Player 1' : 'Player 2') : side === 0 ? 'You' : 'System');

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Match result</p>
          <p className="round-copy">Practice, {mode === 'PASS_AND_PLAY' ? 'pass and play' : 'vs the system'}{roundsPlayed ? ` \u00b7 ${roundsPlayed} round${roundsPlayed === '1' ? '' : 's'} played` : ''}</p>
        </div>
        <span className="round-copy">Final</span>
      </header>

      <section className={`hero ${tone}`} aria-labelledby="result-title">
        <h1 id="result-title">{title}</h1>
        <p>{isDraw ? 'No round winner took the match.' : winnerId === 'guest' && mode !== 'PASS_AND_PLAY' ? 'You outsmarted the system and won the match.' : `${winnerLabel} took the match.`}</p>
      </section>

      {mine !== null && theirs !== null && (
        <section className={`score-panel ${tone}`} aria-label="Final match score">
          <div className="score-block"><strong className="tnum">{mine}</strong><span>{nameFor(0)}</span></div>
          <div className="score-divider" aria-hidden="true" />
          <div className="score-block"><strong className="tnum">{theirs}</strong><span>{nameFor(1)}</span></div>
        </section>
      )}

      <section className="breakdown" aria-labelledby="keep-title">
        <div className="heading"><h2 id="keep-title">Keep your progress</h2><span>Guest match</span></div>
        <div className="details" style={{ marginTop: 0 }}>
          <div className="detail"><span>Saved</span><strong>Nothing was saved</strong></div>
        </div>
        <p className="helper">Sign in with Google to save rating and match history.</p>
      </section>

      <footer className="actions results-victory-variant">
        <button type="button" className="action results-victory-variant primary" onClick={() => navigate('/play?guest=1', { replace: true })}>Play again</button>
        <button type="button" className="action results-victory-variant secondary" onClick={() => navigate('/login', { replace: true })}>Sign in with Google</button>
        <button type="button" className="action results-victory-variant tertiary" onClick={() => navigate('/guest-home', { replace: true })}>Back to practice menu</button>
      </footer>
    </main>
  );
}
