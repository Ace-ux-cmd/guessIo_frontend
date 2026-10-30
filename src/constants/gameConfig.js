// Mirrors backend/src/game/matchConfig.js (SRS §2.9). Re-exports from
// game/matchConfig.js, which is the canonical client-side copy shared with
// the guest (offline) match engine - kept as a single source so the two
// never drift apart. This file is kept only so existing imports of
// constants/gameConfig don't need to change.
export { PLAYER_COUNT_CONFIG, MAX_ROUNDS_PER_MATCH } from '../game/matchConfig';

export const SUPPORTED_PLAYER_COUNTS = [2, 3, 4];


export const POINTS_TABLE = {
  STANDARD: { WIN: 3, DRAW: 1, LOSS: 0 },
  HARDCORE: { WIN: 5, DRAW: 1, LOSS: 0 },
};
