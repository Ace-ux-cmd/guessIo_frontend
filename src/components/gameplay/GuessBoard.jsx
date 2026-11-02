import { useEffect, useRef } from 'react';
import Avatar from '../ui/Avatar';

/**
 * Shared guess history, one row per guess (player avatar + tiles), oldest first,
 * scrolled to the newest. Colours only apply to the viewer's own guesses:
 * feedback is delivered privately to the guesser, so other players' rows show
 * plain digits. A turn that timed out or was frozen adds no row at all.
 *
 * X-Ray Vision: when `xray` is live, rows by the watched player take their
 * colours from the mirrored feedback and are drawn with dashed outlines, so
 * they never read as the viewer's own guesses.
 *
 * HARDCORE uses the same per-digit data as STANDARD but folds "right place"
 * and "wrong place" into one "present" colour.
 */
export default function GuessBoard({
  guessLog,
  players,
  difficulty,
  myUserId = null,
  myFeedbackHistory = null,
  xray = null,
}) {
  const bottomRef = useRef(null);
  // Rows added while this board is mounted play the flip; rows that were
  // already there (a reconnect, a reload) just show their colours. The flip is
  // CSS only, so it never holds up the next player's turn.
  const seenCount = useRef(guessLog.length);
  const flipping = useRef(new Set());
  if (guessLog.length > seenCount.current) {
    for (let i = seenCount.current; i < guessLog.length; i += 1) flipping.current.add(i);
    seenCount.current = guessLog.length;
  }
  const playerFor = (userId) => players.find((p) => p.userId === userId);

  // Online feedback arrives separately (myFeedbackHistory, in the guesser's
  // own guess order); guest entries embed feedback directly.
  const myGuessIndices = myFeedbackHistory
    ? guessLog.map((g, i) => (g.playerId === myUserId ? i : null)).filter((i) => i !== null)
    : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [guessLog.length]);

  if (guessLog.length === 0) {
    return <div className="guess-empty">No guesses yet. Make the first move.</div>;
  }

  return (
    <div className="guess-list">
      {guessLog.map((entry, index) => {
        const isMine = entry.playerId === myUserId;
        let feedback = null;
        let mirrored = false;
        if (isMine) {
          if (myFeedbackHistory) {
            const fi = myGuessIndices.indexOf(index);
            feedback = fi !== -1 ? myFeedbackHistory[fi] : null;
          } else {
            feedback = entry.feedback || null;
          }
        } else if (xray && entry.playerId === xray.targetId) {
          const hit = xray.feed.find((f) => f.guess === entry.guess);
          if (hit) { feedback = hit.feedback; mirrored = true; }
        }
        const p = playerFor(entry.playerId);
        const states = tileStates(feedback, entry.guess.length, difficulty);
        const label = states
          ? `${mirrored ? `X-Ray, ${p?.username || 'player'}, ` : ''}Guess ${entry.guessNumber ?? index + 1}: ` + entry.guess.split('').map((d, i) => `${d} ${STATE_LABEL[states[i]]}`).join(', ')
          : `${p?.username || 'Player'} guessed ${entry.guess}`;
        return (
          <article key={index} className="guess-row">
            <Avatar name={p?.username || '?'} url={p?.avatarUrl} size={34} className="guess-avatar" />
            <div className="digits" role="img" aria-label={label}>
              {entry.guess.split('').map((digit, i) => (
                <span
                  key={i}
                  role="presentation"
                  className={`digit gameplay-variant${states ? ` ${CLASS_OF[states[i]]}` : ''}${mirrored ? ' xr' : ''}${states && !mirrored && flipping.current.has(index) ? ' rv' : ''}`}
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  {digit}
                </span>
              ))}
            </div>
          </article>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

const CLASS_OF = { c: 'correct', p: 'present', w: 'absent' };
const STATE_LABEL = { c: 'right place', p: 'in the code, wrong place', w: 'not in the code' };

function tileStates(feedback, length, difficulty) {
  if (!feedback || !feedback.cellFeedback) return null; // not mine / legacy payload
  return Array.from({ length }, (_, i) => {
    const cell = feedback.cellFeedback[i];
    if (difficulty === 'HARDCORE') return cell === 'NOT_PRESENT' ? 'w' : 'p';
    if (cell === 'CORRECT_POSITION') return 'c';
    if (cell === 'WRONG_POSITION') return 'p';
    return 'w';
  });
}
