import ConfirmDialog from './ConfirmDialog';

/**
 * Blocking prompt for a player the server still seats in a live match. The
 * caller decides what resuming and abandoning mean for its screen.
 */
export default function ActiveMatchDialog({ open, onResume, onAbandon }) {
  return (
    <ConfirmDialog
      open={open}
      locked
      tone="warn"
      eyebrow="Match in progress"
      title="You have an active match"
      body="You are still seated in a match. Reconnect to continue it, or abandon it, which counts as a forfeit and may affect your rating."
      cancelLabel="Abandon match"
      confirmLabel="Reconnect"
      onCancel={onAbandon}
      onConfirm={onResume}
    />
  );
}
