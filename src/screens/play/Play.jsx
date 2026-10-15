import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import Tile from '../../components/ui/Tile';
import { SUPPORTED_PLAYER_COUNTS, PLAYER_COUNT_CONFIG, POINTS_TABLE } from '../../constants/gameConfig';
import { ROUND_TIER_CONFIG } from '../../game/matchConfig';
import { useAuthStore } from '../../stores/authStore';

const ON = 'border-g bg-s2';
const OFF = 'border-line bg-s1';

const TYPES = [
  { key: 'RANKED', icon: 'bolt', name: 'Ranked', desc: 'Rating is on the line.', tag: 'Rating' },
  { key: 'CASUAL', icon: 'users', name: 'Casual', desc: 'Practice. No rating change.', tag: 'No rating' },
  { key: 'PRIVATE', icon: 'lock', name: 'Private room', desc: 'Friends only. Share a room code.', tag: 'Code' },
];

function BackHeader({ to, title }) {
  return (
    <header className="flex items-center gap-2 -ml-2">
      <Link to={to} replace className="p-2 text-mute" aria-label="Back"><Icon name="back" /></Link>
      <h1 className="text-xl font-bold">{title}</h1>
    </header>
  );
}

function FeedbackCards({ difficulty, setDifficulty }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      <button type="button" aria-pressed={difficulty === 'STANDARD'} onClick={() => setDifficulty('STANDARD')} className={`df p-3 rounded-lg border text-left ${difficulty === 'STANDARD' ? ON : OFF}`}>
        <span className="font-bold">Standard</span>
        <span className="mt-2 flex gap-1" aria-hidden="true">
          <Tile state="c" size="w-9 h-9 text-base">4</Tile><Tile state="p" size="w-9 h-9 text-base">7</Tile><Tile state="w" size="w-9 h-9 text-base">2</Tile><Tile state="c" size="w-9 h-9 text-base">1</Tile>
        </span>
        <span className="mt-2 block text-xs text-mute">Green shows the right place.</span>
      </button>
      <button type="button" aria-pressed={difficulty === 'HARDCORE'} onClick={() => setDifficulty('HARDCORE')} className={`df p-3 rounded-lg border text-left ${difficulty === 'HARDCORE' ? ON : OFF}`}>
        <span className="font-bold">Hardcore</span>
        <span className="mt-2 flex gap-1" aria-hidden="true">
          <Tile state="p" size="w-9 h-9 text-base">4</Tile><Tile state="p" size="w-9 h-9 text-base">7</Tile><Tile state="w" size="w-9 h-9 text-base">2</Tile><Tile state="p" size="w-9 h-9 text-base">1</Tile>
        </span>
        <span className="mt-2 block text-xs text-mute">Right place hidden. Win = {POINTS_TABLE.HARDCORE.WIN} points.</span>
      </button>
    </div>
  );
}

export default function Play() {
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  // A guest is either never logged in, or explicitly chose "Play as guest" /
  // "Play solo" (?guest=1). Guests never reach server matchmaking - GuestPlay
  // configures a fully client-side match (game/GuestMatch.js).
  const isGuest = !isAuthenticated || searchParams.get('guest') === '1';
  return isGuest ? <GuestPlay /> : <OnlinePlay />;
}

function OnlinePlay() {
  const navigate = useNavigate();
  const [matchType, setMatchType] = useState('RANKED');
  const [difficulty, setDifficulty] = useState('STANDARD');
  const [playerCount, setPlayerCount] = useState(2);

  function confirm() {
    if (matchType === 'PRIVATE') {
      navigate(`/private-room?difficulty=${difficulty}&playerCount=${playerCount}`, { replace: true });
    } else {
      navigate(`/matchmaking?matchType=${matchType}&difficulty=${difficulty}&playerCount=${playerCount}`, { replace: true });
    }
  }

  return (
    <main className="play-main mx-auto w-full max-w-[430px] min-h-screen flex flex-col px-5 pt-4 pb-8">
      <BackHeader to="/dashboard" title="New match" />

      <div className="mt-4 space-y-2.5">
        {TYPES.map((t) => {
          const on = matchType === t.key;
          return (
            <button key={t.key} type="button" aria-pressed={on} onClick={() => setMatchType(t.key)} className={`mode w-full flex items-center gap-4 p-4 rounded-xl border text-left ${on ? ON : OFF}`}>
              <span className={`w-11 h-11 rounded-lg flex items-center justify-center ${on ? 'bg-g text-bg' : 'bg-s2 text-g'}`}><Icon name={t.icon} /></span>
              <span className="flex-1">
                <span className="block font-bold">{t.name}</span>
                <span className="block text-sm text-mute">{t.desc}</span>
              </span>
              <span className={`text-xs font-bold ${on ? 'text-g' : 'text-mute'}`}>{t.tag}</span>
            </button>
          );
        })}
      </div>

      <h2 className="mt-7 font-bold">Players</h2>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {SUPPORTED_PLAYER_COUNTS.map((n) => (
          <button key={n} type="button" aria-pressed={playerCount === n} onClick={() => setPlayerCount(n)} className={`pl py-3 rounded-lg border ${playerCount === n ? ON : OFF}`}>
            <span className="block font-display font-black text-2xl">{n}</span>
            <span className="block text-xs text-mute">{PLAYER_COUNT_CONFIG[n].codeLength} digit code</span>
          </button>
        ))}
      </div>

      <h2 className="mt-7 font-bold">Rules</h2>
      <p className="text-xs text-mute mt-0.5">Same guess, same code. Different feedback.</p>
      <FeedbackCards difficulty={difficulty} setDifficulty={setDifficulty} />

      <button type="button" onClick={confirm} className="cut mt-auto block text-center bg-g text-bg font-bold py-4 mt-8 w-full">
        {matchType === 'PRIVATE' ? 'Create room' : 'Find match'}
      </button>
    </main>
  );
}

/**
 * Guest configuration: mode (vs computer / pass & play) + difficulty +
 * round length. No match type, no player count (guests are always 2-player,
 * no server matchmaking). Launches straight into a client-only match.
 */
function GuestPlay() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('VS_COMPUTER');
  const [difficulty, setDifficulty] = useState('STANDARD');
  const [roundTier, setRoundTier] = useState('EASY');
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');

  function confirm() {
    const params = new URLSearchParams({ mode, difficulty, roundTier });
    if (player1Name.trim()) params.set('p1', player1Name.trim());
    if (mode === 'PASS_AND_PLAY' && player2Name.trim()) params.set('p2', player2Name.trim());
    navigate(`/gameplay/guest?${params.toString()}`, { replace: true });
  }

  const input = 'w-full h-12 px-4 rounded-md bg-s1 border border-line text-ink placeholder:text-mute focus:border-g outline-none';
  const TIERS = [['EASY', 'Easy'], ['MEDIUM', 'Medium'], ['HARD', 'Hard']];

  return (
    <main className="play-main mx-auto w-full max-w-[430px] min-h-screen flex flex-col px-5 pt-4 pb-8">
      <BackHeader to="/guest-home" title="Practice" />

      <div className="mt-4 space-y-2.5">
        {[
          { key: 'VS_COMPUTER', icon: 'bot', name: 'Vs computer', desc: "Crack the system's code, one guess at a time." },
          { key: 'PASS_AND_PLAY', icon: 'users', name: 'Pass and play', desc: 'Two players share this device, turn by turn.' },
        ].map((t) => {
          const on = mode === t.key;
          return (
            <button key={t.key} type="button" aria-pressed={on} onClick={() => setMode(t.key)} className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left ${on ? ON : OFF}`}>
              <span className={`w-11 h-11 rounded-lg flex items-center justify-center ${on ? 'bg-g text-bg' : 'bg-s2 text-g'}`}><Icon name={t.icon} /></span>
              <span className="flex-1">
                <span className="block font-bold">{t.name}</span>
                <span className="block text-sm text-mute">{t.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {mode === 'VS_COMPUTER' ? (
        <div className="mt-6">
          <label htmlFor="p1" className="font-bold block mb-2">Your name <span className="text-mute font-normal text-sm">(optional)</span></label>
          <input id="p1" type="text" maxLength={20} placeholder="Guest" value={player1Name} onChange={(e) => setPlayer1Name(e.target.value)} className={input} />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <div>
            <label htmlFor="p1" className="font-bold block mb-2">Player 1</label>
            <input id="p1" type="text" maxLength={20} placeholder="Player 1" value={player1Name} onChange={(e) => setPlayer1Name(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="p2" className="font-bold block mb-2">Player 2</label>
            <input id="p2" type="text" maxLength={20} placeholder="Player 2" value={player2Name} onChange={(e) => setPlayer2Name(e.target.value)} className={input} />
          </div>
        </div>
      )}

      <h2 className="mt-7 font-bold">Rules</h2>
      <p className="text-xs text-mute mt-0.5">Same guess, same code. Different feedback.</p>
      <FeedbackCards difficulty={difficulty} setDifficulty={setDifficulty} />

      <h2 className="mt-7 font-bold">Round length</h2>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {TIERS.map(([key, label]) => (
          <button key={key} type="button" aria-pressed={roundTier === key} onClick={() => setRoundTier(key)} className={`py-3 rounded-lg border ${roundTier === key ? ON : OFF}`}>
            <span className="block font-bold">{label}</span>
            <span className="block text-xs text-mute">{ROUND_TIER_CONFIG[key].codeLength} digits, {ROUND_TIER_CONFIG[key].guessLimit} guesses</span>
          </button>
        ))}
      </div>

      <p className="mt-5 text-xs text-warn font-semibold">Playing as guest: progress won&apos;t be saved.</p>

      <button type="button" onClick={confirm} className="cut mt-auto block text-center bg-g text-bg font-bold py-4 mt-8 w-full">
        Start match
      </button>
    </main>
  );
}
