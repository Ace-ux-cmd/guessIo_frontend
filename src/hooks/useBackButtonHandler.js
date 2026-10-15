import { useEffect } from 'react';

/**
 * Lets the currently-mounted screen intercept the device/browser back
 * button (see useBackNavigationGuard.js) instead of letting it navigate
 * away normally. At most one handler is active at a time - the most
 * recently mounted one wins, which matches there only ever being one
 * "current screen" that cares (Gameplay/GuestGameplay while a match is
 * in progress).
 *
 * `handler` is called with no arguments when the back button is pressed;
 * it returns nothing and is responsible for doing whatever it wants (e.g.
 * opening a confirmation modal, or closing one that's already open). The
 * back button is *always* swallowed while a handler is registered - the
 * handler decides what happens next, the browser's own back navigation
 * never proceeds on its own.
 *
 * Pass a stable function (e.g. via useCallback, or a plain function
 * re-created each render is fine too since this re-registers on every
 * change) - whatever is current when the button is pressed is what runs.
 */
let activeHandler = null;

export function useBackButtonHandler(handler) {
  useEffect(() => {
    activeHandler = handler;
    return () => {
      // Only clear if we're still the active one - guards against a
      // fast unmount/remount pair (e.g. React StrictMode, or route
      // transitions) clearing a handler that was already replaced.
      if (activeHandler === handler) activeHandler = null;
    };
  }, [handler]);
}

/** Internal: used by useBackNavigationGuard, not meant to be called directly. */
export function getActiveBackButtonHandler() {
  return activeHandler;
}
