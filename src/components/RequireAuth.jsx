import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/**
 * Account-only routes. In the redesign a guest reaching one is sent to the
 * sign-in screen with a "from guest" reason (rating, leaderboard, ranked
 * matches and private rooms need an account) instead of an in-place gate.
 */
export default function RequireAuth({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  if (isAuthenticated) return children;
  return <Navigate to="/login?from=guest" replace />;
}
