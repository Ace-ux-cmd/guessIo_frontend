import Wordmark from './Wordmark';
import Icon from './Icon';

/**
 * Chrome shared by every auth screen (Login, Onboarding, Google callback):
 * logo, headline, optional stage, then the actions at the bottom.
 * `onExit`, when given, adds a close button in the top-right corner.
 */
export default function AuthShell({ title, sub, stage, children, onExit }) {
  return (
    <main className="auth-main relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col pb-6">
      {onExit && (
        <button type="button" onClick={onExit} className="absolute right-3 top-3 p-2 text-mute" aria-label="Exit sign-up">
          <Icon name="close" />
        </button>
      )}
      <section className="auth-intro px-6 pt-8">
        <Wordmark className="h-10" glitch />
        <h1 className="font-display mt-4 text-[32px] font-bold leading-[1.04]">{title}</h1>
        {sub && <p className="mt-2 max-w-[32ch] text-base text-mute">{sub}</p>}
        {stage && <div className="mt-5">{stage}</div>}
      </section>
      <section className="auth-actions flex flex-1 flex-col px-6">
        <div className="mt-auto space-y-3 pt-5">{children}</div>
      </section>
    </main>
  );
}
