import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useMatchStore } from '../stores/matchStore';
import { getActiveBackButtonHandler } from './useBackButtonHandler';

/**
 * Handles the browser's back/forward buttons (and swipe/gesture
 * equivalents) app-wide. Checked in order on every popstate:
 *
 * 1. A screen has registered a back-button handler (see
 *    useBackButtonHandler.js - currently Gameplay.jsx/GuestGameplay.jsx
 *    while a match is in progress). The handler runs instead of any
 *    navigation, and we re-push the sentinel so the URL doesn't change -
 *    e.g. opening the forfeit-confirmation modal, or closing it if it's
 *    already open. The match is never forfeited by the back button alone;
 *    only the modal's own explicit "Forfeit" button does that.
 * 2. No handler is registered yet, and we're on /gameplay with
 *    useMatchStore (the online-match store, read synchronously via
 *    getState() - see matchStore.js) reporting status ACTIVE or
 *    ROUND_ENDED. This covers the brief window right after Gameplay.jsx
 *    mounts but before its own useBackButtonHandler effect has run (e.g.
 *    a hard refresh landing directly on /gameplay, followed immediately
 *    by a back-press) - without this, that narrow race would fall through
 *    to real navigation and skip the forfeit confirmation entirely. We
 *    bump resignPromptRequestId instead of calling a handler directly
 *    (none exists yet to call); Gameplay.jsx watches that counter and
 *    opens its modal once mounted. The pathname check matters: after an
 *    explicit forfeit, Gameplay.jsx navigates to /dashboard without
 *    resetting store.status itself (it stays ACTIVE client-side until the
 *    server's forfeit/cancel event round-trips) - without the pathname
 *    check, a back-press in that gap would wrongly re-arm this fallback
 *    on /dashboard. This only covers the online-match path -
 *    GuestGameplay's match state is local component state, not a store,
 *    so it isn't reachable from here; its own useBackButtonHandler
 *    registration (case 1) is the only guard for guest play, same as
 *    before.
 * 3. The user is authenticated and would land on /login. Rather than
 *    silently re-pushing the sentinel and leaving them stuck with no
 *    feedback (which can read as a frozen button/screen - nothing else
 *    on /login indicates why back "didn't work"), we redirect them to
 *    /dashboard instead, with a one-shot message
 *    (authStore.backToLoginBlockedMessage) that Dashboard.jsx displays
 *    once. A logged-in user shouldn't be able to back their way into the
 *    auth page, but they should see *something* happen when they try.
 * 4. Anything else: let it through. We do NOT re-push a sentinel, so the
 *    popstate is left alone and the browser navigates to the real
 *    previous history entry, same as if this hook didn't exist.
 *
 * Mechanism: a single "sentinel" entry is pushed once, ahead of the
 * current location, the first time this hook mounts. Cases 1-3 detect
 * landing on that sentinel and re-push a fresh one immediately, so the
 * *next* back press is caught the same way - this is what makes back
 * "inert" for those cases without needing to track history depth.
 * Case 4 deliberately does not re-push, so once the user backs out past
 * a screen that didn't intercept, real browser history takes over from
 * there on (matching "go to the last screen" rather than always
 * replacing).
 *
 * IMPORTANT: because cases 1-3 make back a no-op from the URL's
 * perspective, in-app "Back" buttons (see TopBar.jsx) must keep
 * navigating to an explicit path rather than relying on history depth -
 * unchanged from before.
 *
 * Mount this once near the root of the router.
 */
const MATCH_LIVE_STATUSES = ['FOUND', 'STARTING', 'ACTIVE', 'ROUND_ENDED'];

export function useBackNavigationGuard() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const sentinelPushedRef = useRef(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  useEffect(() => {
    if (!sentinelPushedRef.current) {
      window.history.pushState({ guessioSentinel: true }, '', window.location.href);
      sentinelPushedRef.current = true;
    }

    function handlePopState() {
      // A live match owns the back button. The sentinel is only pushed once at
      // app start, so by the time a player has navigated Matchmaking ->
      // Gameplay it is buried and back lands on /matchmaking (which re-queues
      // the player). Detect that and put the player back on the match.
      const { matchId, status: matchStatus } = useMatchStore.getState();
      const matchLive = Boolean(matchId) && MATCH_LIVE_STATUSES.includes(matchStatus);
      if (matchLive) {
        const backHandler = getActiveBackButtonHandler();
        const onGameplay = window.location.pathname === '/gameplay';
        if (!onGameplay) navigateRef.current('/gameplay', { replace: true });
        window.history.pushState({ guessioSentinel: true }, '', '/gameplay');
        if (backHandler && onGameplay) {
          backHandler();
        } else {
          // Gameplay is (re)mounting; give it a tick before asking it to
          // open the forfeit prompt.
          setTimeout(() => useMatchStore.getState().requestResignPrompt(), 50);
        }
        return;
      }

      const backHandler = getActiveBackButtonHandler();
      if (backHandler) {
        window.history.pushState({ guessioSentinel: true }, '', window.location.href);
        backHandler();
        return;
      }

      if (isAuthenticatedRef.current && window.location.pathname === '/login') {
        window.history.pushState({ guessioSentinel: true }, '', window.location.href);
        useAuthStore.getState().setBackToLoginBlockedMessage("You're already signed in.");
        navigateRef.current('/dashboard', { replace: true });
        return;
      }

      // Let it through: don't re-push, so the next popstate (if any) hits
      // a real previous entry instead of our sentinel.
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
}
