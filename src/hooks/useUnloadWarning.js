import { useEffect } from 'react';

/**
 * Asks the browser to confirm before the tab is refreshed or closed while
 * `active` is true. Browsers show their own generic prompt and ignore any
 * custom text, so none is supplied. In-app navigation is not covered here;
 * that is handled by useBackNavigationGuard and the screens' own modals.
 */
export function useUnloadWarning(active) {
  useEffect(() => {
    if (!active) return undefined;

    function handleBeforeUnload(event) {
      event.preventDefault();
      // Older browsers only show the prompt when returnValue is set.
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [active]);
}
