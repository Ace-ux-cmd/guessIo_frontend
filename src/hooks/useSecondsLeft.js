import { useEffect, useState } from 'react';

/**
 * Whole seconds until `expiresAt` (ISO string or ms), ticking once a second.
 * 0 when there is none or it has passed. The value is derived on every render, so a new
 * target is correct on its first render instead of one tick late.
 */
export function useSecondsLeft(expiresAt) {
  const target = expiresAt ? new Date(expiresAt).getTime() : null;
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!target) return undefined;
    const id = setInterval(() => {
      setTick((n) => n + 1);
      if (target - Date.now() <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  return target ? Math.max(0, Math.ceil((target - Date.now()) / 1000)) : 0;
}
