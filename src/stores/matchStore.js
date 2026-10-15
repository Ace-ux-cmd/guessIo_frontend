import { create } from 'zustand';

// Persisted the same way authStore persists tokens (sessionStorage, not
// localStorage - see App.jsx's AppBoot comment): survives a same-tab
// refresh but not a closed tab/browser, which is the right lifetime for
// "reconnect to the match I was just in", not "resurrect a match from
// days ago". This is the only piece of match state persisted - everything
// else (round state, guesses, score...) is always rebuilt fresh from the
// server's match.snapshot response (see applySnapshot below and
// useMatchReconnect.js), never read back from storage directly.
const MATCH_ID_KEY = 'guessio.activeMatchId';

function persistMatchId(matchId) {
  try {
    if (matchId) sessionStorage.setItem(MATCH_ID_KEY, matchId);
    else sessionStorage.removeItem(MATCH_ID_KEY);
  } catch {
    // Storage can throw (private browsing, quota, disabled) - reconnect-
    // after-refresh simply won't work this session, same as if nothing
    // had been persisted; not worth surfacing to the player.
  }
}

/** Read once at boot (see useMatchReconnect.js) - not reactive, since
 * nothing should re-run this after the initial mount. */
export function readPersistedMatchId() {
  try {
    return sessionStorage.getItem(MATCH_ID_KEY);
  } catch {
    return null;
  }
}

const initialState = {
  matchId: null,
  status: 'IDLE', // IDLE | FOUND | STARTING | ACTIVE | ROUND_ENDED | ENDED | CANCELLED
  players: [],
  config: null, // { matchType, difficulty, playerCount }
  queuePlayersWaiting: 1, // live count while in queue, from queue.progress (see Matchmaking.jsx)
  queuePlayers: [], // { userId, username, avatarUrl } of everyone currently in the forming group
  roundNumber: 0,
  completedRounds: 0,
  guessLimit: null,
  turnOrder: [],
  activePlayerId: null,
  turnDurationSeconds: null,
  turnRemainingSeconds: null, // only set by a reconnect snapshot, for a turn already in progress
  guessLog: [], // { playerId, guess, guessNumber }
  myFeedbackHistory: [], // feedback objects for the current round, in guess order
  lastRejection: null,
  score: {},
  roundResult: null, // { roundNumber, winnerId, secretCode, score, guessLog, nextRoundStartsInSeconds }
  matchResult: null, // { winnerId, finalScore, ratingChanges, pointsEarned }
  cancellation: null, // { reason, penalties }
  inactivityWarning: null,
  disconnectedPlayerIds: [],
  // Bumped by the global back-navigation guard's synchronous safety-net
  // (see useBackNavigationGuard.js) when a back-press arrives before
  // Gameplay.jsx's own useBackButtonHandler has registered - e.g. the
  // brief window right after a refresh, before effects have run. A
  // counter rather than a boolean so Gameplay.jsx's effect fires on every
  // request even if two arrive before it re-renders once.
  resignPromptRequestId: 0,
};

export const useMatchStore = create((set, get) => ({
  ...initialState,

  reset: () => {
    persistMatchId(null);
    set(initialState);
  },

  onMatchFound: (payload) => {
    persistMatchId(payload.matchId);
    set({
      matchId: payload.matchId,
      status: 'FOUND',
      players: payload.players,
      config: payload.config,
    });
  },

  onQueueProgress: (payload) =>
    set({ queuePlayersWaiting: payload.playersWaiting, queuePlayers: payload.players ?? [] }),

  onMatchStarting: () => set({ status: 'STARTING' }),

  onRoundStarted: (payload) =>
    set({
      status: 'ACTIVE',
      roundNumber: payload.roundNumber,
      guessLimit: payload.guessLimit,
      turnOrder: payload.turnOrder,
      guessLog: [],
      myFeedbackHistory: [],
      roundResult: null,
      lastRejection: null,
    }),

  // Clears any stale guess.rejected banner (e.g. a late/NOT_YOUR_TURN
  // guess submitted just as the turn was expiring) the moment turn
  // actually moves on - otherwise it lingers on screen through the rest
  // of the round, since nothing else clears it until onRoundStarted.
  onTurnStarted: (payload) =>
    set({
      activePlayerId: payload.activePlayerId,
      turnDurationSeconds: payload.turnDurationSeconds,
      turnRemainingSeconds: null,
      lastRejection: null,
    }),

  onGuessAccepted: (payload) =>
    set((state) => ({ guessLog: [...state.guessLog, payload], inactivityWarning: null, lastRejection: null })),

  onGuessFeedback: (payload) =>
    set((state) => ({ myFeedbackHistory: [...state.myFeedbackHistory, payload] })),

  onGuessRejected: (payload) => set({ lastRejection: payload }),

  onTurnExpired: () => set({ lastRejection: null }),

  onInactivityWarning: (payload) => set({ inactivityWarning: payload.message }),

  onRoundEnded: (payload) =>
    set((state) => ({
      status: 'ROUND_ENDED',
      roundResult: payload,
      score: payload.score,
      inactivityWarning: null,
      completedRounds: state.completedRounds + 1,
    })),

  // Clear the persisted matchId as soon as the server says the match is
  // over, independent of reset() - Results.jsx's reset() only runs when
  // the player clicks a button there, but there's nothing left to
  // reconnect to the moment match.ended/match.cancelled arrives, whether
  // or not they've reached/left Results yet.
  onMatchEnded: (payload) => {
    persistMatchId(null);
    set({ status: 'ENDED', matchResult: payload });
  },

  onMatchCancelled: (payload) => {
    persistMatchId(null);
    set({ status: 'CANCELLED', cancellation: payload });
  },

  onPlayerDisconnected: (payload) =>
    set((state) => ({ disconnectedPlayerIds: [...new Set([...state.disconnectedPlayerIds, payload.playerId])] })),

  onPlayerReconnected: (payload) =>
    set((state) => ({ disconnectedPlayerIds: state.disconnectedPlayerIds.filter((id) => id !== payload.playerId) })),

  // Rebuilds everything from the server's view of the match, so it is safe
  // to apply on top of any existing state (after a refresh the store is
  // empty; after a network blip it is merely stale).
  applySnapshot: (snapshot) => {
    const finished = snapshot.status === 'ENDED' || snapshot.status === 'CANCELLED';
    persistMatchId(finished ? null : snapshot.matchId);
    set((state) => {
      // Periodic resyncs (see useMatchReconnect) land mid-round; banners
      // only reset when the snapshot shows the match has actually moved on.
      const sameMoment = state.matchId === snapshot.matchId && state.status === snapshot.status && state.roundNumber === snapshot.roundNumber;
      return {
      matchId: snapshot.matchId,
      status: snapshot.status,
      config: snapshot.config || state.config,
      players: snapshot.players || state.players,
      roundNumber: snapshot.roundNumber,
      completedRounds: snapshot.completedRounds ?? state.completedRounds,
      guessLimit: snapshot.guessLimit ?? state.guessLimit,
      turnOrder: snapshot.turnOrder ?? state.turnOrder,
      activePlayerId: snapshot.activePlayerId ?? null,
      turnDurationSeconds: snapshot.turnDurationSeconds ?? null,
      turnRemainingSeconds: snapshot.turnRemainingSeconds ?? null,
      guessLog: snapshot.guessLog ?? [],
      myFeedbackHistory: snapshot.myFeedbackHistory ?? [],
      score: snapshot.score,
      roundResult: snapshot.roundResult ?? null,
      matchResult: snapshot.matchResult ?? null,
      cancellation: snapshot.cancellation ?? null,
      disconnectedPlayerIds: snapshot.disconnectedPlayerIds ?? [],
      lastRejection: sameMoment ? state.lastRejection : null,
      inactivityWarning: sameMoment ? state.inactivityWarning : null,
      };
    });
  },

  // See resignPromptRequestId above.
  requestResignPrompt: () => set((state) => ({ resignPromptRequestId: state.resignPromptRequestId + 1 })),
}));
