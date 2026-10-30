import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../api/auth.api';
import * as profileApi from '../api/profile.api';
import { useAuthStore } from '../stores/authStore';
import { disconnectSocket } from '../sockets/socketClient';
import { markNewAccount } from '../components/ui/Welcome';

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const query = useQuery({
    queryKey: ['me'],
    queryFn: profileApi.getCurrentUser,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  // Keeps the auth store's `user` in sync after a page refresh, when only
  // the tokens survive in sessionStorage and `user` starts out null.
  useEffect(() => {
    if (query.data) setSession({ user: query.data, accessToken, refreshToken });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  return query;
}

export function useCompleteOnboarding() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.completeOnboarding,
    onSuccess: (data) => {
      setSession(data);
      markNewAccount(data?.user?.id);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    // Callers (Profile's Log Out button, BottomNav's sidebar logout) should
    // navigate to /login themselves *before* awaiting this mutation, not
    // after. RequireAuth reacts to isAuthenticated synchronously - if
    // clearSession() below fires while the caller is still on a
    // RequireAuth-wrapped route (e.g. /profile), RequireAuth swaps in its
    // in-place "locked" gate at that same URL before the caller's own
    // onSettled navigate('/login') gets a chance to run, so the user never
    // actually reaches /login. See useLogout usage sites.
    onSettled: () => {
      disconnectSocket();
      clearSession();
      queryClient.clear();
    },
  });
}

// The caller owns what happens after success (navigate, then clear the
// session), so the order matches useLogout and a failed request leaves the
// sheet and its error message in place.
export function useDeleteAccount() {
  return useMutation({ mutationFn: authApi.deleteAccount });
}

export function useAchievements() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: ['achievements'],
    queryFn: profileApi.getAchievements,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

