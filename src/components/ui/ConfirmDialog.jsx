import Sheet from './Sheet';

const TONE = {
  neutral: { label: 'text-info', accent: 'c', confirm: 'btn' },
  warn: { label: 'text-warn', accent: 'o', confirm: 'btn' },
  danger: { label: 'text-bad', accent: 'r', confirm: 'btn danger' },
  success: { label: 'text-g', accent: 'g', confirm: 'btn' },
};

/**
 * Confirmation sheet. tone: neutral | warn | danger | success.
 * `eyebrow` is the small tone label above the title.
 */
export default function ConfirmDialog({
  open, tone = 'neutral', eyebrow, title, body, cancelLabel = 'Cancel', confirmLabel = 'Confirm',
  onCancel, onConfirm, busy = false, locked = false, children,
}) {
  const t = TONE[tone] || TONE.neutral;
  return (
    <Sheet open={open} onClose={onCancel} locked={locked} showClose={false} labelledBy="confirm-title" accent={t.accent}>
      {eyebrow && <div className={`text-xs font-bold uppercase tracking-wide ${t.label}`}>{eyebrow}</div>}
      <div id="confirm-title" className="font-display mt-0.5 text-2xl font-bold">{title}</div>
      {body && <p className="mt-2 text-[13px] text-mute">{body}</p>}
      {children}
      <div className="mt-5 flex gap-3">
        <button type="button" disabled={busy} onClick={onCancel} className="btn alt flex-1">{cancelLabel}</button>
        <button type="button" disabled={busy} onClick={onConfirm} className={`${t.confirm} flex-1`}>{confirmLabel}</button>
      </div>
    </Sheet>
  );
}
