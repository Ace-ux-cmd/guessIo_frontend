import Sheet from './Sheet';

export const RANKED_CLOSED_TEXT = 'The week is closing. Ranked matches reopen in a few minutes.';

/**
 * Blocking notice shown when a player reaches for ranked while the weekly reset has it shut.
 * It has one way out (`onClose`) and cannot be dismissed by the backdrop or Escape, so the
 * message is always read before the player carries on.
 */
export default function RankedClosedDialog({ open, onClose, closeLabel = 'OK' }) {
  return (
    <Sheet open={open} onClose={onClose} locked showClose={false} labelledBy="ranked-closed-title" accent="o">
      <div className="text-xs font-bold uppercase tracking-wide text-warn">Weekly reset</div>
      <div id="ranked-closed-title" className="font-display mt-0.5 text-2xl font-bold">Ranked is closed</div>
      <p className="mt-2 text-[0.8667rem] text-mute">
        {RANKED_CLOSED_TEXT} Casual matches, custom rooms and the Daily Challenge are still open.
      </p>
      <div className="mt-5">
        <button type="button" onClick={onClose} className="btn w-full">{closeLabel}</button>
      </div>
    </Sheet>
  );
}
