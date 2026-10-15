import { apiClient } from './client';

export async function getRatingLeaderboard({ page = 1, pageSize = 50 } = {}) {
  const { data } = await apiClient.get('/leaderboards/rating', { params: { page, pageSize } });
  return data;
}

export async function getPointsLeaderboard({ page = 1, pageSize = 50 } = {}) {
  const { data } = await apiClient.get('/leaderboards/points', { params: { page, pageSize } });
  return data;
}
