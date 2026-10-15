import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../../stores/matchStore';
import ConfirmDialog from './ConfirmDialog';

/**
 * Blocking modal for an active authenticated session that has exhausted its
 * auto-reconnect attempts (see hooks/useReconnectGate.js). "Reconnect"
 * retries the socket in place. "Play as guest" abandons the online session
 * and drops the player into client-side guest play, since their match/queue
 * state can no longer be trusted without a connection.
 */
export default function ReconnectModal({ open, onRetry }) {
  const navigate = useNavigate();
  const resetMatch = useMatchStore((s) => s.reset);

  function playAsGuest() {
    resetMatch();
    navigate('/play?guest=1', { replace: true });
  }

  return (
    <ConfirmDialog
      open={open}
      locked
      tone="warn"
      eyebrow="Connection lost"
      title="Could not reconnect"
      body="We couldn't reach the guessIo servers after several attempts. You can try again, or switch to an offline guest match."
      cancelLabel="Play as guest"
      confirmLabel="Reconnect"
      onCancel={playAsGuest}
      onConfirm={onRetry}
    />
  );
}
