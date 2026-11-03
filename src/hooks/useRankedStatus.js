import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getWeeklyStatus } from '../api/leaderboards.api';
import { useFeatures } from './useFeatures';

export const RANKED_STATUS_KEY = ['rankedStatus'];

/**
 * Whether ranked matchmaking is open. While the week rolls over the server closes
 * the ranked queue for a few minutes. Off (always open) when the weekly leaderboard
 * is not switched on. The socket's `ranked.status` event updates this at once
 * (see useMatchSocket); the poll is the fallback for screens without a socket.
 */
export function useRankedStatus() {
  const { weeklyLeaderboard } = useFeatures();
  const query = useQuery({
    queryKey: RANKED_STATUS_KEY,
    queryFn: getWeeklyStatus,
    enabled: weeklyLeaderboard,
    retry: 0,
    staleTime: 5_000,
    // Always ask again when a screen that needs it opens, and when the tab comes back.
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: (q) => (q.state.data?.rankedOpen === false ? 5_000 : 15_000),
  });
  return {
    enabled: weeklyLeaderboard,
    rankedOpen: !weeklyLeaderboard || query.data?.rankedOpen !== false,
    weekEndsAt: query.data?.weekEndsAt ?? null,
  };
}

/**
 * Asks the server right now, ignoring anything cached, whether ranked is open. Used at the
 * moment a player taps Find opponents, so a stale screen can never walk someone into a closed
 * queue. If the answer cannot be had (offline, feature off), it says open: the server still
 * refuses the queue join, so this check only improves the message, it is not the lock.
 */
export function useRankedOpenCheck() {
  const queryClient = useQueryClient();
  return async function checkRankedOpen() {
    try {
      const data = await queryClient.fetchQuery({ queryKey: RANKED_STATUS_KEY, queryFn: getWeeklyStatus, staleTime: 0 });
      return data?.rankedOpen !== false;
    } catch (_) {
      return true;
    }
  };
}
