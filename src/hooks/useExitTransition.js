import { useEffect, useState } from 'react';

/**
 * Keeps something mounted long enough to animate out. `mounted` says whether
 * to render at all; `shown` flips true a frame after mount (so the entrance
 * transition runs) and false as soon as `open` turns off (so the exit runs).
 */
export function useExitTransition(open, ms = 250) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      let second;
      const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setShown(true)); });
      return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
    }
    setShown(false);
    const id = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(id);
  }, [open, ms]);

  return { mounted, shown };
}
