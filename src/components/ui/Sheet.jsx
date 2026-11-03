import { useEffect, useRef } from 'react';
import Icon from './Icon';
import { useExitTransition } from '../../hooks/useExitTransition';

/**
 * Overlay panel that fades and slides in and out (never just appears).
 * `variant="bottom"` is a sheet from the bottom on a phone and a centred
 * dialog on wider screens (the `.ov` rules in app.css); `variant="center"` is
 * a centred pop-up on every screen. Backdrop click and Escape close it unless
 * `locked`. While open, everything outside is inert and focus returns to where
 * it was on close. `accent` is a card accent suffix: g | c | p | o | r.
 */
export default function Sheet({ open, onClose, title, children, locked = false, showClose = true, labelledBy, accent = 'c', variant = 'bottom' }) {
  const { mounted, shown } = useExitTransition(open, 250);
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const center = variant === 'center';

  useEffect(() => {
    if (!open || locked || !onClose) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, locked, onClose]);

  // Keep the page behind a sheet anchored at its current scroll position.
  // The panel itself remains scrollable, so long dialogs can be read without
  // the underlying page shifting when the user swipes.
  useEffect(() => {
    if (!open || !mounted) return undefined;
    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    return () => {
      Object.assign(body.style, previous);
      window.scrollTo(0, scrollY);
    };
  }, [open, mounted]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!open || !mounted || !overlay) return undefined;
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
  }, [open, mounted]);

  if (!mounted) return null;

  const panel = center
    ? `max-w-[400px] rounded-[12px] transition duration-[250ms] ease-out ${shown ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`
    : `max-w-[430px] rounded-b-none transition-transform duration-300 ease-out ${shown ? 'translate-y-0' : 'translate-y-full'}`;

  return (
    <div
      ref={overlayRef}
      className={`${center ? 'fixed inset-0 z-40 flex items-center justify-center p-5' : 'ov fixed inset-0 z-40 flex items-end justify-center'} bg-black/80 transition-opacity duration-[250ms] ${shown ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => { if (!locked && onClose && e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || (title ? 'sheet-title' : undefined)}
        className={`card a-${accent} relative w-full ${panel} p-5 ${center ? '' : 'pb-8'} outline-none max-h-[90dvh] overflow-y-auto`}
        style={center ? undefined : { borderBottomWidth: 0 }}
      >
        {showClose && onClose && !locked && (
          <button type="button" onClick={onClose} className="absolute right-3 top-3 p-2 text-mute" aria-label="Close">
            <Icon name="close" />
          </button>
        )}
        {title && <h2 id="sheet-title" className="font-display pr-10 text-2xl font-bold">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
