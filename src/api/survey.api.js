import { apiClient } from './client';

export async function getSurvey() {
  return (await apiClient.get('/survey')).data;
}
export async function respondSurvey(action) {
  await apiClient.post('/survey/response', { action });
}
