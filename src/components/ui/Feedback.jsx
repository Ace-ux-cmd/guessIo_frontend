import Icon from './Icon';

const BANNER = {
  info: 'bg-info/20 text-info',
  error: 'bg-bad/20 text-bad',
  warn: 'bg-warn/20 text-warn',
  success: 'bg-g/20 text-g',
};
const BANNER_ICON = { info: 'help', error: 'alert', warn: 'alert', success: 'check' };

export function Banner({ variant = 'info', children }) {
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={`flex items-center gap-2 rounded-md p-3 text-sm font-semibold ${BANNER[variant] || BANNER.info}`}>
      <Icon name={BANNER_ICON[variant] || 'help'} className="w-4 h-4" />
      <span>{children}</span>
    </div>
  );
}

/** Loading state: wordmark plus skeleton rows (shared-components mockup). */
export function LoadingScreen({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center px-5 py-10" role="status" aria-label={label}>
      <div className="space-y-2 w-full">
        <div className="h-14 rounded-md bg-s1 animate-pulse" />
        <div className="h-14 rounded-md bg-s1 animate-pulse" />
      </div>
      <div className="mt-4 text-sm text-mute">{label}</div>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-6 text-center">
      <div className="font-bold">{title}</div>
      {description && <p className="text-sm text-mute mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description, action, code }) {
  return (
    <div className="rounded-xl bg-s1 p-5 text-center">
      <div className="mx-auto w-11 h-11 rounded-full bg-bad/25 text-bad flex items-center justify-center">
        <Icon name="alert" />
      </div>
      <div className="mt-3 font-bold">{title}</div>
      {description && <p className="text-sm text-mute mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
      {code && <div className="mt-3 text-xs text-mute">{code}</div>}
    </div>
  );
}
