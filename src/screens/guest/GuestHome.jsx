import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import Avatar from '../../components/ui/Avatar';
import Wordmark from '../../components/ui/Wordmark';
import Button from '../../components/ui/Button';
import ConnectionBanner from '../../components/ui/ConnectionBanner';
import HowToPlayOverlay from '../../components/ui/HowToPlayOverlay';

const LOCKED = [
  { icon: 'users', label: 'Multiplayer' },
  { icon: 'trophy', label: 'Leaderboard' },
  { icon: 'history', label: 'History' },
  { icon: 'lock', label: 'Private rooms' },
];

export default function GuestHome() {
  const navigate = useNavigate();
  const [howToOpen, setHowToOpen] = useState(false);

  return (
    <>
      <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col pb-8">
        <header className="flex items-center justify-between px-5 pt-5">
          <Wordmark className="text-xl" />
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setHowToOpen(true)} className="p-2 text-mute" aria-label="How to play">
              <Icon name="help" />
            </button>
            <Avatar name="?" size={32} />
          </div>
        </header>

        <div className="px-5 empty:hidden mt-4"><ConnectionBanner /></div>

        <section className="px-5 mt-6">
          <Link to="/play?guest=1" replace className="cut block bg-g text-bg p-5 pb-6 relative overflow-hidden">
            <div className="font-display font-black text-4xl leading-none">Play solo</div>
            <div className="mt-3 font-semibold text-bg/80">Crack the code against the system. No account needed.</div>
            <Icon name="play" className="absolute right-5 bottom-5 w-12 h-12 opacity-25" />
          </Link>
        </section>

        <section className="px-5 mt-5">
          <div className="rounded-md bg-s1 border border-line p-5">
            <h2 className="text-lg font-bold">Unlock the full game</h2>
            <p className="text-sm text-mute mt-1">Sign in with Google to save your progress and play online.</p>
            <ul className="mt-3 space-y-2 text-sm">
              {['Rating and match history', 'Ranked matches and private rooms', 'Global leaderboard'].map((t) => (
                <li key={t} className="flex gap-2"><Icon name="check" className="w-4 h-4 mt-0.5 text-g" />{t}</li>
              ))}
            </ul>
            <div className="mt-4"><Button onClick={() => navigate('/login', { replace: true })}>Sign in</Button></div>
          </div>
        </section>

        <section className="px-5 mt-5">
          <h2 className="text-sm font-semibold text-mute mb-2">Needs an account</h2>
          <div className="grid grid-cols-2 gap-2">
            {LOCKED.map((f) => (
              <Link key={f.label} to="/login?from=guest" replace className="flex items-center gap-2 rounded-md bg-s1 p-3 text-sm text-mute">
                <Icon name={f.icon} className="w-4 h-4" />{f.label}<Icon name="lock" className="w-3.5 h-3.5 ml-auto" />
              </Link>
            ))}
          </div>
        </section>
      </main>
      <HowToPlayOverlay open={howToOpen} onClose={() => setHowToOpen(false)} />
    </>
  );
}
