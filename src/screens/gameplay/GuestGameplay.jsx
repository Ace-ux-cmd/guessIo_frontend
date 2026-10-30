import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import GuessInput from '../../components/gameplay/GuessInput';
import GuessBoard from '../../components/gameplay/GuessBoard';
import Scoreboard from '../../components/gameplay/Scoreboard';
import TurnPanel from '../../components/gameplay/TurnPanel';
import RoundResult from './RoundResult';
import { MAX_ROUNDS_PER_MATCH } from '../../constants/gameConfig';
import { useGuestMatch, findResumableGuestMatch } from '../../hooks/useGuestMatch';
import { useBackButtonHandler } from '../../hooks/useBackButtonHandler';
import { useUnloadWarning } from '../../hooks/useUnloadWarning';
import { computeRoundTimingStats } from '../../game/GuestMatch';

const DEFAULT_NAMES = { guest: 'Guest', system: 'System', 'player-2': 'Player 2' };

/**
 * Guest (offline) gameplay: same layout and shared components as online
 * Gameplay, but driven entirely by game/GuestMatch.js with no socket/server.
 * Handles VS_COMPUTER (bot auto-plays) and PASS_AND_PLAY (a "pass the device"
 * screen between human turns).
 *
 * On mount, checks localStorage for a resumable in-progress match and always
 * asks explicitly whether to continue or start fresh - never silently
 * resumes and never silently discards (product decision, unchanged).
 */
export default function GuestGameplay() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'PASS_AND_PLAY' ? 'PASS_AND_PLAY' : 'VS_COMPUTER';
  const difficulty = searchParams.get('difficulty') === 'HARDCORE' ? 'HARDCORE' : 'STANDARD';
  const roundTierParam = searchParams.get('roundTier');
  const roundTier = ['EASY', 'MEDIUM', 'HARD'].includes(roundTierParam) ? roundTierParam : 'EASY';
  const playerNames = { player1: searchParams.get('p1') || '', player2: searchParams.get('p2') || '' };

  const resumableSnapshot = useMemo(() => findResumableGuestMatch({ mode }), [mode]);
  // undefined = still deciding; null = start fresh; object = resume that snapshot.
  const [resumeChoice, setResumeChoice] = useState(() => (resumableSnapshot ? undefined : null));

  if (resumeChoice === undefined) {
    return (
      <main className="mx-auto w-full max-w-[430px] min-h-screen">
        <ConfirmDialog
          open
          locked
          tone="success"
          eyebrow="Practice match"
          title="Resume match?"
          body="You have an unfinished practice match. Continue where you left off, or start a new one?"
          cancelLabel="Start new"
          confirmLabel="Resume"
          onCancel={() => setResumeChoice(null)}
          onConfirm={() => setResumeChoice(resumableSnapshot)}
        />
      </main>
    );
  }

  return <GuestGameplayActive mode={mode} difficulty={difficulty} roundTier={roundTier} playerNames={playerNames} resumeFrom={resumeChoice} />;
}

function GuestGameplayActive({ mode, difficulty, roundTier, playerNames, resumeFrom }) {
  const navigate = useNavigate();
  const { match, humanId, submitGuess, abandonMatch, pendingRoundAdvance, advanceToNextRound } = useGuestMatch({
    difficulty, mode, roundTier, playerNames, resumeFrom,
  });
  const [draft, setDraft] = useState('');
  const [quitOpen, setQuitOpen] = useState(false);
  const [passInterstitial, setPassInterstitial] = useState(false);

  const round = match.currentRound;
  const activePlayerId = match.activePlayerId;
  const isPassAndPlay = match.isLocalPassAndPlay;

  const names = useMemo(() => {
    const n = { ...DEFAULT_NAMES };
    match.players.forEach((p) => { if (p.name) n[p.id] = p.name; });
    return n;
  }, [match.players]);

  useEffect(() => { setDraft(''); }, [activePlayerId, round?.roundNumber]);

  // One toggle shared by Escape and the device/browser back button.
  function handleDismissOrPrompt() { setQuitOpen((open) => !open); }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return;
      if (passInterstitial || pendingRoundAdvance) return;
      // Once open, the dialog (Sheet) closes itself on Escape; toggling here
      // as well would close and immediately reopen it.
      if (quitOpen) return;
      handleDismissOrPrompt();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [passInterstitial, pendingRoundAdvance, quitOpen]);

  useBackButtonHandler(match.status !== 'COMPLETED' && !passInterstitial && !pendingRoundAdvance ? handleDismissOrPrompt : null);
  useUnloadWarning(match.status !== 'COMPLETED');

  // In pass-and-play, show a "pass the device" screen whenever the active
  // seat changes, so the secret board isn't visible to the next player early.
  useEffect(() => {
    if (isPassAndPlay && !pendingRoundAdvance) setPassInterstitial(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlayerId, round?.roundNumber]);

  useEffect(() => {
    // Only leave once the final round's result pause has been dismissed.
    if (match.status === 'COMPLETED' && !pendingRoundAdvance) {
      const p1 = match.players[0];
      const p2 = match.players[1];
      const winner = match.players.find((p) => p.id === match.winnerId);
      const params = new URLSearchParams({
        winnerId: match.winnerId || '',
        winnerName: winner?.name || '',
        mode,
        rounds: String(match.rounds.length),
        score: `${p1.roundsWon}-${p2.roundsWon}`,
      });
      navigate(`/results/guest?${params.toString()}`, { replace: true });
    }
  }, [match.status, match.winnerId, match.players, match.rounds.length, mode, navigate, pendingRoundAdvance]);

  const players = useMemo(
    () => match.players.map((p) => ({ userId: p.id, username: names[p.id] || p.name })),
    [match.players, names]
  );
  // Not memoized: GuestMatch mutates players in place, so identity-based memo keys go stale.
  const score = Object.fromEntries(match.players.map((p) => [p.id, p.roundsWon]));

  if (!round) return null;

  const codeLength = round.codeLength;
  const isMyTurn = !isPassAndPlay ? activePlayerId === humanId : true; // pass & play: whoever holds it
  const activeName = names[activePlayerId] || activePlayerId;

  function handleSubmit() {
    if (draft.length !== codeLength) return;
    submitGuess(isPassAndPlay ? activePlayerId : humanId, draft);
    setDraft('');
  }

  function handleQuit() {
    setQuitOpen(false);
    abandonMatch();
    navigate('/guest-home', { replace: true });
  }

  if (isPassAndPlay && passInterstitial && !pendingRoundAdvance) {
    return (
      <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full border border-g bg-s1 text-g"><Icon name="users" /></div>
        <h1 className="mt-4 font-display text-4xl font-bold">Pass the device</h1>
        <p className="mt-2 text-mute">Hand it to <b className="text-white">{activeName}</b>, then tap when ready.</p>
        <div className="mt-6 w-full"><Button onClick={() => setPassInterstitial(false)}>{activeName}, I&apos;m ready</Button></div>
      </main>
    );
  }

  // Round just ended: hold on the result until the player taps Continue.
  if (pendingRoundAdvance) {
    const finishedRound = match.rounds[match.rounds.length - 1];
    const { roundTimeSeconds, fastestGuessSeconds, fastestGuessPlayerId } = computeRoundTimingStats(finishedRound);
    const roundResult = {
      roundNumber: finishedRound.roundNumber,
      winnerId: finishedRound.winnerId,
      score,
      secretCode: finishedRound.secretCode,
      guessLog: finishedRound.guessLog,
      roundTimeSeconds,
      fastestGuessSeconds,
      fastestGuessPlayerId,
      fastestGuessUsername: players.find((p) => p.userId === fastestGuessPlayerId)?.username ?? null,
      nextRoundStartsInSeconds: null,
      // Match is over as of this round: announce every round's code.
      isFinalRound: match.status === 'COMPLETED',
      allRounds: match.rounds,
    };
    return (
      <main className="app">
        <p className="practice-note">Practice match. Progress is not saved.</p>
        <RoundResult result={roundResult} players={players} myUserId={humanId} onCountdownComplete={advanceToNextRound} manualAdvance />
      </main>
    );
  }

  const title = isPassAndPlay ? `${activeName}'s turn` : isMyTurn ? 'Your turn' : 'System is thinking';

  return (
    <>
      <main className="app gameplay-live">
        <p className="practice-note">Practice match. Progress is not saved.</p>
        <header className="game-header">
          <div>
            <p className="round-label">Round {round.roundNumber} of {MAX_ROUNDS_PER_MATCH}</p>
            <span className="guess-count">Guess <strong>{Math.min(round.guessLog.length + 1, round.guessLimit || round.guessLog.length + 1)}</strong>{round.guessLimit ? <> of <strong>{round.guessLimit}</strong></> : null}</span>
          </div>
          <button type="button" onClick={() => setQuitOpen(true)} className="forfeit" aria-label="Leave match">&#9873;</button>
        </header>

        <Scoreboard players={players} score={score} activePlayerId={activePlayerId} myUserId={isPassAndPlay ? activePlayerId : humanId} activeNote="thinking" />

        <section className="history" aria-label="Guess board" aria-live="polite">
          <GuessBoard
            guessLog={round.guessLog}
            players={players}
            difficulty={difficulty}
            myUserId={isPassAndPlay ? activePlayerId : humanId}
          />
        </section>

        <TurnPanel myTurn={isMyTurn} title={title} subtitle="One shared code. First to crack it wins the round.">
          <GuessInput length={codeLength} value={isMyTurn ? draft : ''} onChange={setDraft} onSubmit={handleSubmit} disabled={!isMyTurn} />
        </TurnPanel>
      </main>
      <ConfirmDialog
        open={quitOpen}
        tone="danger"
        title="Quit this match?"
        body="This is a practice match, so quitting won't affect any saved stats."
        cancelLabel="Keep playing"
        confirmLabel="Quit"
        onCancel={() => setQuitOpen(false)}
        onConfirm={handleQuit}
      />
    </>
  );
}
