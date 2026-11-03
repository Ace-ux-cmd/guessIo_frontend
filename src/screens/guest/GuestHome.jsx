import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ConnectionBanner from '../../components/ui/ConnectionBanner';
import HowToPlayOverlay from '../../components/ui/HowToPlayOverlay';

export default function GuestHome() {
  const navigate = useNavigate();
  const [howToOpen, setHowToOpen] = useState(false);

  return (
    <>
      <main className="app" style={{ display: 'flex', flexDirection: 'column' }}>
        <header className="topbar">
          <div>
            <p className="eyebrow">Guest mode</p>
            <h1>Welcome, Guest</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setHowToOpen(true)} className="signin-top" aria-label="How to play" style={{ padding: '0.5rem 0.6rem' }}>?</button>
            <button type="button" className="signin-top" onClick={() => navigate('/login', { replace: true })}>Sign in</button>
          </div>
        </header>

        <div className="px-5 empty:hidden"><ConnectionBanner /></div>

        {/* Guest matches run client-side (game/GuestMatch.js). "Play as guest"
            below opens the guest setup screen, which offers both Vs computer
            and Pass and play, so no separate entry cards are needed here. */}
        <section className="podium guest-variant" aria-labelledby="leaderboard-title">
          <div className="guard">
            <div className="guard-icon" aria-hidden="true">&#9819;</div>
            <h2 id="leaderboard-title">Sign in to view Leaderboard</h2>
            <p>Track your rating, earn points, and see how you rank against the sharpest minds on guessIo.</p>
            <button type="button" className="guard-link" onClick={() => navigate('/login', { replace: true })}>
              <svg className="google-mark" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.51 5.51 0 0 1-2.39 3.62v3.01h3.87c2.27-2.09 3.56-5.17 3.56-8.66Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.87-3.01c-1.07.72-2.44 1.15-4.08 1.15-3.13 0-5.79-2.11-6.74-4.95H1.26v3.1A12 12 0 0 0 12 24Z" />
                <path fill="#FBBC05" d="M5.26 14.29A7.21 7.21 0 0 1 4.88 12c0-.79.14-1.56.38-2.29v-3.1H1.26A12 12 0 0 0 0 12c0 1.93.46 3.75 1.26 5.39l4-3.1Z" />
                <path fill="#EA4335" d="M12 4.76c1.77 0 3.35.61 4.6 1.81l3.45-3.45C17.95 1.09 15.23 0 12 0A12 12 0 0 0 1.26 6.61l4 3.1C5.21 6.87 7.87 4.76 12 4.76Z" />
              </svg>
              Continue with Google
            </button>
          </div>
        </section>

        <section className="last-games guest-variant" aria-labelledby="games-title">
          <div className="section-heading">
            <h2 id="games-title">Last games</h2>
            <span>Nothing saved yet</span>
          </div>
          <div className="signin-card">
            <strong>Sign in to save your match history</strong>
            <p>Guest matches stay on this device. Sign in to keep your wins, rating, points, and progress.</p>
            <div className="actions guest-variant">
              <button type="button" className="google-button" onClick={() => navigate('/login', { replace: true })}>
                <svg className="google-mark" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.51 5.51 0 0 1-2.39 3.62v3.01h3.87c2.27-2.09 3.56-5.17 3.56-8.66Z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.87-3.01c-1.07.72-2.44 1.15-4.08 1.15-3.13 0-5.79-2.11-6.74-4.95H1.26v3.1A12 12 0 0 0 12 24Z" />
                  <path fill="#FBBC05" d="M5.26 14.29A7.21 7.21 0 0 1 4.88 12c0-.79.14-1.56.38-2.29v-3.1H1.26A12 12 0 0 0 0 12c0 1.93.46 3.75 1.26 5.39l4-3.1Z" />
                  <path fill="#EA4335" d="M12 4.76c1.77 0 3.35.61 4.6 1.81l3.45-3.45C17.95 1.09 15.23 0 12 0A12 12 0 0 0 1.26 6.61l4 3.1C5.21 6.87 7.87 4.76 12 4.76Z" />
                </svg>
                Continue with Google
              </button>
              <Link to="/play?guest=1" replace className="play-button">Play as guest &rarr;</Link>
            </div>
          </div>
        </section>
      </main>
      <HowToPlayOverlay open={howToOpen} onClose={() => setHowToOpen(false)} />
    </>
  );
}
