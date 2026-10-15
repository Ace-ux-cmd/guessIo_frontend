import { useEffect, useState } from 'react';

const CIRC = 175.9; // 2 * PI * 28

/**
 * Client-side visual countdown ring only - the server is authoritative on turn
 * expiry (it emits `turn.expired` independently of this reaching 0).
 * `emphasis` colors the ring (green/amber/red) for the viewer's own turn;
 * otherwise it stays neutral. `remainingSeconds` starts the ring partway
 * through a turn (after a reconnect); omit it for a fresh turn.
 */
export default function Timer({ durationSeconds, remainingSeconds = null, startKey, emphasis = true }) {
  const [remaining, setRemaining] = useState(remainingSeconds ?? durationSeconds);

  useEffect(() => {
    const startSeconds = remainingSeconds ?? durationSeconds;
    setRemaining(startSeconds);
    if (!durationSeconds) return undefined;
    // Derived from a deadline, not counted per tick, so a throttled
    // background tab cannot make the ring drift from the real turn clock.
    const deadline = Date.now() + startSeconds * 1000;
    const interval = setInterval(() => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 250);
    return () => clearInterval(interval);
    // Restart whenever a new turn begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey, durationSeconds]);

  if (!durationSeconds) return null;
  const stroke = !emphasis ? '#1E2B25' : remaining <= 5 ? '#FF3D4A' : remaining <= 10 ? '#FFB01F' : '#12E060';
  const text = !emphasis ? 'text-mute' : remaining <= 5 ? 'text-bad animate-pulse' : remaining <= 10 ? 'text-warn' : 'text-ink';

  return (
    <div className="relative w-16 h-16 shrink-0" role="timer" aria-label={`${remaining} seconds left`}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="none" stroke="#1E2B25" strokeWidth="4" />
        <circle
          cx="32" cy="32" r="28" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - remaining / durationSeconds)}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke .3s' }}
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-display font-black tnum text-xl ${text}`}>{remaining}</div>
    </div>
  );
}
