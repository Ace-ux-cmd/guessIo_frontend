import { apiClient } from './client';

export async function getCurrentUser() {
  const { data } = await apiClient.get('/me');
  return data;
}

export async function getPublicProfile(username) {
  const { data } = await apiClient.get(`/profiles/${username}`);
  return data;
}

export async function updateProfile(payload) {
  const { data } = await apiClient.patch('/me/profile', payload);
  return data;
}

export async function getAchievements() {
  const { data } = await apiClient.get('/me/achievements');
  return data;
}

export async function getUnseenAchievements() {
  const { data } = await apiClient.get('/me/achievements/unseen');
  return data;
}

export async function acknowledgeAchievements(keys) {
  await apiClient.post('/me/achievements/seen', { keys });
}
