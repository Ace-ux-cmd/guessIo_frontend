/**
 * Switch with a visible label. `onChange` receives the next boolean.
 * `variant` picks the template's pill styling: 'custom-room' (cyan, .active)
 * used on the private-room setup card, 'settings' (cyan, .on) used on the
 * settings screen. Omit it to keep the original Tailwind pill.
 */
export default function Toggle({ label, description, checked, onChange, disabled = false, variant }) {
  if (variant === 'custom-room') {
    return (
      <div className="creator-setting">
        <div className="creator-setting-copy">
          <strong>{label}</strong>
          {description && <span>{description}</span>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`toggle custom-room-variant${checked ? ' active' : ''}`}
        />
      </div>
    );
  }
  if (variant === 'settings') {
    return (
      <div className="setting">
        <div className="setting-copy">
          <strong>{label}</strong>
          {description && <span>{description}</span>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`toggle settings-variant${checked ? ' on' : ''}`}
        />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span>
        <b className="block">{label}</b>
        {description && <span className="block text-sm text-mute">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full border p-0.5 transition-colors duration-200 disabled:opacity-50 ${checked ? 'border-info bg-info/15' : 'border-edge bg-s2'}`}
      >
        <i className={`block h-6 w-6 rounded-full transition-transform duration-200 ${checked ? 'translate-x-6 bg-info' : 'bg-mute'}`} />
      </button>
    </div>
  );
}
