/**
 * Bottom panel of the gameplay screen (turn-panel in gameplay.html): turn
 * status, the skill button and the countdown on one row, the digit entry and
 * keypad (children) underneath.
 */
export default function TurnPanel({ myTurn, title, subtitle, timer, skillTab, children }) {
  return (
    <section className="turn-panel" aria-label="Your turn controls">
      <div className="turn-status">
        <div className="turn-copy" aria-live="polite">
          <strong className={myTurn ? 'mine' : undefined}>{title}</strong>
          <span>{subtitle}</span>
        </div>
        {skillTab}
        {timer}
      </div>
      {children}
    </section>
  );
}
