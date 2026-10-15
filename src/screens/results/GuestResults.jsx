import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';

const PLAYER_LABELS = { guest: 'Guest', system: 'System', 'player-2': 'Player 2' };

/**
 * Results for a finished guest (offline) match. No rating/points (guests earn
 * neither - see game/GuestMatch.js) and a sign-up nudge instead of "Match
 * details" (there's no persisted match to view).
 */
export default function GuestResults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const winnerId = searchParams.get('winnerId') || null;
  const winnerName = searchParams.get('winnerName') || null;
  const mode = searchParams.get('mode') || 'VS_COMPUTER';
  const roundsPlayed = searchParams.get('rounds');
  const score = searchParams.get('score'); // "p1RoundsWon-p2RoundsWon"

  const isDraw = !winnerId;
  const winnerLabel = winnerName || (winnerId ? PLAYER_LABELS[winnerId] || winnerId : null);
  const iWon = winnerId === 'guest' || (mode === 'PASS_AND_PLAY' && !isDraw);

  const title = isDraw ? 'Draw' : iWon ? 'Victory' : 'Defeat';
  const titleCls = isDraw ? 'text-ink text-5xl' : iWon ? 'text-g text-6xl' : 'text-5xl';
  const bg = isDraw ? 'bg-gradient-to-b from-line to-transparent' : iWon ? 'bg-gradient-to-b from-g/25 to-transparent' : '';

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col pb-6">
      <section className={`px-5 pt-14 pb-8 text-center ${bg}`}>
        <div className="text-sm text-mute">Practice, {mode === 'PASS_AND_PLAY' ? 'pass and play' : 'vs computer'}</div>
        <h1 className={`mt-2 font-display font-black animate-pop ${titleCls}`}>{title}</h1>
        <p className="mt-2 text-mute">{isDraw ? 'No round winner took the match' : `${winnerLabel} took the match`}</p>
        {score && (
          <div className="mt-2 font-display font-black text-5xl tnum">{score.replace('-', ' - ')}</div>
        )}
        {roundsPlayed && <p className="mt-1 text-sm text-mute">{roundsPlayed} round{roundsPlayed === '1' ? '' : 's'} played</p>}
        <div className="mt-3 inline-flex items-center gap-2 text-sm text-warn font-semibold">
          <Icon name="alert" className="w-4 h-4" />Guest match: nothing was saved
        </div>
      </section>

      <section className="px-5">
        <div className="rounded-md bg-s1 border border-line p-5">
          <h2 className="text-lg font-bold">Keep your progress</h2>
          <p className="text-sm text-mute mt-1">Sign in with Google to save rating and match history.</p>
          <div className="mt-4"><Button onClick={() => navigate('/login', { replace: true })}>Sign up free</Button></div>
        </div>

        <div className="mt-7 space-y-2.5">
          <Button onClick={() => navigate('/play?guest=1', { replace: true })}>Play again</Button>
          <Button variant="text" onClick={() => navigate('/guest-home', { replace: true })}>Back to practice menu</Button>
        </div>
      </section>
    </main>
  );
}
