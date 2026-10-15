/**
 * Bottom panel of the gameplay screen: turn status on the left, countdown ring
 * on the right, and the input/keypad (children) underneath. The panel glows
 * green while it is the viewer's turn (see `.panel.on` in app.css).
 */
export default function TurnPanel({ myTurn, title, subtitle, timer, children }) {
  return (
    <section className={`panel px-4 pt-3 pb-4 bg-s1 border-t border-line ${myTurn ? 'on' : ''}`}>
      <div className="flex items-end justify-between">
        <div>
          <div aria-live="polite" className={`text-3xl font-black ${myTurn ? 'text-g' : 'text-mute'}`}>{title}</div>
          <div className="text-sm text-mute">{subtitle}</div>
        </div>
        {timer}
      </div>
      {children}
    </section>
  );
}
