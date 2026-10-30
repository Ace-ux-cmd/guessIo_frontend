/**
 * Ported verbatim (logic-for-logic) from backend/src/game/guessEvaluator.js
 * so guest matches score guesses identically to real matches.
 */

const CELL = {
  CORRECT_POSITION: 'CORRECT_POSITION',
  WRONG_POSITION: 'WRONG_POSITION',
  NOT_PRESENT: 'NOT_PRESENT',
};

function evaluateStandard(guess, secretCode) {
  if (guess.length !== secretCode.length) {
    throw new Error('Guess and secret code length mismatch.');
  }

  const secretDigitSet = new Set(secretCode.split(''));
  const cellFeedback = new Array(guess.length);
  let correctPositionCount = 0;
  let wrongPositionCount = 0;

  for (let i = 0; i < guess.length; i += 1) {
    const digit = guess[i];
    if (digit === secretCode[i]) {
      cellFeedback[i] = CELL.CORRECT_POSITION;
      correctPositionCount += 1;
    } else if (secretDigitSet.has(digit)) {
      cellFeedback[i] = CELL.WRONG_POSITION;
      wrongPositionCount += 1;
    } else {
      cellFeedback[i] = CELL.NOT_PRESENT;
    }
  }

  return {
    cellFeedback,
    correctPositionCount,
    wrongPositionCount,
    isWinningGuess: correctPositionCount === secretCode.length,
  };
}

function evaluateHardcore(guess, secretCode) {
  const { cellFeedback, correctPositionCount, wrongPositionCount, isWinningGuess } = evaluateStandard(
    guess,
    secretCode
  );
  // SRS §3.12 UPDATED per product decision (see CHANGES.md "Hardcore mode
  // per-digit feedback"): hardcore now reveals the SAME per-cell
  // correctness as Standard (which digits are present, right position or
  // wrong), just rendered in a single color instead of Standard's
  // green/yellow split - it no longer hides position info entirely. This
  // is a deliberate reversal of the original "count only" design.
  //
  // This file is a client-side port for guest/offline play; the backend
  // (backend/src/game/guessEvaluator.js) has the matching update, so
  // guest and real online Hardcore matches now agree on what a guess
  // reveals.
  return {
    cellFeedback,
    presentCount: correctPositionCount + wrongPositionCount,
    isWinningGuess,
  };
}

/** @param {'STANDARD'|'HARDCORE'} difficulty */
export function evaluateGuess(difficulty, guess, secretCode) {
  if (difficulty === 'HARDCORE') {
    return evaluateHardcore(guess, secretCode);
  }
  return evaluateStandard(guess, secretCode);
}
