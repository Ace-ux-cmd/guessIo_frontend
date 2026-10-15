/**
 * Ported from backend/src/game/codeGenerator.js so guest (offline) matches
 * can generate secret codes entirely on the client, with no server round
 * trip. Logic must stay identical to the server's so guest play "feels"
 * the same as a real match. Uses crypto.getRandomValues (Web Crypto, always
 * available in browsers) in place of Node's crypto.randomInt.
 */

function secureRandomInt(maxExclusive) {
  const array = new Uint32Array(1);
  const range = Math.floor(0xffffffff / maxExclusive) * maxExclusive;
  let value;
  do {
    window.crypto.getRandomValues(array);
    value = array[0];
  } while (value >= range);
  return value % maxExclusive;
}

/**
 * Generates a secret code of `length` unique decimal digits.
 * - Digits 0-9, no repeats.
 * - Leading zero is allowed - the code is always a string.
 * - Fisher-Yates shuffle so every permutation of the chosen digit subset is
 *   equally likely, mirroring the server's algorithm exactly.
 */
export function generateSecretCode(length) {
  if (!Number.isInteger(length) || length < 1 || length > 10) {
    throw new Error(`Invalid code length: ${length}`);
  }

  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  for (let i = digits.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }

  return digits.slice(0, length).join('');
}
