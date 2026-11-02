import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { Banner, LoadingScreen, ErrorState } from '../../components/ui/Feedback';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ConnectionBanner from '../../components/ui/ConnectionBanner';
import Timer from '../../components/gameplay/Timer';
import GuessInput from '../../components/gameplay/GuessInput';
import GuessBoard from '../../components/gameplay/GuessBoard';
import Scoreboard from '../../components/gameplay/Scoreboard';
import TurnPanel from '../../components/gameplay/TurnPanel';
import RoundResult from './RoundResult';
import { SkillLobby, SkillTab, SkillToast, FrozenNotice } from '../../components/gameplay/SkillUi';
import ReconnectModal from '../../components/ui/ReconnectModal';
import { PLAYER_COUNT_CONFIG, MAX_ROUNDS_PER_MATCH } from '../../constants/gameConfig';
import { useMatchSocket } from '../../hooks/useMatchSocket';
import { useMatchReconnect } from '../../hooks/useMatchReconnect';
import { useReconnectGate } from '../../hooks/useReconnectGate';
import { useBackButtonHandler } from '../../hooks/useBackButtonHandler';
import { useUnloadWarning } from '../../hooks/useUnloadWarning';
import { emit } from '../../sockets/socketClient';
import { useMatchStore } from '../../stores/matchStore';
import { useAuthStore } from '../../stores/authStore';

/** Shared by the ROUND_ENDED and in-progress renders: Escape / device back can open it from either. */
function ResignConfirmModal({ open, onCancel, onConfirm }) {
  return (
    <ConfirmDialog
      open={open}
      tone="danger"
      title="Forfeit this match?"
      body="Leaving now counts as a forfeit and may affect your rating. Your opponents will be notified."
      cancelLabel="Keep playing"
      confirmLabel="Forfeit"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

const IN_MATCH_STATUSES = ['STARTING', 'ACTIVE', 'ROUND_ENDED'];
// How long the last round's result stays up before the match results, the same pause the
// server gives between rounds.
const FINAL_REVEAL_SECONDS = 3;

export default function Gameplay() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const store = useMatchStore();
  const [draft, setDraft] = useState('');
  const [resignOpen, setResignOpen] = useState(false);
  const resigningRef = useRef(false);
  const reconnectGate = useReconnectGate();
  const reconnectAttemptStatus = useMatchReconnect();

  useMatchSocket();

  // If the server never answers a guess (a dropped event), unlock the keypad after
  // a few seconds instead of leaving the player unable to guess. The periodic
  // resync will have corrected the board by then.
  useEffect(() => {
    if (!store.guessPending) return undefined;
    const id = setTimeout(() => useMatchStore.setState({ guessPending: false }), 5000);
    return () => clearTimeout(id);
  }, [store.guessPending]);

  // The round that ends the match is shown for a few seconds (who cracked it, the code)
  // and then the match results follow. Without this the screen jumped from the round
  // result to a flash of the live board to the results. A match that ends without a
  // cracked code (a forfeit, a cancellation) goes straight to the results.
  const [revealDone, setRevealDone] = useState(false);
  const finished = store.status === 'ENDED' || store.status === 'CANCELLED';
  const roundResult = store.roundResult;
  const showFinalReveal = Boolean(roundResult) && !roundResult.byForfeit
    && (store.status === 'ENDED' || (store.status === 'ROUND_ENDED' && roundResult.isFinalRound));
  const holdForReveal = store.status === 'ENDED' && showFinalReveal && !revealDone;

  useEffect(() => {
    if (finished && !holdForReveal) navigate('/results', { replace: true });
  }, [finished, holdForReveal, navigate]);

  useEffect(() => {
    setDraft('');
  }, [store.activePlayerId, store.roundNumber]);

  // Single toggle used identically by the Escape key, the device/browser back
  // button, and the global guard's synchronous fallback below, so all three
  // ways of "backing out" during a match stay in sync.
  function handleDismissOrPrompt() {
    setResignOpen((open) => !open);
  }

  // Escape opens the forfeit confirmation - only while a match is in progress.
  // Once open, the dialog (Sheet) closes itself on Escape; toggling here as
  // well would close and immediately reopen it.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return;
      if (!IN_MATCH_STATUSES.includes(store.status)) return;
      if (resignOpen) return;
      handleDismissOrPrompt();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [store.status, resignOpen]);

  // Device/browser back during a match toggles the same forfeit modal (see
  // useBackNavigationGuard.js). The match is never forfeited by back/Escape
  // alone - only the modal's explicit "Forfeit" does that.
  const matchInProgress = IN_MATCH_STATUSES.includes(store.status);
  // While the last round's result is up, Back skips ahead to the results instead of
  // leaving the match unseen.
  useBackButtonHandler(holdForReveal ? () => setRevealDone(true) : matchInProgress ? handleDismissOrPrompt : null);
  useUnloadWarning(matchInProgress);

  // Safety net for the brief window after a hard refresh lands on /gameplay
  // before the handler above has registered: the global guard bumps
  // resignPromptRequestId and we react to it here (see useBackNavigationGuard.js).
  const seenResignRequestRef = useRef(store.resignPromptRequestId);
  useEffect(() => {
    if (store.resignPromptRequestId !== seenResignRequestRef.current) {
      seenResignRequestRef.current = store.resignPromptRequestId;
      if (IN_MATCH_STATUSES.includes(store.status)) setResignOpen(true);
    }
  }, [store.resignPromptRequestId, store.status]);

  if (!store.matchId) {
    // If this is a hard refresh mid-match, useMatchReconnect is asking the
    // server whether the persisted matchId still has a live match; success
    // populates store.matchId via applySnapshot and falls through below.
    if (reconnectAttemptStatus === 'reconnecting') {
      return (
        <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col justify-center">
          <LoadingScreen label="Reconnecting to your match…" />
        </main>
      );
    }
    return (
      <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col justify-center px-5">
        <ErrorState
          title="No active match"
          description="Head back to Play to find a match."
          action={<Button onClick={() => navigate('/play', { replace: true })}>Back to play</Button>}
        />
      </main>
    );
  }

  // Before the countdown, a match that has skills runs the turn-based pick.
  if (store.status === 'FOUND' && store.config?.skills && store.config?.matchType !== 'PRIVATE') {
    return (
      <>
        <SkillLobby matchId={store.matchId} myUserId={user?.id} />
        <ReconnectModal open={reconnectGate.exhausted} onRetry={reconnectGate.retry} />
      </>
    );
  }

  const config = PLAYER_COUNT_CONFIG[store.config?.playerCount] || { codeLength: 4, guessLimit: 10 };
  const guessLimit = store.guessLimit ?? config.guessLimit;
  const isMyTurn = store.activePlayerId === user?.id;
  const activePlayer = store.players.find((p) => p.userId === store.activePlayerId);
  const activePlayerAway = store.disconnectedPlayerIds.includes(store.activePlayerId);

  function submitGuess() {
    // A second send before the server answers would only come back as a stale
    // "not your turn" banner.
    if (draft.length !== config.codeLength || store.guessPending) return;
    emit('guess.submit', { matchId: store.matchId, guess: draft });
    store.onGuessSent();
    setDraft('');
  }

  function resign() {
    if (resigningRef.current) return; // a double tap on Forfeit must not send two forfeits
    resigningRef.current = true;
    emit('match.forfeit', { matchId: store.matchId });
    setResignOpen(false);
    // Also clears the persisted matchId (see matchStore.reset) - this path
    // goes straight to /dashboard and never touches Results.
    store.reset();
    navigate('/dashboard', { replace: true });
  }

  // The match is over and there is no round result to show: never paint the live board
  // (with its keypad and "is guessing" title) while the route changes.
  if (finished && !showFinalReveal) return null;
  // A forfeit closes the round for the player who stayed; nothing to reveal, match.ended follows.
  if (store.status === 'ROUND_ENDED' && roundResult?.byForfeit) return null;

  // Round just ended: take over the whole screen with the result reveal. For the last
  // round the countdown says "Match results in 3s" and then hands over to the results.
  if ((store.status === 'ROUND_ENDED' || showFinalReveal) && roundResult) {
    const result = showFinalReveal ? { ...roundResult, isFinalRound: true, nextRoundStartsInSeconds: FINAL_REVEAL_SECONDS } : roundResult;
    return (
      <>
        <main className="app">
          <RoundResult
            result={result}
            players={store.players}
            myUserId={user?.id}
            onCountdownComplete={showFinalReveal ? () => setRevealDone(true) : undefined}
          />
        </main>
        <ResignConfirmModal open={resignOpen} onCancel={() => setResignOpen(false)} onConfirm={resign} />
        <ReconnectModal open={reconnectGate.exhausted} onRetry={reconnectGate.retry} />
      </>
    );
  }

  const guessesUsed = store.guessLog.length;
  // FOUND without a skill lobby is the moment before the countdown; show it as starting.
  const starting = store.status === 'STARTING' || store.status === 'FOUND';
  const title = starting
    ? 'Match starting'
    : isMyTurn ? 'Your turn' : `${activePlayer?.username || 'Opponent'} is guessing`;

  return (
    <>
      <main className="app gameplay-live">
        <header className="game-header">
          <div>
            <p className="round-label">Round {store.roundNumber} of {MAX_ROUNDS_PER_MATCH}</p>
            <span className="guess-count">Guess <strong>{Math.min(guessesUsed + 1, guessLimit)}</strong> of <strong>{guessLimit}</strong></span>
          </div>
          <button type="button" onClick={() => setResignOpen(true)} className="forfeit" aria-label="Forfeit match">&#9873;</button>
        </header>

        <div className="px-4 empty:hidden mt-1"><ConnectionBanner /></div>

        <Scoreboard
          players={store.players}
          score={store.score}
          activePlayerId={store.activePlayerId}
          disconnectedPlayerIds={store.disconnectedPlayerIds}
          myUserId={user?.id}
        />

        {(store.inactivityWarning || store.lastRejection) && (
          <div className="px-4 mt-2 space-y-2">
            {store.config?.matchType === 'RANKED' && !store.rankedOpen && <Banner variant="info">The week is closing. This match still counts toward this week.</Banner>}
            {store.inactivityWarning && <Banner variant="warn">{store.inactivityWarning}</Banner>}
            {store.lastRejection && <Banner variant="error">{store.lastRejection.message}</Banner>}
          </div>
        )}

        {starting ? (
          <div className="flex-1"><LoadingScreen label="Match starting…" /></div>
        ) : (
          <>
            <section className="history" aria-label="Guess board" aria-live="polite">
              <GuessBoard
                guessLog={store.guessLog}
                players={store.players}
                myFeedbackHistory={store.myFeedbackHistory}
                myUserId={user?.id}
                difficulty={store.config?.difficulty}
                xray={store.xray && !store.xray.dead ? store.xray : null}
              />
            </section>

            <TurnPanel
              myTurn={isMyTurn}
              skillTab={store.status === 'ACTIVE' && (
                <SkillTab matchId={store.matchId} myUserId={user?.id} myTurn={isMyTurn} guessesLeft={guessLimit - guessesUsed} />
              )}
              title={title}
              subtitle={isMyTurn ? 'Crack the shared code' : activePlayerAway ? 'Waiting for them to reconnect' : 'Waiting for their guess'}
              timer={store.status === 'ACTIVE' && (
                <Timer
                  durationSeconds={store.turnDurationSeconds}
                  remainingSeconds={store.turnRemainingSeconds}
                  startKey={`${store.roundNumber}-${store.turnSeq}`}
                  emphasis={isMyTurn}
                />
              )}
            >
              <GuessInput
                length={config.codeLength}
                value={isMyTurn ? draft : ''}
                onChange={setDraft}
                onSubmit={submitGuess}
                disabled={!isMyTurn}
                pending={store.guessPending}
              />
            </TurnPanel>
          </>
        )}
      </main>
      <ResignConfirmModal open={resignOpen} onCancel={() => setResignOpen(false)} onConfirm={resign} />
      <SkillToast />
      <FrozenNotice />
      <ReconnectModal open={reconnectGate.exhausted} onRetry={reconnectGate.retry} />
    </>
  );
}
