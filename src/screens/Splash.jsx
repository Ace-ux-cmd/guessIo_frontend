import { useEffect, useRef } from 'react';

/**
 * Boot screen shown while a pre-existing session is restored (see App.jsx /
 * AppBoot). Mirrors the guessIo template's loading arena: a perspective grid,
 * drifting code streams, an orbiting ring around the wordmark, and a status
 * line. `status` is the only piece of real data here (what AppBoot is
 * currently doing); everything else is ambient brand motion, not content.
 */
export default function Splash({ status = 'Initializing…' }) {
  const arenaRef = useRef(null);

  // Template's pointer-parallax: only wired on hover-capable pointers, same as the source script.
  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return undefined;
    const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!supportsHover.matches) return undefined;

    function onMove(event) {
      const x = event.clientX - window.innerWidth / 2;
      const y = event.clientY - window.innerHeight / 2;
      arena.style.setProperty('--pointer-x', x.toFixed(2));
      arena.style.setProperty('--pointer-y', y.toFixed(2));
    }
    function onLeave() {
      arena.style.setProperty('--pointer-x', '0');
      arena.style.setProperty('--pointer-y', '0');
    }
    arena.addEventListener('pointermove', onMove);
    arena.addEventListener('pointerleave', onLeave);
    return () => {
      arena.removeEventListener('pointermove', onMove);
      arena.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div className="login-page">
      <main className="arena" aria-label="guessIo loading screen" ref={arenaRef}>
        <div className="login-noise" />
        <div className="login-scanline" />
        <div className="login-topbar">
          <span className="login-status">System online</span>
          <span className="login-signal">{status}</span>
        </div>

        <span className="login-code-stream login-stream-a">05 17 42 08 93 &nbsp;&middot;&nbsp; 6 1 8 4 0 &nbsp;&middot;&nbsp; 77 03 28</span>
        <span className="login-code-stream login-stream-b">4 9 2 7 1 &nbsp;&middot;&nbsp; MATCHMAKING // READY &nbsp;&middot;&nbsp; 8 0 6 3</span>
        <span className="login-corner login-corner-tl" />
        <span className="login-corner login-corner-br" />

        <section className="login-stage">
          <div className="login-orbit" aria-hidden="true" />
          <div className="login-logo-lockup">
            <img className="login-logo" src="/logo.png" alt="guessIo" />
            <p className="login-tagline">Analyse. <span>Outsmart.</span> Crack the code.</p>
          </div>
        </section>

        <div className="login-bottomline">
          <span>Multiplayer code-breaking arena</span>
          <span>guessIo // <strong>V2.0.0</strong></span>
        </div>
      </main>
    </div>
  );
}
