import { apiClient } from './client';

export async function getDaily() {
  return (await apiClient.get('/daily')).data;
}
export async function startDailyAttempt() {
  return (await apiClient.post('/daily/attempts')).data;
}
export async function submitDailyGuess(attemptId, guess) {
  return (await apiClient.post(`/daily/attempts/${attemptId}/guesses`, { guess })).data;
}
export async function abandonDailyAttempt(attemptId) {
  await apiClient.post(`/daily/attempts/${attemptId}/abandon`);
}
