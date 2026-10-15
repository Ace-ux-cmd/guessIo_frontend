import { generateSecretCode } from './codeGenerator';
import { validateGuessFormat } from './guessValidator';
import { evaluateGuess } from './guessEvaluator';
import {
  getConfigForRoundTier,
  evaluateMatchProgress,
  MAX_ROUNDS_PER_MATCH,
  DEFAULT_ROUND_TIER,
} from './matchConfig';

/**
 * Round time (seconds) and fastest single guess (seconds + player) for a
 * finished round, computed from its startedAt/endedAt/guessLog[].submittedAt
 * millisecond timestamps. Mirrors the server's equivalent computation in
 * realtime/runtime/Match.js#roundEndedPayload (turn start -> guess
 * submitted), so online and guest play report these the same way.
 *
 * Guest play has no turn-timeout/skip (both seats are always present, no
 * server-side idle handling - see GuestMatch class docs above), so unlike
 * the server we don't need a separate turnStartedAt: a turn always starts
 * exactly when the previous guess was submitted (or, for the round's first
 * turn, when the round started), making "gap since the previous guess" and
 * "this turn's duration" the same value here.
 *
 * @param {{startedAt: number, endedAt: number|null, guessLog: {playerId: string, submittedAt: number}[]}} round
 * @returns {{ roundTimeSeconds: number|null, fastestGuessSeconds: number|null, fastestGuessPlayerId: string|null }}
 */
export function computeRoundTimingStats(round) {
  const roundTimeSeconds = round.startedAt
    ? Math.round(((round.endedAt || Date.now()) - round.startedAt) / 1000)
    : null;

  let fastestGuessSeconds = null;
  let fastestGuessPlayerId = null;
  let previousTimestamp = round.startedAt;
  for (const entry of round.guessLog) {
    if (previousTimestamp && entry.submittedAt) {
      const deltaSeconds = (entry.submittedAt - previousTimestamp) / 1000;
      if (fastestGuessSeconds === null || deltaSeconds < fastestGuessSeconds) {
        fastestGuessSeconds = deltaSeconds;
        fastestGuessPlayerId = entry.playerId;
      }
    }
    previousTimestamp = entry.submittedAt || previousTimestamp;
  }
  if (fastestGuessSeconds !== null) {
    fastestGuessSeconds = Math.round(fastestGuessSeconds * 10) / 10;
  }

  return { roundTimeSeconds, fastestGuessSeconds, fastestGuessPlayerId };
}

/**
 * Client-only, no-server match engine for guest play (SRS: guests play
 * entirely on the client - vs-computer or local pass-and-play - with no
 * match record on the server). Mirrors the shape and rules of the server's
 * Match/Round classes closely enough that the same Gameplay screen can
 * render either an online match or a guest match with minimal branching,
 * but is deliberately simpler: no timers, disconnects, or idle-cycle
 * handling, since both "players" are always present by construction.
 *
 * Matches online semantics: one shared secret code per round, and all
 * players race to crack it (not each other's codes).
 *
 * Player ids are fixed: 'guest' (the human at the keyboard for the current
 * turn) and 'system' (vs-computer) or 'player-2' (pass-and-play). For
 * pass-and-play, both seats are human; the UI is responsible for showing a
 * "pass the device" interstitial between turns using isLocalPassAndPlay.
 */
export class GuestMatch {
  /**
   * @param {{ difficulty: 'STANDARD'|'HARDCORE', mode: 'VS_COMPUTER'|'PASS_AND_PLAY', roundTier?: 'EASY'|'MEDIUM'|'HARD', players: {id: string, name: string, isBot: boolean}[] }} opts
   */
  constructor({ difficulty, mode, roundTier = DEFAULT_ROUND_TIER, players }) {
    if (players.length !== 2) {
      throw new Error('GuestMatch currently supports exactly 2 players.');
    }
    this.difficulty = difficulty;
    this.mode = mode;
    this.roundTier = roundTier;
    this.players = players.map((p) => ({ ...p, roundsWon: 0 }));
    this.config = getConfigForRoundTier(roundTier);
    this.rounds = [];
    this.currentRound = null;
    this.status = 'ACTIVE'; // ACTIVE | COMPLETED
    this.winnerId = null;
    this.turnStartSeat = 0;
  }

  get isLocalPassAndPlay() {
    return this.mode === 'PASS_AND_PLAY';
  }

  startNextRound() {
    const order = this.players.map((p) => p.id);
    const rotated = order.slice(this.turnStartSeat).concat(order.slice(0, this.turnStartSeat));
    this.turnStartSeat = (this.turnStartSeat + 1) % order.length;

    this.currentRound = {
      roundNumber: this.rounds.length + 1,
      secretCode: generateSecretCode(this.config.codeLength),
      codeLength: this.config.codeLength,
      guessLimit: this.config.guessLimit,
      turnOrder: rotated,
      activeIndex: 0,
      guessLog: [], // { playerId, guess, guessNumber, feedback, submittedAt }
      status: 'ACTIVE', // ACTIVE | COMPLETED | DRAW
      winnerId: null,
      startedAt: Date.now(),
      endedAt: null,
    };
    return this.currentRound;
  }

  get activePlayerId() {
    return this.currentRound?.turnOrder[this.currentRound.activeIndex];
  }

  /**
   * One shared secret code per round (matches online semantics): every
   * player races to crack the same code, not each other's.
   */
  targetCodeForActivePlayer() {
    return this.currentRound.secretCode;
  }

  /**
   * @param {string} playerId
   * @param {string} guess
   * @returns {{ok: true, feedback: object, guessNumber: number, isWinningGuess: boolean, roundOver: boolean, matchOver: boolean} | {ok: false, code: string, message: string}}
   */
  submitGuess(playerId, guess) {
    const round = this.currentRound;
    if (!round || round.status !== 'ACTIVE') {
      return { ok: false, code: 'ROUND_FINISHED', message: 'This round has already ended.' };
    }
    if (playerId !== this.activePlayerId) {
      return { ok: false, code: 'NOT_YOUR_TURN', message: 'It is not your turn.' };
    }

    const formatResult = validateGuessFormat(guess, round.codeLength);
    if (!formatResult.valid) {
      return { ok: false, code: formatResult.code, message: formatResult.message };
    }

    const targetCode = this.targetCodeForActivePlayer();
    const feedback = evaluateGuess(this.difficulty, guess, targetCode);
    const guessNumber = round.guessLog.length + 1;
    round.guessLog.push({ playerId, guess, guessNumber, feedback, submittedAt: Date.now() });

    let roundOver = false;
    let matchOver = false;

    if (feedback.isWinningGuess) {
      this._completeRound(playerId);
      roundOver = true;
      matchOver = this.status === 'COMPLETED';
    } else if (round.guessLog.length >= round.guessLimit) {
      // The round's total guess budget (shared across both players, not
      // per-player) is exhausted -> draw. Per product decision, a round
      // must never exceed guessLimit guesses combined.
      this._completeRound(null);
      roundOver = true;
      matchOver = this.status === 'COMPLETED';
    } else {
      round.activeIndex = (round.activeIndex + 1) % round.turnOrder.length;
    }

    return { ok: true, feedback, guessNumber, isWinningGuess: feedback.isWinningGuess, roundOver, matchOver };
  }

  _completeRound(winnerId) {
    const round = this.currentRound;
    round.status = winnerId ? 'COMPLETED' : 'DRAW';
    round.winnerId = winnerId || null;
    round.endedAt = Date.now();
    if (winnerId) {
      const player = this.players.find((p) => p.id === winnerId);
      player.roundsWon += 1;
    }
    this.rounds.push(round);

    const progress = evaluateMatchProgress(
      this.players.map((p) => ({ userId: p.id, roundsWon: p.roundsWon })),
      this.rounds.length
    );
    if (progress.decided || this.rounds.length >= MAX_ROUNDS_PER_MATCH) {
      this.status = 'COMPLETED';
      this.winnerId = progress.winnerId;
    }
  }

  /** Plain-object snapshot, safe to persist to localStorage or hand to React state. */
  toJSON() {
    return {
      difficulty: this.difficulty,
      mode: this.mode,
      roundTier: this.roundTier,
      players: this.players,
      rounds: this.rounds,
      currentRound: this.currentRound,
      status: this.status,
      winnerId: this.winnerId,
      turnStartSeat: this.turnStartSeat,
    };
  }

  static fromJSON(data) {
    const match = new GuestMatch({
      difficulty: data.difficulty,
      mode: data.mode,
      roundTier: data.roundTier || DEFAULT_ROUND_TIER,
      players: data.players.map((p) => ({ id: p.id, name: p.name, isBot: p.isBot })),
    });
    match.players = data.players;
    match.rounds = data.rounds;
    match.currentRound = data.currentRound;
    match.status = data.status;
    match.winnerId = data.winnerId;
    match.turnStartSeat = data.turnStartSeat;
    return match;
  }
}
