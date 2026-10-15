/**
 * Ported verbatim (logic-for-logic) from backend/src/game/guessValidator.js
 * so guest matches validate guesses identically to real matches.
 */

export const REJECTION_CODES = {
  INVALID_LENGTH: 'INVALID_LENGTH',
  NON_NUMERIC: 'NON_NUMERIC',
  DUPLICATE_DIGITS: 'DUPLICATE_DIGITS',
};

/**
 * @param {string} guess
 * @param {number} expectedLength
 * @returns {{ valid: true } | { valid: false, code: string, message: string }}
 */
export function validateGuessFormat(guess, expectedLength) {
  if (typeof guess !== 'string' || guess.length !== expectedLength) {
    return {
      valid: false,
      code: REJECTION_CODES.INVALID_LENGTH,
      message: `Guess must be exactly ${expectedLength} digits.`,
    };
  }

  if (!/^\d+$/.test(guess)) {
    return {
      valid: false,
      code: REJECTION_CODES.NON_NUMERIC,
      message: 'Guess must contain only digits 0-9.',
    };
  }

  const uniqueDigits = new Set(guess.split(''));
  if (uniqueDigits.size !== guess.length) {
    return {
      valid: false,
      code: REJECTION_CODES.DUPLICATE_DIGITS,
      message: 'Guess must not contain duplicate digits.',
    };
  }

  return { valid: true };
}
