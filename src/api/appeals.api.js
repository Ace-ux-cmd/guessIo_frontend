import { apiClient } from './client';

/**
 * Submits an appeal for the current (suspended/banned) session. Requires a
 * valid access token belonging to a SUSPENDED or BANNED account - the
 * backend's requireSuspendedOrBanned rejects an ACTIVE account (nothing to
 * appeal) the same way it rejects a missing/expired token.
 */
export async function submitAppeal({ message }) {
  const { data } = await apiClient.post('/me/appeals', { message });
  return data;
}
