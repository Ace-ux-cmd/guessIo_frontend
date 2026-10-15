import { create } from 'zustand';
import * as profileApi from '../api/profile.api';

/**
 * Client side of "achievement unlocked" prompts.
 *
 * The server owns the truth: an unlock is pending until its row is
 * acknowledged (user_achievements.seen_at). This module only mirrors that
 * list for display and is built so that no ordering of events can show the
 * same unlock twice or lose one:
 *
 *  - Every trigger (socket push, reconnect, tab resume, startup) funnels into
 *    one refresh that re-reads the server list, so the push itself carries no
 *    data that could go stale. Refreshes never overlap; a request that arrives
 *    mid-flight schedules exactly one more pass after it.
 *  - Keys the player has acknowledged are remembered locally, so a refresh
 *    that was already in flight when they tapped cannot bring a prompt back.
 *  - Acknowledgements are retried until the server confirms them.
 *  - Switching or ending the session bumps `generation`, so a response that
 *    belongs to the previous account is discarded instead of displayed.
 */
export const useAchievementNotificationStore = create(() => ({ pending: [] }));

const acknowledgedKeys = new Set();
const unsentAcknowledgements = new Set();
let generation = 0;
let refreshInFlight = null;
let refreshRequestedAgain = false;
let flushInFlight = null;

function applyServerPending(achievements) {
  const uniqueByKey = new Map();
  for (const achievement of achievements) {
    if (!acknowledgedKeys.has(achievement.key) && !uniqueByKey.has(achievement.key)) {
      uniqueByKey.set(achievement.key, achievement);
    }
  }
  useAchievementNotificationStore.setState({ pending: [...uniqueByKey.values()] });
}

async function runFlush() {
  try {
    while (unsentAcknowledgements.size > 0) {
      const keys = [...unsentAcknowledgements];
      try {
        // eslint-disable-next-line no-await-in-loop
        await profileApi.acknowledgeAchievements(keys);
      } catch {
        return;
      }
      for (const key of keys) unsentAcknowledgements.delete(key);
    }
  } finally {
    flushInFlight = null;
  }
}

function flushAcknowledgements() {
  // With nothing to send, runFlush would finish before this assignment
  // happened and leave flushInFlight set forever.
  if (unsentAcknowledgements.size === 0) return flushInFlight ?? Promise.resolve();
  if (!flushInFlight) flushInFlight = runFlush();
  return flushInFlight;
}

async function runRefresh() {
  for (;;) {
    refreshRequestedAgain = false;
    const startedInGeneration = generation;
    // eslint-disable-next-line no-await-in-loop
    await flushAcknowledgements();
    try {
      // eslint-disable-next-line no-await-in-loop
      const { achievements } = await profileApi.getUnseenAchievements();
      if (startedInGeneration === generation) applyServerPending(achievements);
    } catch {
      // Offline or signed out: the next trigger tries again.
    }
    if (!refreshRequestedAgain) {
      refreshInFlight = null;
      return;
    }
  }
}

/** Re-reads the server's pending unlocks. Safe to call from anywhere, any number of times. */
export function refreshPendingAchievements() {
  if (refreshInFlight) {
    refreshRequestedAgain = true;
    return refreshInFlight;
  }
  refreshInFlight = runRefresh();
  return refreshInFlight;
}

/** Hides the given unlocks immediately and tells the server they were seen. */
export function acknowledgeAchievements(keys) {
  for (const key of keys) {
    acknowledgedKeys.add(key);
    unsentAcknowledgements.add(key);
  }
  useAchievementNotificationStore.setState((state) => ({
    pending: state.pending.filter((achievement) => !acknowledgedKeys.has(achievement.key)),
  }));
  return flushAcknowledgements();
}

/** Drops everything belonging to the current session (sign-out or account switch). */
export function resetAchievementNotifications() {
  generation += 1;
  acknowledgedKeys.clear();
  unsentAcknowledgements.clear();
  useAchievementNotificationStore.setState({ pending: [] });
}
