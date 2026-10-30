import { useQuery } from '@tanstack/react-query';
import { getFeatures } from '../api/app.api';

// Every system defaults to on until the server says otherwise, so an old or
// unreachable config endpoint never hides a feature the backend has.
const DEFAULTS = { friends: true, safety: true, daily: true, skills: true, push: true, survey: true };

/** Which v2.0.0 systems the backend has switched on. */
export function useFeatures() {
  const query = useQuery({ queryKey: ['features'], queryFn: getFeatures, staleTime: 5 * 60_000, retry: 0 });
  return { ...DEFAULTS, ...(query.data || {}) };
}
