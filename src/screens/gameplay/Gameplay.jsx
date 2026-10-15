import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
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

export default function Gameplay() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const store = useMatchStore();
  const [draft, setDraft] = useState('');
  const [resignOpen, setResignOpen] = useState(false);
  const reconnectGate = useReconnectGate();
  const reconnectAttemptStatus = useMatchReconnect();

  useMatchSocket();

  useEffect(() => {
    if (store.status === 'ENDED' || store.status === 'CANCELLED') {
      navigate('/results', { replace: true });
    }
  }, [store.status, navigate]);

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
  useBackButtonHandler(matchInProgress ? handleDismissOrPrompt : null);
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

  const config = PLAYER_COUNT_CONFIG[store.config?.playerCount] || { codeLength: 4, guessLimit: 10 };
  const guessLimit = store.guessLimit ?? config.guessLimit;
  const isMyTurn = store.activePlayerId === user?.id;
  const activePlayer = store.players.find((p) => p.userId === store.activePlayerId);
  const activePlayerAway = store.disconnectedPlayerIds.includes(store.activePlayerId);

  function submitGuess() {
    if (draft.length !== config.codeLength) return;
    emit('guess.submit', { matchId: store.matchId, guess: draft });
    setDraft('');
  }

  function resign() {
    emit('match.forfeit', { matchId: store.matchId });
    setResignOpen(false);
    // Also clears the persisted matchId (see matchStore.reset) - this path
    // goes straight to /dashboard and never touches Results.
    store.reset();
    navigate('/dashboard', { replace: true });
  }

  // Round just ended: take over the whole screen with the result reveal.
  if (store.status === 'ROUND_ENDED' && store.roundResult) {
    return (
      <>
        <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col pb-6">
          <RoundResult result={store.roundResult} players={store.players} myUserId={user?.id} />
        </main>
        <ResignConfirmModal open={resignOpen} onCancel={() => setResignOpen(false)} onConfirm={resign} />
        <ReconnectModal open={reconnectGate.exhausted} onRetry={reconnectGate.retry} />
      </>
    );
  }

  const guessesUsed = store.guessLog.length;
  const title = store.status === 'STARTING'
    ? 'Match starting'
    : isMyTurn ? 'Your turn' : `${activePlayer?.username || 'Opponent'} is guessing`;

  return (
    <>
      <main className="gameplay-main mx-auto w-full max-w-[430px] h-screen flex flex-col">
        <header className="flex items-center justify-between px-4 pt-3">
          <span className="text-sm text-mute">Round {store.roundNumber} of {MAX_ROUNDS_PER_MATCH}</span>
          <span className="text-sm text-mute tnum">Guess {Math.min(guessesUsed + 1, guessLimit)} of {guessLimit}</span>
          <button type="button" onClick={() => setResignOpen(true)} className="p-2 -mr-2 text-mute" aria-label="Forfeit">
            <Icon name="flag" />
          </button>
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
            {store.inactivityWarning && <Banner variant="warn">{store.inactivityWarning}</Banner>}
            {store.lastRejection && <Banner variant="error">{store.lastRejection.message}</Banner>}
          </div>
        )}

        {store.status === 'STARTING' ? (
          <div className="flex-1"><LoadingScreen label="Match starting…" /></div>
        ) : (
          <>
            <div className="board-scroll flex-1 overflow-y-auto px-4 py-3 space-y-2">
              <GuessBoard
                guessLog={store.guessLog}
                players={store.players}
                myFeedbackHistory={store.myFeedbackHistory}
                myUserId={user?.id}
                difficulty={store.config?.difficulty}
                freshIndex={store.guessLog.length - 1}
              />
            </div>

            <TurnPanel
              myTurn={isMyTurn}
              title={title}
              subtitle={isMyTurn ? 'Crack the shared code' : activePlayerAway ? 'Waiting for them to reconnect' : 'Waiting for their guess'}
              timer={store.status === 'ACTIVE' && (
                <Timer
                  durationSeconds={store.turnDurationSeconds}
                  remainingSeconds={store.turnRemainingSeconds}
                  startKey={`${store.roundNumber}-${store.activePlayerId}-${store.guessLog.length}`}
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
              />
            </TurnPanel>
          </>
        )}
      </main>
      <ResignConfirmModal open={resignOpen} onCancel={() => setResignOpen(false)} onConfirm={resign} />
      <ReconnectModal open={reconnectGate.exhausted} onRetry={reconnectGate.retry} />
    </>
  );
}
