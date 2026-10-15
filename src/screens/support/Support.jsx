import { Link, useLocation } from 'react-router-dom';
import BottomNav from '../../components/ui/BottomNav';
import Icon from '../../components/ui/Icon';
import { useAuthStore } from '../../stores/authStore';
import { SUPPORT_EMAIL } from '../../constants/legalLinks';

const DISCORD_URL = 'https://discord.gg/JwQvJZnJE';
const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbDJsmNGOj9vQqxu163G';
// Set VITE_SUPPORT_GOOGLE_FORM_URL to the Google Form you want to use.
const GOOGLE_FORM_URL = import.meta.env.VITE_SUPPORT_GOOGLE_FORM_URL || '';

// Screens that link here and want "back" to return to them rather than Settings.
const RETURN_TARGETS = new Set(['/profile', '/settings']);

/**
 * Help and feedback: Discord, the WhatsApp announcements channel, the feedback
 * form, and email. Open to guests too.
 */
export default function Support() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const from = useLocation().state?.from;
  const back = isAuthenticated ? (RETURN_TARGETS.has(from) ? from : '/settings') : '/guest-home';

  return (
    <>
      <main className={`mx-auto w-full max-w-[430px] min-h-screen flex flex-col ${isAuthenticated ? 'pb-24' : 'pb-8'}`}>
        <header className="flex items-center gap-1 px-4 pt-5 pb-3">
          <Link to={back} replace className="p-2 text-mute" aria-label="Back"><Icon name="back" /></Link>
          <h1 className="text-xl font-bold flex-1">Help and feedback</h1>
        </header>

        <section className="px-5 mt-1">
          <h2 className="text-2xl font-bold leading-tight">We&apos;ve got you covered</h2>
          <p className="mt-2 text-mute">Get help, share feedback, report a problem, or hang out with the guessIo community.</p>
        </section>

        <section className="px-5 mt-7 space-y-2.5" aria-label="Support options">
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-xl border border-line bg-s1 p-4">
            <span className="w-11 h-11 rounded-lg bg-s2 text-g flex items-center justify-center"><Icon name="users" /></span>
            <span className="flex-1">
              <span className="block font-bold">Join us on Discord</span>
              <span className="block text-sm text-mute">Chat with players, ask questions, keep up with guessIo.</span>
            </span>
            <Icon name="chev" className="w-4 h-4 text-mute" />
          </a>

          <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-xl border border-line bg-s1 p-4">
            <span className="w-11 h-11 rounded-lg bg-s2 text-g flex items-center justify-center"><Icon name="chat" /></span>
            <span className="flex-1">
              <span className="block font-bold">Join our WhatsApp channel</span>
              <span className="block text-sm text-mute">Get announcements and updates about guessIo.</span>
            </span>
            <Icon name="chev" className="w-4 h-4 text-mute" />
          </a>

          {GOOGLE_FORM_URL ? (
            <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-xl border border-line bg-s1 p-4">
              <span className="w-11 h-11 rounded-lg bg-s2 text-g flex items-center justify-center"><Icon name="check" /></span>
              <span className="flex-1">
                <span className="block font-bold">Share your feedback</span>
                <span className="block text-sm text-mute">A short form for feedback, bugs and support requests.</span>
              </span>
              <Icon name="chev" className="w-4 h-4 text-mute" />
            </a>
          ) : (
            <div className="flex items-center gap-4 rounded-xl border border-dashed border-line p-4 opacity-70" aria-disabled="true">
              <span className="w-11 h-11 rounded-lg bg-s2 text-mute flex items-center justify-center"><Icon name="check" /></span>
              <span className="flex-1">
                <span className="block font-bold">Share your feedback</span>
                <span className="block text-sm text-mute">Survey closed</span>
              </span>
            </div>
          )}
        </section>

        <p className="px-5 mt-6 text-sm text-mute">For the fastest community help, Discord is usually the best place to start.</p>
        <p className="px-5 mt-3 text-sm text-mute">Prefer email? <a className="text-g font-semibold" href={`mailto:${SUPPORT_EMAIL}`}>Contact me</a></p>
      </main>
      {isAuthenticated && <BottomNav active="/profile" />}
    </>
  );
}
