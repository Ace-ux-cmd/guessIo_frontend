import Icon from './Icon';

const BANNER = {
  info: 'a-c text-info',
  error: 'a-r text-bad',
  warn: 'a-o text-warn',
  success: 'a-g text-g',
};
const BANNER_ICON = { info: 'help', error: 'alert', warn: 'alert', success: 'check' };

export function Banner({ variant = 'info', children }) {
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={`card flat flex items-center gap-2 p-3 text-sm font-bold ${BANNER[variant] || BANNER.info}`}>
      <Icon name={BANNER_ICON[variant] || 'help'} className="h-4 w-4" />
      <span className="text-white">{children}</span>
    </div>
  );
}

const PULSE = 'animate-pulse rounded-lg bg-s1/70';

/**
 * Placeholder for a whole screen. Kept small and quiet: a title bar, one
 * summary block and a few short rows, so a page that loads quickly does not
 * flash a screenful of large blocks. Screens that need several requests show
 * this until every one has answered, then render everything at once.
 */
export function PageSkeleton({ cards = 3, label = 'Loading' }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pb-24 pt-6" role="status" aria-busy="true" aria-label={label}>
      <div className={`h-6 w-32 ${PULSE}`} />
      <div className={`mt-4 h-14 ${PULSE}`} />
      {Array.from({ length: Math.min(cards, 3) }, (_, i) => <div key={i} className={`mt-3 h-10 ${PULSE}`} />)}
      <span className="sr-only">{label}</span>
    </main>
  );
}

/** Smaller inline placeholder, for a section inside a screen. */
export function LoadingScreen({ label = 'Loading' }) {
  return (
    <div className="mt-4 space-y-2" role="status" aria-busy="true" aria-label={label}>
      <div className={`h-10 ${PULSE}`} />
      <div className={`h-10 ${PULSE}`} />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="card flat p-6 text-center" style={{ borderStyle: 'dashed' }}>
      <div className="font-display text-xl font-bold">{title}</div>
      {description && <p className="mt-1 text-sm text-mute">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description, action, code }) {
  return (
    <div className="card a-r p-5 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-bad/25 text-bad">
        <Icon name="alert" />
      </div>
      <div className="font-display mt-3 text-xl font-bold">{title}</div>
      {description && <p className="mt-1 text-sm text-mute">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
      {code && <div className="mt-3 text-xs text-mute">{code}</div>}
    </div>
  );
}
