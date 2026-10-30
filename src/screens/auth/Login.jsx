import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import AuthShell from '../../components/ui/AuthShell';
import LoginDemoBoard from '../../components/ui/LoginDemoBoard';
import { Banner } from '../../components/ui/Feedback';
import { useAuthStore } from '../../stores/authStore';
import { getGoogleLoginUrl } from '../../api/auth.api';
import { TERMS_URL, PRIVACY_URL, DOWNLOAD_URL } from '../../constants/legalLinks';

/**
 * The single unified authentication screen. Google OAuth is the only
 * sign-in method: there is no email/password form and no distinction
 * between a new and returning user, since exchangeGoogleCode /
 * completeOnboarding on the backend handle that branch invisibly
 * (GoogleCallback.jsx routes a brand-new Google identity to /onboarding).
 *
 * The Terms/Privacy consent checkbox gates the Google button only -
 * guests are exempt (unchanged behaviour from the previous version).
 */
export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [agreed, setAgreed] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const consumeSessionMessage = useAuthStore((s) => s.consumeSessionMessage);

  // Shown once, e.g. after being logged out because the account signed in
  // elsewhere (single-session enforcement) - consumed so it doesn't persist.
  const [shownMessage] = useState(() => consumeSessionMessage());

  const googleFailed = searchParams.get('google') === 'failed';
  const googleRateLimited = searchParams.get('google') === 'rate_limited';
  const fromGuest = searchParams.get('from') === 'guest';

  function startGoogle() {
    if (!agreed) return;
    setConnecting(true);
    window.location.assign(getGoogleLoginUrl());
  }

  return (
    <AuthShell
      title={fromGuest ? <>Save your progress<br />and play online.</> : <>Analyse → Outsmart<br />→ Crack The Code</>}
      sub={fromGuest
        ? 'Rating, leaderboard, ranked matches, custom rooms and friends need an account.'
        : 'A guessing duel for 2 to 4 players. Ranked, casual or with friends.'}
      stage={<LoginDemoBoard />}
    >
      {(shownMessage || googleFailed || googleRateLimited) && (
        <div className="space-y-2">
          {shownMessage && <Banner variant="info">{shownMessage}</Banner>}
          {googleFailed && <Banner variant="error">Google sign-in could not be completed. Please try again.</Banner>}
          {googleRateLimited && <Banner variant="error">Too many sign-in attempts. Please wait a few minutes and try again.</Banner>}
        </div>
      )}

      <label htmlFor="agreeCheck" className="flex cursor-pointer items-start gap-3 text-xs leading-snug text-mute">
        <input
          type="checkbox"
          id="agreeCheck"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#8DFF39]"
        />
        <span>
          I agree to the{' '}
          <a className="underline" href={TERMS_URL} target="_blank" rel="noopener noreferrer">Terms</a>
          {' '}and{' '}
          <a className="underline" href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </span>
      </label>

      <Button variant="google" disabled={!agreed || connecting} onClick={startGoogle}>
        <span className="inline-flex">
          {connecting ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="#1F1F1F" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
              <path d="M12 3a9 9 0 1 0 9 9" opacity=".9" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.7 6.9l7.3 5.7c4.3-4 6.8-9.9 6.8-17.1z" />
              <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.6 2.2-8.6 2.2-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
            </svg>
          )}
        </span>
        <span>{connecting ? 'Connecting to Google' : 'Continue with Google'}</span>
      </Button>

      <Button variant="outline" onClick={() => navigate('/guest-home', { replace: true })}>
        Play as guest
      </Button>

      <p className="pt-1 text-center text-xs text-mute">New or returning, one tap. No password to remember.</p>
      <p className="text-center text-xs text-mute">
        Prefer your phone?{' '}
        <a className="underline" href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">Download the mobile app</a>
      </p>
    </AuthShell>
  );
}
