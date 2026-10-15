import { useEffect, useRef, useState } from 'react';
import Avatar from '../../components/ui/Avatar';
import Tile from '../../components/ui/Tile';
import Button from '../../components/ui/Button';

/** "1m 48s" for >=60s, "4.2s" for sub-minute (one decimal only when not whole). */
function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—';
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

  return (
    <>
      <section className="flex-1 px-5 pt-12 text-center">
        <div className="text-sm text-mute">Round {result.roundNumber} complete</div>
        <h1 className="mt-2 text-4xl font-bold">
          {isDraw ? 'Round drawn' : winner?.userId === myUserId ? 'You cracked it' : `${winner?.username || 'Someone'} cracked it`}
        </h1>
        {!isDraw && winnerTurns != null && <p className="mt-1 text-mute">In {winnerTurns} {winnerTurns === 1 ? 'turn' : 'turns'}</p>}

        <div className="mt-8 text-sm text-mute">The code was</div>
        <div className="mt-3 flex justify-center gap-2">
          {result.secretCode.split('').map((digit, i) => (
            <span key={i} className="animate-pop" style={{ animationDelay: `${0.2 + i * 0.12}s` }}>
              <Tile state="c" size="w-14 h-14 text-2xl">{digit}</Tile>
            </span>
          ))}
        </div>

        <div className="mt-9 flex rounded-md bg-s1 py-4">
          {players.map((p) => {
            const lead = p.userId === result.winnerId;
            return (
              <div key={p.userId} className="flex-1 text-center">
                <Avatar name={p.username} size={36} url={p.avatarUrl} />
                <div className={`text-sm mt-1 ${p.userId === myUserId || lead ? 'font-bold' : 'text-mute'}`}>{p.username}</div>
                <div className={`font-display font-black text-2xl tnum ${lead ? 'text-g' : ''}`}>{result.score[p.userId] ?? 0}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-s1 p-3 text-left">
            <div className="text-xs text-mute">Round time</div>
            <div className="text-lg font-bold tnum">{formatDuration(result.roundTimeSeconds)}</div>
          </div>
          <div className="rounded-md bg-s1 p-3 text-left">
            <div className="text-xs text-mute">Fastest guess</div>
            <div className="text-lg font-bold tnum">{formatDuration(result.fastestGuessSeconds)}</div>
            {result.fastestGuessUsername && <div className="text-xs text-mute">{result.fastestGuessUsername}</div>}
          </div>
        </div>

        {result.isFinalRound && result.allRounds && result.allRounds.length > 1 && (
          <div className="mt-6 text-left">
            <div className="text-sm text-mute mb-2">All codes this match</div>
            <div className="space-y-2">
              {result.allRounds.map((r) => (
                <div key={r.roundNumber} className="flex items-center justify-between rounded-md bg-s1 px-3 py-2">
                  <span className="text-sm text-mute">Round {r.roundNumber}</span>
                  <div className="flex gap-1">
                    {r.secretCode.split('').map((d, i) => <Tile key={i} state="raw" size="w-7 h-7 text-sm">{d}</Tile>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="px-5 pt-6">
        {manualAdvance ? (
          <>
            <p className="text-center text-sm text-mute">{result.isFinalRound ? 'Match complete' : `Round ${result.roundNumber + 1} is ready`}</p>
            <div className="mt-3">
              <Button onClick={() => onCountdownComplete?.()}>{result.isFinalRound ? 'View match results' : 'Continue'}</Button>
            </div>
          </>
        ) : (
          remaining !== null && (
            <div role="status">
              <p className="text-center text-sm text-mute tnum">
                {result.isFinalRound
                  ? remaining > 0 ? `Match results in ${remaining}s` : 'Loading results…'
                  : remaining > 0 ? `Round ${result.roundNumber + 1} starts in ${remaining}s` : 'Starting next round…'}
              </p>
              <div className="mt-3 h-1 rounded-full bg-line overflow-hidden" aria-hidden="true">
                <div
                  className="h-full bg-g"
                  style={{ width: `${Math.max(0, (remaining / result.nextRoundStartsInSeconds) * 100)}%`, transition: 'width 1s linear' }}
                />
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
}
