import { useLayoutEffect } from 'react';

/**
 * Marks the page as a full-size screen while the calling component is mounted.
 * app.css runs every screen on a 13.5px root except those under html[data-fullsize],
 * which keep the standard 16px root. Home is the only full-size screen (v3.9).
 * A layout effect so the first paint already has the right scale.
 */
export function useFullSizeScreen() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-fullsize', '');
    return () => root.removeAttribute('data-fullsize');
  }, []);
}
