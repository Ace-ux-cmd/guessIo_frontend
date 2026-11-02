import { apiClient } from './client';

export async function getRatingLeaderboard({ page = 1, pageSize = 50 } = {}) {
  const { data } = await apiClient.get('/leaderboards/rating', { params: { page, pageSize } });
  return data;
}

export async function getPointsLeaderboard({ page = 1, pageSize = 50 } = {}) {
  const { data } = await apiClient.get('/leaderboards/points', { params: { page, pageSize } });
  return data;
}

/** The current week, when it ends, and whether ranked matchmaking is open. */
export async function getWeeklyStatus() {
  const { data } = await apiClient.get('/leaderboards/weekly/status');
  return data;
}

/** Last week's top 3 if this player has not seen it yet, otherwise `{ recap: null }`. */
export async function getWeeklyRecap() {
  const { data } = await apiClient.get('/leaderboards/weekly/recap');
  return data.recap;
}

export async function markWeeklyRecapSeen(weekId) {
  await apiClient.post('/leaderboards/weekly/recap/seen', { weekId });
}
