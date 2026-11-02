import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import RouteErrorBoundary from './components/ErrorBoundary';
import AchievementUnlockedPrompt from './components/achievements/AchievementUnlockedPrompt';
import InvitePrompt from './components/social/InvitePrompt';
import Splash from './screens/Splash';
import { PageSkeleton } from './components/ui/Feedback';
import { useAuthStore } from './stores/authStore';
import { useCurrentUser } from './hooks/useAuth';
import { useSessionTerminationGuard } from './hooks/useSessionTerminationGuard';
import { useBackNavigationGuard } from './hooks/useBackNavigationGuard';

import Login from './screens/auth/Login';
const Onboarding = lazy(() => import('./screens/auth/Onboarding'));
const GoogleCallback = lazy(() => import('./screens/auth/GoogleCallback'));

import Dashboard from './screens/dashboard/Dashboard';
import GuestHome from './screens/guest/GuestHome';

const Play = lazy(() => import('./screens/play/Play'));
const Matchmaking = lazy(() => import('./screens/play/Matchmaking'));
const PrivateRoom = lazy(() => import('./screens/play/PrivateRoom'));

const Gameplay = lazy(() => import('./screens/gameplay/Gameplay'));
const GuestGameplay = lazy(() => import('./screens/gameplay/GuestGameplay'));

const Results = lazy(() => import('./screens/results/Results'));
const GuestResults = lazy(() => import('./screens/results/GuestResults'));

const Profile = lazy(() => import('./screens/profile/Profile'));
const Achievements = lazy(() => import('./screens/profile/Achievements'));
const MatchHistory = lazy(() => import('./screens/history/MatchHistory'));
const MatchDetails = lazy(() => import('./screens/history/MatchDetails'));
const Leaderboards = lazy(() => import('./screens/leaderboard/Leaderboards'));
const Settings = lazy(() => import('./screens/settings/Settings'));
const Support = lazy(() => import('./screens/support/Support'));
const PlayerProfile = lazy(() => import('./screens/profile/PlayerProfile'));
const Friends = lazy(() => import('./screens/friends/Friends'));
const FriendSearch = lazy(() => import('./screens/friends/FriendSearch'));
const Daily = lazy(() => import('./screens/daily/Daily'));

import {
  NotFound,
  RoomNotFound,
  ServerError,
  NoConnection,
  Maintenance,
  Unauthorized,
} from './screens/errors/ErrorScreens';
import { Suspended, Banned } from './screens/errors/AccountLocked';

// Minimum time the splash is shown, so it reads as an intentional brand
// moment rather than a flicker on fast connections. Only ever shown while
// restoring a pre-existing session on first load - see AppBoot below and
// the Root component, which is the only other place a "landing" moment
// exists now that /home has been removed entirely (SRS: the app must go
// straight to Auth or Dashboard, never a splash/home screen after boot).
const MIN_SPLASH_MS = 700;

// Screens most sessions reach next are fetched once the browser is idle, so
// moving between tabs never waits on a download.
const PRELOAD = [
  () => import('./screens/leaderboard/Leaderboards'),
  () => import('./screens/history/MatchHistory'),
  () => import('./screens/profile/Profile'),
  () => import('./screens/play/Play'),
  () => import('./screens/gameplay/Gameplay'),
];
function preloadScreens() {
  const run = () => PRELOAD.forEach((load) => load().catch(() => {}));
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2000);
}

function AppBoot({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const hasUser = useAuthStore((s) => Boolean(s.user));
  const { isLoading: sessionLoading } = useCurrentUser();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  useSessionTerminationGuard();
  useBackNavigationGuard();

  // Whether we're restoring a session that existed before this component
  // ever mounted (tokens in sessionStorage from a previous page load, but
  // no `user` yet). This is the only case that should hold the app behind
  // the splash screen. A login/register performed *during* this session
  // already has `user` set synchronously by setSession(), so it must not
  // re-trigger this gate - doing so previously caused the app to flash back
  // to the splash screen right after a successful login, which read as the
  // login having silently failed.
  const [restoringInitialSession] = useState(() => isAuthenticated && !hasUser);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    preloadScreens();
    return () => clearTimeout(timer);
  }, []);

  const stillBooting = !minTimeElapsed || (restoringInitialSession && sessionLoading);
  if (stillBooting) {
    return <Splash status={isAuthenticated ? 'Restoring session…' : 'Initializing…'} />;
  }
  return children;
}

/**
 * The "/" route. Per product decision, there is no persistent home/splash
 * screen after boot - the app goes straight to whichever screen actually
 * matters: Dashboard for a signed-in user, Login for everyone else. This
 * is a redirect, not a rendered screen, so it never itself appears in the
 * browser back-stack as a distinct "page" a user could return to.
 */
function Root() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteErrorBoundary>
      <AppBoot>
        <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Root />} />

          {/* Auth: Google OAuth is the only sign-in method - there is no
              separate register screen. A brand-new Google identity is
              routed through /onboarding (see GoogleCallback.jsx) before
              any account is created. */}
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />

          {/* Home: authenticated users get the full Dashboard; guests (no
              account, or explicitly browsing unauthenticated) get GuestHome. 
              Both are reachable at their own path rather than one path that
              silently branches, so links/back-navigation stay unambiguous. */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route path="/guest-home" element={<GuestHome />} />
          <Route path="/signup-gate/:feature" element={<Navigate to="/login?from=guest" replace />} />

          {/* Play setup / matchmaking - Play.jsx itself branches into the
              guest (client-only) config UI vs. the authenticated match-type
              flow based on auth state and ?guest=1, so a single route
              serves both entry points. */}
          <Route path="/play" element={<Play />} />
          <Route
            path="/matchmaking"
            element={
              <RequireAuth>
                <Matchmaking />
              </RequireAuth>
            }
          />
          <Route
            path="/private-room"
            element={
              <RequireAuth>
                <PrivateRoom />
              </RequireAuth>
            }
          />

          {/* Gameplay */}
          <Route
            path="/gameplay"
            element={
              <RequireAuth>
                <Gameplay />
              </RequireAuth>
            }
          />
          <Route path="/gameplay/guest" element={<GuestGameplay />} />

          {/* Results */}
          <Route
            path="/results"
            element={
              <RequireAuth>
                <Results />
              </RequireAuth>
            }
          />
          <Route path="/results/guest" element={<GuestResults />} />

          {/* Account-only screens */}
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/history"
            element={
              <RequireAuth>
                <MatchHistory />
              </RequireAuth>
            }
          />
          <Route
            path="/history/:id"
            element={
              <RequireAuth>
                <MatchDetails />
              </RequireAuth>
            }
          />
          <Route
            path="/leaderboards"
            element={
              <RequireAuth>
                <Leaderboards />
              </RequireAuth>
            }
          />
          <Route
            path="/profile/achievements"
            element={
              <RequireAuth>
                <Achievements />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <Settings />
              </RequireAuth>
            }
          />

          {/* v2.0.0: friends, public profiles and the Daily Challenge. Each is
              only linked from the UI while its backend feature flag is on. */}
          <Route path="/friends" element={<RequireAuth><Friends /></RequireAuth>} />
          <Route path="/friends/add" element={<RequireAuth><FriendSearch /></RequireAuth>} />
          <Route path="/players/:username" element={<PlayerProfile />} />
          <Route path="/daily" element={<RequireAuth><Daily /></RequireAuth>} />

          {/* Help and feedback - open to guests too. */}
          <Route path="/support" element={<Support />} />

          {/* Error screens - reachable both as direct routes (e.g. a
              private-room join link with a stale code) and rendered
              in-place by API-error handling elsewhere. */}
          <Route path="/error/offline" element={<NoConnection />} />
          <Route path="/error/server" element={<ServerError />} />
          <Route path="/error/room-not-found" element={<RoomNotFound />} />
          <Route path="/error/maintenance" element={<Maintenance />} />
          <Route path="/error/unauthorized" element={<Unauthorized />} />
          <Route path="/error/suspended" element={<Suspended />} />
          <Route path="/error/banned" element={<Banned />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        <AchievementUnlockedPrompt />
        <InvitePrompt />
      </AppBoot>
      </RouteErrorBoundary>
    </BrowserRouter>
  );
}
