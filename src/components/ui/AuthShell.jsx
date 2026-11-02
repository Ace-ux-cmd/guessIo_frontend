import Wordmark from "./Wordmark";
import Icon from "./Icon";

/**
 * Chrome shared by every auth screen (Login, Onboarding, Google callback):
 * logo, headline, optional stage, then the actions at the bottom.
 * `onExit`, when given, adds a close button in the top-right corner.
 */
export default function AuthShell({ title, sub, stage, children, onExit }) {
  return (
    <main className="auth-main relative mx-auto flex min-h-screen w-full flex-col pb-6">
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          className="absolute right-3 top-3 p-2 text-mute"
          aria-label="Exit sign-up"
        >
          <Icon name="close" />
        </button>
      )}
      <section className="auth-intro px-5 pt-6">
        <Wordmark className="h-10" glitch />
        <h1 className="auth-title font-display mt-3 font-bold leading-[1.06]">
          {title}
        </h1>
        {sub && <p className="mt-1.5 max-w-[34ch] text-sm text-mute">{sub}</p>}
        {stage && <div className="mt-4">{stage}</div>}
      </section>
      <section className="auth-actions flex flex-1 flex-col px-5">
        <div className="mt-auto space-y-3 pt-4">{children}</div>
      </section>
    </main>
  );
}
