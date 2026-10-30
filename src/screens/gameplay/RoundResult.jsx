import { useEffect, useRef, useState } from 'react';
import Avatar from '../../components/ui/Avatar';

/** "1m 48s" for >=60s, "4.2s" for sub-minute (one decimal only when not whole). */
function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '-';
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }
  return `${Math.round(seconds * 10) / 10}s`;
}

/**
 * Round result (08.2): who cracked it, the revealed code, running score,
 * timing, then a fixed non-skippable countdown into the next round (online:
 * server-timed via Match.afterRoundEnded; guest play shows an explicit
 * Continue button via `manualAdvance`).
 *
 * result.secretCode is the single code all players race to crack each round.
 * result.isFinalRound / result.allRounds (optional): when announcing the
 * match's last round, also list every round's code (guest play supplies these).
 */
export default function RoundResult({ result, players, myUserId, onCountdownComplete, manualAdvance = false }) {
  const [remaining, setRemaining] = useState(result.nextRoundStartsInSeconds);

  useEffect(() => {
    setRemaining(result.nextRoundStartsInSeconds);
  }, [result.roundNumber, result.nextRoundStartsInSeconds]);

  // One interval for the whole countdown (must not depend on `remaining`, or
  // every tick spawns another interval before the previous cleanup runs).
  // Remaining time is derived from a deadline rather than counted per tick, so
  // a throttled background tab cannot make it drift. The ref guard also
  // ensures onCountdownComplete fires once per result, even under StrictMode's
  // double-invoke in development.
  const firedRef = useRef(false);
  useEffect(() => {
    firedRef.current = false;
  }, [result.roundNumber]);

  useEffect(() => {
    if (manualAdvance || result.nextRoundStartsInSeconds === null) return undefined;
    const deadline = Date.now() + result.nextRoundStartsInSeconds * 1000;
    const interval = setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0 && !firedRef.current) {
        firedRef.current = true;
        onCountdownComplete?.();
      }
    }, 250);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualAdvance, result.roundNumber, result.nextRoundStartsInSeconds]);

  const winner = players.find((p) => p.userId === result.winnerId);
  const isDraw = !result.winnerId;

  const guessesByPlayer = {};
  for (const entry of result.guessLog || []) {
    guessesByPlayer[entry.playerId] = (guessesByPlayer[entry.playerId] || 0) + 1;
  }
  const winnerTurns = guessesByPlayer[result.winnerId];

  const roundsWon = (id) => result.score?.[id] ?? 0;
  // The winner first; everyone else keeps the match's player order.
  const ordered = [...players].sort((x, y) => Number(y.userId === result.winnerId) - Number(x.userId === result.winnerId));
  const iWon = winner?.userId === myUserId;
  const totalGuesses = result.guessLog ? result.guessLog.length : null;
  const nextLabel = result.isFinalRound ? 'Match results' : `Round ${result.roundNumber + 1}`;

  return (
    <>
      <header className="topbar">
        <div className="topbar-copy">
          <p className="eyebrow">Round result</p>
        </div>
        <span className="round-state">Round <strong>{result.roundNumber} complete</strong></span>
      </header>

      <section className="result-hero" aria-labelledby="result-title">
        <div className="result-mark">
          {isDraw ? <span aria-hidden="true" style={{ fontSize: '1.8rem', fontWeight: 700 }}>=</span> : <Avatar name={winner?.username || '?'} url={winner?.avatarUrl} size={72} />}
        </div>
        <h1 id="result-title">
          {isDraw ? 'Round drawn' : iWon ? 'You cracked it' : `${winner?.username || 'Someone'} cracked it`}
        </h1>
        <p>
          {isDraw
            ? 'Nobody solved the code this round.'
            : winnerTurns != null
              ? `${iWon ? 'You' : winner?.username || 'They'} solved the code in ${winnerTurns} ${winnerTurns === 1 ? 'turn' : 'turns'}.`
              : 'The code was cracked.'}
        </p>
      </section>

      <section className="code-card" aria-labelledby="code-title">
        <p className="label" id="code-title">The shared code</p>
        <div className="secret-code" role="img" aria-label={`The shared code is ${result.secretCode.split('').join(' ')}`}>
          {result.secretCode.split('').map((digit, i) => (
            <span key={i} className="digit round-results-variant animate-pop" style={{ animationDelay: `${0.2 + i * 0.12}s` }}>{digit}</span>
          ))}
        </div>
      </section>

      <section className="section round-results-variant" aria-labelledby="standings-title">
        <div className="section-heading round-results-variant">
          <h2 id="standings-title">Round standings</h2>
          <span>First to solve wins</span>
        </div>
        <div className="standings">
          {ordered.map((p) => {
            const isWinner = p.userId === result.winnerId;
            const n = guessesByPlayer[p.userId] || 0;
            return (
              <article key={p.userId} className={`player round-results-variant${isWinner ? ' winner' : ''}`}>
                <span className="place" aria-hidden="true">{isWinner ? '1' : ''}</span>
                <Avatar name={p.username} url={p.avatarUrl} size={32} />
                <span className="player-copy">
                  <span className="player-name round-results-variant">{p.userId === myUserId ? `${p.username} (you)` : p.username}</span>
                  <span className="player-note">{isWinner ? 'Cracked the code' : `${n} ${n === 1 ? 'guess' : 'guesses'}`}</span>
                </span>
                <span className="rounds-won">{roundsWon(p.userId)} {roundsWon(p.userId) === 1 ? 'round' : 'rounds'} won</span>
              </article>
            );
          })}
        </div>

        <div className="stats round-results-variant" aria-label="Round statistics" style={{ gridTemplateColumns: `repeat(${totalGuesses != null ? 3 : 2}, 1fr)` }}>
          <div className="stat round-results-variant"><strong className="tnum">{formatDuration(result.roundTimeSeconds)}</strong><span>Round time</span></div>
          <div className="stat round-results-variant">
            <strong className="tnum">{formatDuration(result.fastestGuessSeconds)}</strong>
            <span>Fastest guess{result.fastestGuessUsername ? ` (${result.fastestGuessUsername})` : ''}</span>
          </div>
          {totalGuesses != null && <div className="stat round-results-variant"><strong className="tnum">{totalGuesses}</strong><span>Total guesses</span></div>}
        </div>

        {result.isFinalRound && result.allRounds && result.allRounds.length > 1 && (
          <>
            <div className="section-heading round-results-variant"><h2>All codes this match</h2></div>
            <div className="details" style={{ marginTop: 0, paddingBottom: '1.2rem' }}>
              {result.allRounds.map((r) => (
                <div key={r.roundNumber} className="detail" style={{ alignItems: 'center' }}>
                  <span>Round {r.roundNumber}</span>
                  <span className="digits" style={{ gap: '0.25rem' }} role="img" aria-label={`Code ${r.secretCode.split('').join(' ')}`}>
                    {r.secretCode.split('').map((d, i) => <span key={i} className="digit match-details-variant">{d}</span>)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <footer className="next-round">
        {manualAdvance ? (
          <>
            <div className="countdown"><span>{result.isFinalRound ? 'Match complete' : `Round ${result.roundNumber + 1} is ready`}</span></div>
            <button type="button" className="continue" onClick={() => onCountdownComplete?.()}>{result.isFinalRound ? 'View match results' : `Prepare for round ${result.roundNumber + 1}`}</button>
          </>
        ) : remaining !== null && (
          <div role="status">
            <div className="countdown">
              <span className="tnum">
                {result.isFinalRound
                  ? remaining > 0 ? `Match results in ${remaining}s` : 'Loading results…'
                  : remaining > 0 ? `Round ${result.roundNumber + 1} starts in ${remaining}s` : 'Starting next round…'}
              </span>
            </div>
            <div className="countdown-bar" aria-hidden="true">
              <div style={{ width: `${Math.max(0, (remaining / result.nextRoundStartsInSeconds) * 100)}%` }} />
            </div>
          </div>
        )}
      </footer>
    </>
  );
}
