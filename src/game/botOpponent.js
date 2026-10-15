import { generateSecretCode } from './codeGenerator';
import { evaluateGuess } from './guessEvaluator';

/**
 * The "System" opponent for guest solo play.
 *
 * The bot now keeps track of the information revealed by its previous
 * guesses. Instead of blindly generating another random permutation, it
 * builds a set of candidates that are consistent with every piece of
 * feedback it has received:
 *
 * - CORRECT_POSITION -> that digit stays in that exact position.
 * - WRONG_POSITION -> that digit must still be present, but not there.
 * - NOT_PRESENT -> that digit is removed from consideration.
 *
 * This means the bot can learn from each turn and progressively narrow the
 * answer down, while still choosing randomly among equally-valid candidates.
 *
 * @param {number} codeLength
 * @param {{guess: string, feedback: object}[]|string[]} previousAttempts
 * @param {'STANDARD'|'HARDCORE'} difficulty
 * @returns {string}
 */
export function generateBotGuess(codeLength, previousAttempts = [], difficulty = 'STANDARD') {
  const attempts = previousAttempts
    .map((attempt) => {
      if (typeof attempt === 'string') return { guess: attempt, feedback: null };
      return attempt;
    })
    .filter((attempt) => attempt?.guess);

  const seen = new Set(attempts.map((attempt) => attempt.guess));

  // With no feedback yet there is nothing to deduce, so make a normal legal
  // opening guess. Keeping this random preserves the existing first-turn
  // behaviour.
  if (attempts.length === 0 || attempts.some((attempt) => !attempt.feedback)) {
    return generateUnusedRandomGuess(codeLength, seen);
  }

  const candidates = [];
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  // Generate every legal unique-digit permutation for the current code
  // length and keep only candidates whose feedback exactly matches every
  // previous bot attempt. Max is 10P6 = 151,200 candidates for current
  // guest-game tiers, which is small enough to evaluate locally.
  function build(prefix, remaining) {
    if (prefix.length === codeLength) {
      const candidate = prefix.join('');
      if (seen.has(candidate)) return;

      const consistent = attempts.every(({ guess, feedback }) =>
        feedbackMatches(evaluateGuess(difficulty, guess, candidate), feedback)
      );

      if (consistent) candidates.push(candidate);
      return;
    }

    for (const digit of remaining) {
      const nextRemaining = remaining.filter((d) => d !== digit);
      prefix.push(digit);
      build(prefix, nextRemaining);
      prefix.pop();
    }
  }

  build([], digits);

  // A valid game history should always leave at least one candidate: the
  // actual secret. If a stale/corrupt localStorage snapshot somehow makes
  // the history inconsistent, safely fall back to the old legal-guess
  // behaviour rather than breaking the match.
  if (candidates.length === 0) {
    return generateUnusedRandomGuess(codeLength, seen);
  }

  // Random choice among the remaining possibilities keeps the bot from
  // feeling completely scripted while still guaranteeing that every guess
  // respects everything it has learned so far.
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function feedbackMatches(result, feedback) {
  if (!feedback) return false;

  if (Array.isArray(feedback.cellFeedback)) {
    if (!Array.isArray(result.cellFeedback)) return false;
    return feedback.cellFeedback.every((value, index) => value === result.cellFeedback[index]);
  }

  // Defensive support for any older feedback shape that only stored counts.
  return (
    feedback.presentCount === result.presentCount &&
    feedback.isWinningGuess === result.isWinningGuess
  );
}

function generateUnusedRandomGuess(codeLength, seen) {
  // Bounded retry keeps the normal random path cheap in practice.
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = generateSecretCode(codeLength);
    if (!seen.has(candidate)) return candidate;
  }
  return generateSecretCode(codeLength);
}

/**
 * Simulated "thinking" delay before the bot submits its guess, so guest
 * solo play doesn't feel instantaneous/robotic.
 */
export function botThinkingDelayMs() {
  return 900 + Math.floor(Math.random() * 900);
}
