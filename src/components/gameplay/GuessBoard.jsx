import { useEffect, useRef } from 'react';
import Avatar from '../ui/Avatar';
import Tile from '../ui/Tile';

/**
 * Shared guess history, one row per guess (avatar + tiles), oldest first,
 * auto-scrolled to the newest. By default (online) feedback colors only apply
 * to the current viewer's own guesses - feedback is delivered privately to
 * the guesser (API contract 3.3), so other players' rows show the digits
 * with no color.
 *
 * HARDCORE uses the same per-digit data as STANDARD but collapses "right
 * place" and "wrong place" into the single "present" color (see
 * game/guessEvaluator.js) - unchanged from the previous version.
 */
export default function GuessBoard({
  guessLog,
  players,
  difficulty,
  myUserId = null,
  myFeedbackHistory = null,
  freshIndex = -1,
}) {
  const bottomRef = useRef(null);
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
    return <div className="py-8 text-center text-sm text-mute">No guesses yet. Make the first move.</div>;
  }

  return (
    <>
      {guessLog.map((entry, index) => {
        const isMine = entry.playerId === myUserId;
        let feedback = null;
        if (isMine) {
          if (myFeedbackHistory) {
            const fi = myGuessIndices.indexOf(index);
            feedback = fi !== -1 ? myFeedbackHistory[fi] : null;
          } else {
            feedback = entry.feedback || null;
          }
        }
        const p = playerFor(entry.playerId);
        const states = tileStates(feedback, entry.guess.length, difficulty);
        const label = states
          ? `Guess ${entry.guessNumber ?? index + 1}: ` + entry.guess.split('').map((d, i) => `${d} ${STATE_LABEL[states[i]]}`).join(', ')
          : `${p?.username || 'Player'} guessed ${entry.guess}`;
        return (
          <div key={index} className="flex items-center gap-3">
            <Avatar name={p?.username || '?'} size={28} url={p?.avatarUrl} />
            <div className="flex gap-1" role="img" aria-label={label}>
              {entry.guess.split('').map((digit, i) => (
                <span
                  key={i}
                  role="presentation"
                  className={`tile ${states ? states[i] : 'raw'} w-12 h-12 text-2xl ${states && index === freshIndex ? 'flip' : ''}`}
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  {digit}
                </span>
              ))}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </>
  );
}

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
