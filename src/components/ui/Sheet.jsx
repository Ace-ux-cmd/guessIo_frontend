import { useEffect, useRef } from 'react';
import Icon from './Icon';

/**
 * Bottom sheet on mobile; becomes a centred dialog at >=768px (see the
 * `.ov` rules in app.css, ported from the redesign's desktop layer).
 * Backdrop click and Escape close it unless `locked` (blocking dialogs).
 */
export default function Sheet({ open, onClose, title, children, locked = false, showClose = true, labelledBy }) {
  useEffect(() => {
    if (!open || locked || !onClose) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, locked, onClose]);

  const overlayRef = useRef(null);
  const dialogRef = useRef(null);

  // While open, everything outside this dialog is inert, so Tab and clicks
  // cannot reach the controls behind it. Focus moves into the dialog and goes
  // back to where it was on close.
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!open || !overlay) return undefined;
    const previouslyFocused = document.activeElement;
    const madeInert = [];
    for (let node = overlay; node && node !== document.body; node = node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling !== node && !sibling.hasAttribute('inert')) {
          sibling.setAttribute('inert', '');
          madeInert.push(sibling);
        }
      }
    }
    dialogRef.current?.focus({ preventScroll: true });
    return () => {
      for (const element of madeInert) element.removeAttribute('inert');
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      ref={overlayRef}
      className="ov fixed inset-0 z-40 flex items-end justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (!locked && onClose && e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || (title ? 'sheet-title' : undefined)}
        className="relative w-full max-w-[430px] bg-s1 border-t border-line rounded-t-2xl p-6 pb-8 animate-rise outline-none"
      >
        {showClose && onClose && !locked && (
          <button type="button" onClick={onClose} className="absolute right-4 top-4 p-2 text-mute" aria-label="Close">
            <Icon name="close" />
          </button>
        )}
        {title && <h2 id="sheet-title" className="text-xl font-bold">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
