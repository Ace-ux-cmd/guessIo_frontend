import { apiClient } from './client';

export async function listBlocked() {
  return (await apiClient.get('/safety/blocks')).data;
}
export async function blockPlayer(username) {
  await apiClient.post('/safety/blocks', { username });
}
export async function unblockPlayer(username) {
  await apiClient.delete(`/safety/blocks/${encodeURIComponent(username)}`);
}
export async function reportPlayer({ username, reason, note, matchId }) {
  return (await apiClient.post('/safety/reports', { username, reason, note: note || undefined, matchId })).data;
}
export async function getPrivacy() {
  return (await apiClient.get('/safety/privacy')).data;
}
export async function updatePrivacy(patch) {
  return (await apiClient.patch('/safety/privacy', patch)).data;
}
