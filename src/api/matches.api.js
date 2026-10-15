import { apiClient } from './client';

export async function listMatches({ page = 1, pageSize = 20, type, difficulty } = {}) {
  const { data } = await apiClient.get('/matches', { params: { page, pageSize, type, difficulty } });
  return data;
}

export async function getMatchDetails(matchId) {
  const { data } = await apiClient.get(`/matches/${matchId}`);
  return data;
}
