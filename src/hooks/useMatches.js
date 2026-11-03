import { useQuery } from '@tanstack/react-query';
import * as matchesApi from '../api/matches.api';
import { useAuthStore } from '../stores/authStore';

export function useMatches({ page = 1, pageSize = 20, type, difficulty } = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: ['matches', { page, pageSize, type, difficulty }],
    queryFn: () => matchesApi.listMatches({ page, pageSize, type, difficulty }),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}
