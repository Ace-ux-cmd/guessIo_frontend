import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { SUPPORTED_PLAYER_COUNTS, PLAYER_COUNT_CONFIG } from '../../constants/gameConfig';
import { ROUND_TIER_CONFIG } from '../../game/matchConfig';
import { useAuthStore } from '../../stores/authStore';
import { useRankedStatus, useRankedOpenCheck } from '../../hooks/useRankedStatus';
import RankedClosedDialog, { RANKED_CLOSED_TEXT } from '../../components/ui/RankedClosedDialog';
import { Banner } from '../../components/ui/Feedback';

export { RANKED_CLOSED_TEXT };

const TYPES = [
  { key: 'RANKED', icon: 'bolt', name: 'Ranked', desc: 'Climb the ladder' },
  { key: 'CASUAL', icon: 'users', name: 'Casual', desc: 'Play for fun' },
  { key: 'PRIVATE', icon: 'settings', name: 'Custom', desc: 'Make your room' },
];

const RULES = [
  { key: 'STANDARD', icon: 'dial', name: 'Standard', desc: 'Green means right place. Amber means wrong place.' },
  { key: 'HARDCORE', icon: 'shield', name: 'Hardcore', desc: 'Only amber clues. No position reveals.' },
];

function Header({ onBack, backLabel, eyebrow }) {
  return (
    <header className="topbar">
      <button type="button" onClick={onBack} className="back" aria-label={backLabel}>&larr;</button>
      <div className="header-copy">
        <p className="eyebrow">{eyebrow}</p>
      </div>
    </header>
  );
}

function Option({ active, onClick, icon, name, note, className = '' }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`option${active ? ' active' : ''}${className ? ` ${className}` : ''}`}>
      <span className="option-icon"><Icon name={icon} className="w-4 h-4" /></span>
      <strong>{name}</strong>
      <small>{note}</small>
    </button>
  );
}

export default function Play() {
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  // A guest is either never signed in, or chose "Play solo" (?guest=1). Guests
  // never reach server matchmaking: GuestPlay sets up a client-only match.
  const isGuest = !isAuthenticated || searchParams.get('guest') === '1';
  return isGuest ? <GuestPlay /> : <OnlinePlay />;
}

function OnlinePlay() {
  const navigate = useNavigate();
  const [matchType, setMatchType] = useState('RANKED');
  const [difficulty, setDifficulty] = useState('STANDARD');
  const [playerCount, setPlayerCount] = useState(2);
  const { rankedOpen } = useRankedStatus();
  const checkRankedOpen = useRankedOpenCheck();
  const [checking, setChecking] = useState(false);
  const [closedNotice, setClosedNotice] = useState(false);
  // Only ranked is shut during the weekly reset; casual, custom rooms and the Daily Challenge stay open.
  const rankedClosed = matchType === 'RANKED' && !rankedOpen;
  const custom = matchType === 'PRIVATE';
  const config = PLAYER_COUNT_CONFIG[playerCount];
  const typeName = TYPES.find((t) => t.key === matchType).name;
  const rulesName = RULES.find((r) => r.key === difficulty).name;

  async function confirm() {
    if (rankedClosed || checking) return;
    // Ask the server at the moment of the tap: what this screen last heard may be minutes old.
    if (matchType === 'RANKED') {
      setChecking(true);
      const open = await checkRankedOpen();
      setChecking(false);
      if (!open) { setClosedNotice(true); return; }
    }
    if (custom) {
      navigate(`/private-room?difficulty=${difficulty}&playerCount=${playerCount}`, { replace: true });
    } else {
      // queueIntent is what lets Matchmaking join the queue: only this tap sets it.
      navigate(`/matchmaking?matchType=${matchType}&difficulty=${difficulty}&playerCount=${playerCount}`, { replace: true, state: { queueIntent: true } });
    }
  }

  return (
    <main className="app">
      <Header onBack={() => navigate('/dashboard', { replace: true })} backLabel="Back to home" eyebrow="Match setup" />

      <div className="setup">
        <section className="setup-section" aria-labelledby="mode-title">
          <div className="section-heading">
            <h2 id="mode-title">Choose mode</h2>
            <span>Step 01</span>
          </div>
          <div className="options mode-options" role="group" aria-label="Match mode">
            {TYPES.map((t) => (
              <Option key={t.key} active={matchType === t.key} onClick={() => setMatchType(t.key)} icon={t.icon} name={t.name} note={t.desc} />
            ))}
          </div>
        </section>

        <section className="setup-section" aria-labelledby="players-title">
          <div className="section-heading">
            <h2 id="players-title">Players</h2>
            <span>Step 02</span>
          </div>
          <div className="options player-options" role="group" aria-label="Number of players">
            {SUPPORTED_PLAYER_COUNTS.map((n) => (
              <button key={n} type="button" aria-pressed={playerCount === n} onClick={() => setPlayerCount(n)} className={`option player-option${playerCount === n ? ' active' : ''}`}>
                <span className="option-icon" aria-hidden="true">{'•'.repeat(n)}</span>
                <strong>{n} players</strong>
                <small>{custom ? `${n} seats` : `${PLAYER_COUNT_CONFIG[n].codeLength} digit code`}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="setup-section" aria-labelledby="rules-title">
          <div className="section-heading">
            <h2 id="rules-title">Rules</h2>
            <span>Step 03</span>
          </div>
          <div className="options rule-options" role="group" aria-label="Ruleset">
            {RULES.map((r) => (
              <Option key={r.key} active={difficulty === r.key} onClick={() => setDifficulty(r.key)} icon={r.icon} name={r.name} note={r.desc} className="rule-option" />
            ))}
          </div>
        </section>

        <section className="setup-section" aria-label="Match preview">
          <div className="preview">
            <div>
              <p className="preview-label">Ready to crack</p>
              <strong>{typeName} &middot; {playerCount} players</strong>
              <p>{rulesName} rules &middot; {config.guessLimit} shared guesses</p>
            </div>
            <div className="preview-code" aria-hidden="true">
              {Array.from({ length: config.codeLength }, (_, i) => <span key={i}>?</span>)}
            </div>
          </div>
        </section>

        {rankedClosed && <Banner variant="warn">{RANKED_CLOSED_TEXT}</Banner>}
        <button type="button" onClick={confirm} disabled={rankedClosed || checking} aria-busy={checking} className="launch">{custom ? 'Create a room' : 'Find opponents'} <span aria-hidden="true">&rarr;</span></button>
        <p className="bottom-note">You can change your choice before matchmaking begins.</p>
      </div>
      <RankedClosedDialog open={closedNotice} onClose={() => setClosedNotice(false)} />
    </main>
  );
}

const TIERS = [
  { key: 'EASY', name: 'Easy', icon: 2 },
  { key: 'MEDIUM', name: 'Medium', icon: 3 },
  { key: 'HARD', name: 'Hard', icon: 4 },
];

/**
 * Guest setup: practice against the system, or pass and play on one device.
 * No match type or player count (guests are always two players, no server).
 * Launches straight into a client-only match.
 */
function GuestPlay() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get('mode') === 'PASS_AND_PLAY' ? 'PASS_AND_PLAY' : 'VS_COMPUTER');
  const [difficulty, setDifficulty] = useState('STANDARD');
  const [roundTier, setRoundTier] = useState('EASY');
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const config = ROUND_TIER_CONFIG[roundTier];

  function confirm() {
    const params = new URLSearchParams({ mode, difficulty, roundTier });
    if (player1Name.trim()) params.set('p1', player1Name.trim());
    if (mode === 'PASS_AND_PLAY' && player2Name.trim()) params.set('p2', player2Name.trim());
    navigate(`/gameplay/guest?${params.toString()}`, { replace: true });
  }

  const passAndPlay = mode === 'PASS_AND_PLAY';

  return (
    <main className="app">
      <Header onBack={() => navigate('/guest-home', { replace: true })} backLabel="Back to guest home" eyebrow="Guest play" />

      <div className="setup guest-play-variant">
        <section className="setup-section" aria-labelledby="mode-title">
          <div className="section-heading">
            <h2 id="mode-title">Choose mode</h2>
            <span>Step 01</span>
          </div>
          <div className="options mode-options guest-play-variant" role="group" aria-label="Guest play mode">
            <Option active={mode === 'VS_COMPUTER'} onClick={() => setMode('VS_COMPUTER')} icon="bot" name="Vs computer" note="Challenge System offline" className="mode-option guest-play-variant" />
            <Option active={passAndPlay} onClick={() => setMode('PASS_AND_PLAY')} icon="swap" name="Pass and play" note="Share one device" className="mode-option guest-play-variant" />
          </div>

          {passAndPlay ? (
            <div className="player-fields">
              <div>
                <label className="field-label" htmlFor="p1">Player one name</label>
                <input className="field" id="p1" type="text" maxLength={24} placeholder="Player one" value={player1Name} onChange={(e) => setPlayer1Name(e.target.value)} />
              </div>
              <div>
                <label className="field-label" htmlFor="p2">Player two name</label>
                <input className="field" id="p2" type="text" maxLength={24} placeholder="Player two" value={player2Name} onChange={(e) => setPlayer2Name(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="player-fields">
              <div>
                <label className="field-label" htmlFor="p1">Your name <span>(optional)</span></label>
                <input className="field" id="p1" type="text" maxLength={24} placeholder="Guest" value={player1Name} onChange={(e) => setPlayer1Name(e.target.value)} />
                <p className="field-note">You can change this before the match starts.</p>
              </div>
            </div>
          )}
        </section>

        <section className="setup-section" aria-labelledby="length-title">
          <div className="section-heading">
            <h2 id="length-title">Round length</h2>
            <span>Step 02</span>
          </div>
          <div className="options length-options" role="group" aria-label="Round length">
            {TIERS.map((t) => (
              <button key={t.key} type="button" aria-pressed={roundTier === t.key} onClick={() => setRoundTier(t.key)} className={`option${roundTier === t.key ? ' active' : ''}`}>
                <span className="option-icon" aria-hidden="true">{'•'.repeat(ROUND_TIER_CONFIG[t.key].codeLength)}</span>
                <strong>{t.name}</strong>
                <small>{ROUND_TIER_CONFIG[t.key].codeLength} digits &middot; {ROUND_TIER_CONFIG[t.key].guessLimit} guesses</small>
              </button>
            ))}
          </div>
        </section>

        <section className="setup-section" aria-labelledby="rules-title">
          <div className="section-heading">
            <h2 id="rules-title">Rules</h2>
            <span>Step 03</span>
          </div>
          <div className="options rule-options" role="group" aria-label="Ruleset">
            {RULES.map((r) => (
              <Option key={r.key} active={difficulty === r.key} onClick={() => setDifficulty(r.key)} icon={r.icon} name={r.name} note={r.desc} />
            ))}
          </div>
          <p className="rules-note">{difficulty === 'STANDARD' ? 'The right place is marked on every guess.' : 'The right place is hidden. Same code, harder to read.'}</p>
        </section>

        <section className="setup-section" aria-label="Practice match preview">
          <div className="preview">
            <div>
              <p className="preview-label">Practice match</p>
              <strong>{mode === 'VS_COMPUTER' ? 'Vs computer' : 'Pass and play'} &middot; {TIERS.find((t) => t.key === roundTier).name}</strong>
              <p>{RULES.find((r) => r.key === difficulty).name} rules &middot; no turn timer</p>
            </div>
            <div className="preview-code" aria-hidden="true">
              {Array.from({ length: config.codeLength }, (_, i) => <span key={i}>?</span>)}
            </div>
          </div>
        </section>

        <button type="button" onClick={confirm} className="launch">Start practice <span aria-hidden="true">&rarr;</span></button>
        <p className="bottom-note">Guest matches are not saved to an account.</p>
      </div>
    </main>
  );
}
