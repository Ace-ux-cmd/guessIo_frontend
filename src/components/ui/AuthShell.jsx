import Wordmark from './Wordmark';
import Icon from './Icon';

/**
 * Shared chrome for every auth screen (Login, Onboarding, Google callback).
 * Mobile: single column (brand, headline, stage, actions) exactly as 02-auth.html.
 * Desktop (>=768px): brand + stage on the left, actions on the right (see app.css .auth-main).
 *
 * `stage` is the animated/visual block; `children` are the actions.
 * `onExit`, when given, adds a close button in the top-right corner.
 */
export default function AuthShell({ title, sub, stage, children, onExit }) {
  return (
    <main className="auth-main relative mx-auto w-full max-w-[430px] min-h-screen flex flex-col pb-6">
      {onExit && (
        <button type="button" onClick={onExit} className="absolute right-4 top-4 p-2 text-mute" aria-label="Exit sign-up">
          <Icon name="close" />
        </button>
      )}
      <section className="auth-intro px-6 pt-14">
        <div><Wordmark className="text-4xl" /></div>
        <h1 className="mt-6 text-[34px] leading-[1.05] font-bold">{title}</h1>
        {sub && <p className="mt-3 text-mute max-w-[30ch]">{sub}</p>}
        {stage && <div className="mt-9">{stage}</div>}
      </section>
      <section className="auth-actions flex-1 flex flex-col px-6">
        <div className="mt-auto pt-10 space-y-3">{children}</div>
      </section>
    </main>
  );
}
