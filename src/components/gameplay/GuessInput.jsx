import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Digit entry: a row of input tiles above a 3-column keypad. Enforces unique
 * digits and the code length client-side (the server re-validates). Also
 * listens for the physical keyboard while mounted (digits, Backspace, Enter),
 * except while a text field or a modal dialog has focus.
 */
export default function GuessInput({ length, value, onChange, onSubmit, disabled, pending = false }) {
  const usedDigits = useMemo(() => new Set(value.split('')), [value]);
  const isComplete = value.length === length;
  const canSubmit = isComplete && !pending;
  const [notice, setNotice] = useState(null);
  const noticeTimer = useRef(null);

  // One timer at a time: a second tap restarts the 1.2s window instead of the first
  // timer wiping the newer message, and nothing fires after the screen is gone.
  function warn(message) {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 1200);
  }
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  function pressDigit(digit) {
    if (disabled) return;
    if (usedDigits.has(digit)) { warn(`${digit} is already used`); return; }
    if (value.length >= length) return;
    onChange(value + digit);
  }

  function backspace() {
    if (disabled) return;
    onChange(value.slice(0, -1));
  }

  function submit() {
    if (disabled || !canSubmit || !onSubmit) return;
    onSubmit();
  }

  useEffect(() => {
    function onKeyDown(e) {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (typing) return;
      // A modal dialog owns the keyboard: without this, digits edit the draft
      // and Enter submits a guess behind it.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (e.key >= '0' && e.key <= '9') { e.preventDefault(); pressDigit(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); backspace(); }
      else if (e.key === 'Enter') { e.preventDefault(); submit(); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length, disabled, canSubmit]);

  const digitKey = (d) => (
    <button key={d} type="button" onClick={() => pressDigit(d)} className={`key${usedDigits.has(d) ? ' used' : ''}`}>{d}</button>
  );

  return (
    <>
      <div className={`entry${notice ? ' shake' : ''}`} role="group" aria-label="Your guess">
        {Array.from({ length }).map((_, i) => {
          const cur = i === value.length && !disabled;
          return <span key={i} className={`digit gameplay-variant${value[i] ? '' : ' blank'}${cur ? ' current' : ''}`}>{value[i] || '?'}</span>;
        })}
      </div>
      <div className="entry-notice" role="status">{notice || ''}</div>
      <div className={`keypad${disabled ? ' keys-off' : ''}`} role="group" aria-label="Number keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digitKey)}
        {digitKey('0')}
        <button type="button" onClick={backspace} className="key clear">Delete</button>
        <button type="button" onClick={submit} aria-disabled={!canSubmit} className={`key go${canSubmit ? '' : ' is-off'}`}>Go</button>
      </div>
    </>
  );
}
