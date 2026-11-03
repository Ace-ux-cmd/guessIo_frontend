import { apiClient } from './client';

export async function getPushConfig() {
  return (await apiClient.get('/push/config')).data;
}
export async function getPushPreferences() {
  return (await apiClient.get('/push/preferences')).data;
}
export async function updatePushPreferences(patch) {
  return (await apiClient.patch('/push/preferences', patch)).data;
}
export async function registerDevice({ platform, token }) {
  await apiClient.post('/push/devices', { platform, token });
}
export async function removeDevice(token) {
  await apiClient.delete('/push/devices', { data: { token } });
}
