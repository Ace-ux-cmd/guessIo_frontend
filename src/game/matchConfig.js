/**
 * Ported verbatim (logic-for-logic) from backend/src/game/matchConfig.js
 * and matchProgress.js. Guest matches are always 2-player, so only that
 * entry is strictly needed, but the full table is kept for parity in case
 * guest pass-and-play is ever extended to more players.
 */

export const PLAYER_COUNT_CONFIG = {
  2: { codeLength: 4, guessLimit: 10 },
  3: { codeLength: 5, guessLimit: 15 },
  4: { codeLength: 6, guessLimit: 20 },
};

/**
 * Guest (offline) matches don't have a player-count knob (always 2 seats),
 * so instead they pick a round "tier" with its own
 * codeLength/guessLimit pairs: EASY=10/4, MEDIUM=12/5, HARD=15/6. These no
 * longer match the multiplayer 3/4 player limits (15 and 20). Kept as a
 * separate table (rather than aliasing
 * PLAYER_COUNT_CONFIG by number) so the two selectors can evolve
 * independently - guest tiers are a difficulty concept, not a headcount.
 */
export const ROUND_TIER_CONFIG = {
  EASY: { codeLength: 4, guessLimit: 10 },
  MEDIUM: { codeLength: 5, guessLimit: 12 },
  HARD: { codeLength: 6, guessLimit: 15 },
};

export const DEFAULT_ROUND_TIER = 'EASY';

export const MAX_ROUNDS_PER_MATCH = 3; // best-of-three

export function getConfigForRoundTier(tier) {
  const config = ROUND_TIER_CONFIG[tier];
  if (!config) {
    throw new Error(`Unsupported round tier: ${tier}`);
  }
  return config;
}

/**
 * Decides whether the match is over after the round that just completed,
 * and if so, who won. See backend/src/game/matchProgress.js for the full
 * rationale; logic reproduced identically here.
 *
 * Rule: after round 2, a single strict leader in roundsWon wins
 * immediately. Otherwise - any tie for the lead, including a 0-0 tie -
 * round 3 is required. Round 3's result is final: a strict leader wins,
 * otherwise the match is a draw.
 *
 * @param {{userId: string, roundsWon: number}[]} players
 * @param {number} roundsPlayed
 * @returns {{decided: boolean, winnerId: string | null}}
 */
export function evaluateMatchProgress(players, roundsPlayed) {
  if (roundsPlayed < 2) {
    return { decided: false, winnerId: null };
  }

  const maxWins = Math.max(...players.map((p) => p.roundsWon));
  const leaders = players.filter((p) => p.roundsWon === maxWins);
  const hasStrictLeader = leaders.length === 1;

  if (roundsPlayed >= MAX_ROUNDS_PER_MATCH) {
    return { decided: true, winnerId: hasStrictLeader ? leaders[0].userId : null };
  }

  if (hasStrictLeader) {
    return { decided: true, winnerId: leaders[0].userId };
  }

  // No strict leader - including a 0-0 tie after both rounds were draws -
  // always goes to a decider round 3. Kept in sync with
  // backend/src/game/matchProgress.js.
  return { decided: false, winnerId: null };
}
