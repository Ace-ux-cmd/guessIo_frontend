import { apiClient } from './client';

// An explicit Authorization header (the appeal token from a refused Google
// sign-in) wins over the stored session token; with no `token` the request
// uses the session's access token as usual.
const authHeader = (token) => (token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);

/**
 * Submits an appeal for the current (suspended/banned) account. Needs either a
 * valid access token belonging to a SUSPENDED or BANNED account - the
 * backend's requireSuspendedOrBanned rejects an ACTIVE account (nothing to
 * appeal) the same way it rejects a missing/expired token - or the appeal
 * token handed out when a Google sign-in is refused for that account.
 */
export async function submitAppeal({ message, token }) {
  const { data } = await apiClient.post('/me/appeals', { message }, authHeader(token));
  return data;
}

/**
 * What the suspended/banned screen shows: { status, email, reason,
 * appealPending }. The email is the account's own (shown read-only) and the
 * reason is what the admin wrote when applying the suspension or ban.
 */
export async function getAppealContext({ token } = {}) {
  const { data } = await apiClient.get('/me/appeals/context', authHeader(token));
  return data;
}
