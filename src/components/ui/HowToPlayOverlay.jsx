import { useEffect, useRef, useState } from 'react';
import Sheet from './Sheet';
import Tile from './Tile';

// Worked example, ported from the redesign's How-to-play sheet.
const GUESS = '52184';
const FEEDBACK = ['c', 'p', 'w', 'c', 'w'];
const NOTES = [
  '5 is in the right place.',
  '2 is in the code, but not there.',
  '8 is in the right place.',
  '1 is not in the code.',
  '4 is not in the code.',
];
const STEPS = 4;

/** Shared rules/help sheet used by the authenticated Home and guest Home. */
export default function HowToPlayOverlay({ open, onClose }) {
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(0); // tiles revealed on the "watch the colors" step
  const timer = useRef(null);

  // Reset to the first step each time it opens.
  useEffect(() => {
    if (open) { setStep(0); setRevealed(0); }
  }, [open]);

  // Step 3 animates the colors one tile at a time (500ms apart).
  useEffect(() => {
    clearTimeout(timer.current);
    if (!open || step !== 2) return undefined;
    setRevealed(0);
    let k = 0;
    function tick() {
      if (k > GUESS.length - 1) { setRevealed(GUESS.length); return; }
      k += 1;
      setRevealed(k);
      timer.current = setTimeout(tick, 500);
    }
    timer.current = setTimeout(tick, 0);
    return () => clearTimeout(timer.current);
  }, [open, step]);

  const secretRow = (
    <>
      <div className="text-xs text-mute">Secret code</div>
      <div className="flex gap-1.5">
        {[...GUESS].map((_, i) => <Tile key={i} size="w-11 h-11 text-xl">?</Tile>)}
      </div>
      <div className="text-xs text-mute mt-2">Your guess</div>
    </>
  );

  let text;
  let visual;
  if (step === 0) {
    text = 'Each round has one secret code of unique digits, 4 to 6 digits long depending on round length. Every player races to crack the same code.';
    visual = (
      <div className="flex gap-1.5">
        {[...GUESS].map((_, i) => <Tile key={i} size="w-11 h-11 text-xl">?</Tile>)}
      </div>
    );
  } else if (step === 1) {
    text = 'On your turn, guess a code the same length. This one has 5 digits.';
    visual = (
      <>
        {secretRow}
        <div className="flex gap-1.5">
          {[...GUESS].map((d, i) => <Tile key={i} state="raw" size="w-11 h-11 text-xl">{d}</Tile>)}
        </div>
      </>
    );
  } else if (step === 2) {
    text = revealed === 0 ? 'Watch the colors.'
      : revealed <= GUESS.length - 1 ? NOTES[revealed - 1]
        : '5 and 8 are in the right place. 2 is in the code, but somewhere else. 1 and 4 are not in the code.';
    visual = (
      <>
        {secretRow}
        <div className="flex gap-1.5">
          {[...GUESS].map((d, i) => (
            i < revealed
              ? <Tile key={i} state={FEEDBACK[i]} className="flip" size="w-11 h-11 text-xl">{d}</Tile>
              : <Tile key={i} state="raw" size="w-11 h-11 text-xl">{d}</Tile>
          ))}
        </div>
      </>
    );
  } else {
    text = 'Standard shows correct places and present digits. Hardcore hides position information, so you only get presence information and must deduce more. Solve the code before your opponents to win the round.';
    visual = null;
  }

  function next() {
    if (step >= STEPS - 1) { onClose(); return; }
    setStep(step + 1);
  }

  return (
    <Sheet open={open} onClose={onClose} title="How to play">
      <p className="mt-2 text-mute text-[15px] min-h-[66px]">{text}</p>
      {visual && <div className="mt-4 flex flex-col items-center gap-2">{visual}</div>}
      <button type="button" onClick={next} className="mt-5 w-full h-12 rounded-lg bg-g text-bg font-bold">
        {step >= STEPS - 1 ? 'Got it' : 'Next'}
      </button>
    </Sheet>
  );
}
