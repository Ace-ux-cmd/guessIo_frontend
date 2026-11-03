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

  const card = 'card flex items-center gap-3 p-3';
  const iconBox = 'grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-s2 text-g';
  return (
    <>
      <main className={`mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pt-6 ${isAuthenticated ? 'pb-24' : 'pb-8'}`}>
        <header className="flex items-center gap-3">
          <Link to={back} replace aria-label="Back" className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-xl border border-line bg-s1 text-info"><Icon name="back" /></Link>
          <h1 className="font-display text-xl font-bold">Help and feedback</h1>
        </header>

        <h2 className="mt-4 font-display text-base font-bold">We&apos;ve got you covered</h2>
        <p className="mt-1 text-xs text-mute">Get help, share feedback, report a problem, or hang out with the guessIo community.</p>

        <section className="mt-3 space-y-2" aria-label="Support options">
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className={`${card} a-c`}>
            <span className={iconBox}><Icon name="users" /></span>
            <span className="flex-1">
              <b className="block font-display text-sm">Join us on Discord</b>
              <span className="block text-xs text-mute">Chat with players, ask questions, keep up with guessIo.</span>
            </span>
            <Icon name="chev" className="h-4 w-4 text-mute" />
          </a>

          <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className={`${card} a-g`}>
            <span className={iconBox}><Icon name="chat" /></span>
            <span className="flex-1">
              <b className="block font-display text-sm">Join our WhatsApp channel</b>
              <span className="block text-xs text-mute">Get announcements and updates about guessIo.</span>
            </span>
            <Icon name="chev" className="h-4 w-4 text-mute" />
          </a>

          {GOOGLE_FORM_URL ? (
            <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer" className={`${card} a-p`}>
              <span className={iconBox}><Icon name="check" /></span>
              <span className="flex-1">
                <b className="block font-display text-sm">Share your feedback</b>
                <span className="block text-xs text-mute">A short form for feedback, bugs and support requests.</span>
              </span>
              <Icon name="chev" className="h-4 w-4 text-mute" />
            </a>
          ) : (
            <div className={`${card} flat opacity-70`} style={{ borderStyle: 'dashed' }} aria-disabled="true">
              <span className={iconBox}><Icon name="check" /></span>
              <span className="flex-1">
                <b className="block font-display text-sm">Share your feedback</b>
                <span className="block text-xs text-mute">Survey closed</span>
              </span>
            </div>
          )}
        </section>

        <p className="mt-3 text-xs text-mute">For the fastest community help, Discord is usually the best place to start.</p>
        <p className="mt-2 text-xs text-mute">Prefer email? <a className="font-bold text-g underline" href={`mailto:${SUPPORT_EMAIL}`}>Contact me</a></p>
      </main>
      {isAuthenticated && <BottomNav active="/profile" />}
    </>
  );
}