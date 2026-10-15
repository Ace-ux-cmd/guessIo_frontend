import Sheet from './Sheet';

const TONE = {
  neutral: { label: 'text-ink', confirm: 'bg-g text-bg' },
  warn: { label: 'text-warn', confirm: 'bg-g text-bg' },
  danger: { label: 'text-bad', confirm: 'bg-bad text-white' },
  success: { label: 'text-g', confirm: 'bg-g text-bg' },
};

/**
 * Confirmation dialog from the shared-components mockup.
 * tone: neutral | warn | danger | success. `eyebrow` is the small tone label.
 */
export default function ConfirmDialog({
  open, tone = 'neutral', eyebrow, title, body, cancelLabel = 'Cancel', confirmLabel = 'Confirm',
  onCancel, onConfirm, busy = false, locked = false, children,
}) {
  const t = TONE[tone] || TONE.neutral;
  return (
    <Sheet open={open} onClose={onCancel} locked={locked} showClose={false} labelledBy="confirm-title">
      {eyebrow && <div className={`text-xs font-semibold ${t.label}`}>{eyebrow}</div>}
      <div id="confirm-title" className="font-bold text-lg mt-0.5">{title}</div>
      {body && <p className="text-sm text-mute mt-1">{body}</p>}
      {children}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="flex-1 h-11 rounded-md border border-line flex items-center justify-center text-sm font-semibold disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={`flex-1 h-11 rounded-md flex items-center justify-center text-sm font-bold disabled:opacity-50 ${t.confirm}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
