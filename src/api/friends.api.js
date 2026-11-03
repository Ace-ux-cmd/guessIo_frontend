import { apiClient } from './client';

export async function listFriends() {
  return (await apiClient.get('/friends')).data;
}
export async function listRequests() {
  return (await apiClient.get('/friends/requests')).data;
}
export async function searchPlayers(q, page = 1) {
  return (await apiClient.get('/friends/search', { params: { q, page } })).data;
}
export async function sendFriendRequest(username) {
  return (await apiClient.post('/friends/requests', { username })).data;
}
export async function acceptFriendRequest(username) {
  return (await apiClient.post(`/friends/requests/${encodeURIComponent(username)}/accept`)).data;
}
export async function declineFriendRequest(username) {
  return (await apiClient.post(`/friends/requests/${encodeURIComponent(username)}/decline`)).data;
}
export async function cancelFriendRequest(username) {
  return (await apiClient.delete(`/friends/requests/${encodeURIComponent(username)}`)).data;
}
export async function removeFriend(username) {
  await apiClient.delete(`/friends/${encodeURIComponent(username)}`);
}
