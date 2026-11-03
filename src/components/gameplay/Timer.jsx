import { useEffect, useState } from 'react';

/**
 * Countdown circle. Visual only: the server owns turn expiry and emits
 * `turn.expired` whether or not this reaches 0. `emphasis` colours the number
 * for the viewer's own turn (yellow at 10, red at 5). `remainingSeconds`
 * starts mid-turn after a reconnect; omit it for a fresh turn.
 */
export default function Timer({ durationSeconds, remainingSeconds = null, startKey, emphasis = true }) {
  const [remaining, setRemaining] = useState(remainingSeconds ?? durationSeconds);

  useEffect(() => {
    const startSeconds = remainingSeconds ?? durationSeconds;
    setRemaining(startSeconds);
    if (!durationSeconds) return undefined;
    // Derived from a deadline, not counted per tick, so a throttled
    // background tab cannot drift from the real turn clock.
    const deadline = Date.now() + startSeconds * 1000;
    const interval = setInterval(() => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 250);
    return () => clearInterval(interval);
    // Restart whenever a new turn begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey, durationSeconds]);

  if (!durationSeconds) return null;
  const urgent = emphasis && remaining <= 5;
  const warn = emphasis && !urgent && remaining <= 10;
  const tone = urgent ? ' urgent' : warn ? ' warn' : emphasis ? '' : ' idle';

  return (
    <div className={`timer${tone}`} role="timer" aria-label={`${remaining} seconds left`}>
      <span className="tnum">{remaining}</span>
    </div>
  );
}
