import { useEffect, useMemo, useState } from 'react';

/**
 * Digit-entry control from the redesign: a row of input tiles above a 3-column
 * keypad. Enforces unique digits and the target length client-side (server
 * re-validates authoritatively).
 *
 * Also listens for the physical keyboard while mounted (digit keys, Backspace,
 * Enter) - ignored while focus is in a text field.
 */
export default function GuessInput({ length, value, onChange, onSubmit, disabled }) {
  const usedDigits = useMemo(() => new Set(value.split('')), [value]);
  const isComplete = value.length === length;
  const [notice, setNotice] = useState(null);

  function warn(message) {
    setNotice(message);
    setTimeout(() => setNotice(null), 900);
  }

  function pressDigit(digit) {
    if (disabled) return;
    if (usedDigits.has(digit)) { warn(`${digit} already used`); return; }
    if (value.length >= length) return;
    onChange(value + digit);
  }

  function backspace() {
    if (disabled) return;
    onChange(value.slice(0, -1));
  }

  function submit() {
    if (disabled || !isComplete || !onSubmit) return;
    onSubmit();
  }

  useEffect(() => {
    function onKeyDown(e) {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (typing) return;
      // A modal dialog owns the keyboard: without this, digits edit the draft
      // and Enter submits a guess behind it, and the preventDefault below
      // would stop Enter activating the dialog's own buttons.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (e.key >= '0' && e.key <= '9') { e.preventDefault(); pressDigit(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); backspace(); }
      else if (e.key === 'Enter') { e.preventDefault(); submit(); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length, disabled, isComplete]);

  const keyCls = 'key h-12 rounded-md bg-s2 border border-line text-xl font-bold tnum';

  return (
    <>
      <div className={`mt-3 flex justify-center gap-2 ${notice ? 'shake' : ''}`} aria-label="Your guess">
        {Array.from({ length }).map((_, i) => {
          const filled = Boolean(value[i]);
          const cur = !filled && i === value.length && !disabled;
          const lock = filled && i === value.length - 1;
          return (
            <span key={i} className={`tile raw w-14 h-14 text-2xl ${cur ? 'cur' : ''} ${lock ? 'lock' : ''}`}>
              {value[i] || ''}
            </span>
          );
        })}
      </div>
      <div className="h-5 mt-1 text-center text-xs font-semibold text-warn" role="status">{notice || ''}</div>
      <div className={`mt-1 grid grid-cols-3 gap-2 ${disabled ? 'keys-off' : ''}`}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" onClick={() => pressDigit(d)} className={`${keyCls} ${usedDigits.has(d) ? 'opacity-30' : ''}`}>{d}</button>
        ))}
        <button type="button" onClick={backspace} className="key h-12 rounded-md bg-s2 border border-line text-sm font-semibold text-mute">Delete</button>
        <button type="button" onClick={() => pressDigit('0')} className={`${keyCls} ${usedDigits.has('0') ? 'opacity-30' : ''}`}>0</button>
        <button
          type="button"
          onClick={submit}
          aria-disabled={!isComplete}
          className={`go h-12 rounded-md text-base font-bold ${isComplete ? 'bg-g text-bg armed' : 'bg-g/30 text-g/60'}`}
        >
          Go
        </button>
      </div>
    </>
  );
}
