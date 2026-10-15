import { useCallback, useEffect, useRef, useState } from 'react';
import { GuestMatch } from '../game/GuestMatch';
import { generateBotGuess, botThinkingDelayMs } from '../game/botOpponent';
import { saveGuestMatch, loadGuestMatch, clearGuestMatch, hasValidGuestSnapshotShape } from '../game/guestMatchStorage';

const HUMAN_ID = 'guest';
const BOT_ID = 'system';
const PLAYER_TWO_ID = 'player-2';

/**
 * Checks localStorage for a resumable guest match matching the given mode,
 * without constructing a GuestMatch or mutating anything. Callers (e.g.
 * GuestGameplay) use this up front to decide whether to show a "Resume
 * match?" prompt before useGuestMatch runs - per product decision, an
 * in-progress guest match is never silently resumed or silently discarded
 * on return, the player is always asked.
 *
 * @param {{ mode: string }} opts
 * @returns {object|null} the raw stored snapshot, or null if none applies
 */
export function findResumableGuestMatch({ mode }) {
  const restored = loadGuestMatch();
  if (restored && !hasValidGuestSnapshotShape(restored)) {
    clearGuestMatch();
    return null;
  }
  if (restored && restored.status === 'ACTIVE' && restored.mode === mode) {
    return restored;
  }
  return null;
}

/**
 * Drives a guest (offline) match end-to-end: creates/resumes the match,
 * exposes the current round/turn to the UI, submits guesses, and - for
 * VS_COMPUTER mode - automatically plays the bot's turns on a short delay
 * so it reads as "thinking" rather than instant. Every state change is
 * persisted to localStorage so a page refresh mid-match can be offered for
 * resume (see findResumableGuestMatch / game/guestMatchStorage.js).
 *
 * @param {{
 *   difficulty: 'STANDARD'|'HARDCORE',
 *   mode: 'VS_COMPUTER'|'PASS_AND_PLAY',
 *   roundTier?: 'EASY'|'MEDIUM'|'HARD',
 *   playerNames?: { player1?: string, player2?: string },
 *   resumeFrom?: object|null,
 * }} opts resumeFrom, if provided, is a snapshot from findResumableGuestMatch
 *   that the caller has already confirmed with the player; when omitted/null
 *   a brand-new match is started (any old snapshot is discarded).
 */
export function useGuestMatch({ difficulty, mode, roundTier, playerNames, resumeFrom = null }) {
  const matchRef = useRef(null);
  const [, forceRender] = useState(0);
  const rerender = useCallback(() => forceRender((n) => n + 1), []);

  if (!matchRef.current) {
    if (resumeFrom) {
      matchRef.current = GuestMatch.fromJSON(resumeFrom);
    } else {
      const players =
        mode === 'VS_COMPUTER'
          ? [
              { id: HUMAN_ID, name: playerNames?.player1?.trim() || 'Guest', isBot: false },
              { id: BOT_ID, name: 'System', isBot: true },
            ]
          : [
              { id: HUMAN_ID, name: playerNames?.player1?.trim() || 'Player 1', isBot: false },
              { id: PLAYER_TWO_ID, name: playerNames?.player2?.trim() || 'Player 2', isBot: false },
            ];
      matchRef.current = new GuestMatch({ difficulty, mode, roundTier, players });
      matchRef.current.startNextRound();
    }
    saveGuestMatch(matchRef.current.toJSON());
  }

  const match = matchRef.current;

  // Tracks whether the round that just ended is still being displayed
  // (RoundResult pause) before advancing to the next round - see
  // advanceToNextRound below, invoked by the UI after its Continue action.
  // Initialized from the match's own state (not just false) so that
  // resuming a match saved mid-pause (round finished, next round not yet
  // started) correctly re-shows the pause instead of a stale board.
  const [pendingRoundAdvance, setPendingRoundAdvance] = useState(
    () => match.currentRound != null && match.currentRound.status !== 'ACTIVE'
  );
  // Synchronous mirror of pendingRoundAdvance, used only to guard against
  // advanceToNextRound firing twice for the same round-end (React state
  // updates are async, so two calls in the same tick could both still see
  // the old `true` value and both call startNextRound - creating an extra
  // round beyond MAX_ROUNDS_PER_MATCH).
  const advancedRef = useRef(false);

  const persist = useCallback(() => {
    saveGuestMatch(match.toJSON());
    rerender();
  }, [match, rerender]);

  const submitGuess = useCallback(
    (playerId, guess) => {
      const result = match.submitGuess(playerId, guess);
      if (!result.ok) {
        rerender(); // still surface the rejection reason via match state if needed
        return result;
      }
      if (result.roundOver) {
        // Hold on the completed round so the UI shows the RoundResult pause
        // (winner, revealed code, 5s countdown) before moving on - even for
        // the match's final round. The match must never jump straight to
        // the results screen without first showing the last round's
        // outcome; the caller advances explicitly via advanceToNextRound(),
        // which - for a COMPLETED match - just clears the pause flag so the
        // "match ended" effect in GuestGameplay can navigate to results.
        advancedRef.current = false;
        setPendingRoundAdvance(true);
      }
      persist();
      return result;
    },
    [match, persist, rerender]
  );

  const advanceToNextRound = useCallback(() => {
    if (advancedRef.current || !pendingRoundAdvance) return;
    advancedRef.current = true;
    setPendingRoundAdvance(false);
    if (match.status === 'ACTIVE') {
      match.startNextRound();
    } else {
      // Match is COMPLETED: the final round's RoundResult pause has just
      // finished. Only now clear the persisted snapshot - not the moment
      // the round ended - so refreshing mid-pause still resumes into the
      // same RoundResult screen instead of jumping straight to results.
      // Do not persist after clearing, or the completed snapshot would be
      // immediately written back to localStorage.
      clearGuestMatch();
      rerender();
      return;
    }
    persist();
  }, [match, pendingRoundAdvance, persist]);

  // Auto-play the bot's turn in VS_COMPUTER mode.
  useEffect(() => {
    if (mode !== 'VS_COMPUTER') return undefined;
    if (match.status !== 'ACTIVE') return undefined;
    if (pendingRoundAdvance) return undefined; // hold during the round-result pause
    if (match.activePlayerId !== BOT_ID) return undefined;

    const round = match.currentRound;
    const botPreviousGuesses = round.guessLog
      .filter((g) => g.playerId === BOT_ID)
      .map((g) => ({ guess: g.guess, feedback: g.feedback }));

    const timer = setTimeout(() => {
      const guess = generateBotGuess(round.codeLength, botPreviousGuesses, match.difficulty);
      submitGuess(BOT_ID, guess);
    }, botThinkingDelayMs());

    return () => clearTimeout(timer);
    // match.activePlayerId / match.status are read off the ref's live
    // object, so we re-run this effect on every render (cheap, and the
    // guards above make it a no-op unless it's actually the bot's turn).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const abandonMatch = useCallback(() => {
    clearGuestMatch();
  }, []);

  return {
    match,
    humanId: HUMAN_ID,
    opponentId: mode === 'VS_COMPUTER' ? BOT_ID : PLAYER_TWO_ID,
    submitGuess,
    abandonMatch,
    pendingRoundAdvance,
    advanceToNextRound,
  };
}
