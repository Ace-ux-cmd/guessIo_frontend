import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import Sheet from '../../components/ui/Sheet';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { Banner } from '../../components/ui/Feedback';
import ErrorScreen, { ErrorAction } from '../../components/ui/ErrorScreen';
import { useAuthStore } from '../../stores/authStore';
import { submitAppeal, getAppealContext } from '../../api/appeals.api';
import { getErrorMessage } from '../../api/client';
import { captureAppealToken, clearAppealToken } from '../../lib/appealToken';
import { SUPPORT_EMAIL, buildAppealGmailUrl } from '../../constants/legalLinks';

const APPEAL_MAX_LENGTH = 1000;

/**
 * Shared screen for suspended / banned accounts: same layout, different copy,
 * and a banned account can't appeal (the decision is final).
 *
 * Reachable two ways, and both can appeal in the app:
 *  1. Mid-session: an admin suspends/bans an authenticated user; api/client.js
 *     redirects here without clearing the access token, so the screen can
 *     still authenticate as this account (GET /me/appeals/context and
 *     POST /me/appeals).
 *  2. At Google login: the backend redirects here when exchangeGoogleCode
 *     rejects a non-ACTIVE account. No session exists, but the redirect
 *     carries a short-lived appeal token in the URL fragment (#appeal=...),
 *     which does the same job (see lib/appealToken.js).
 * Only if neither credential is available (a direct visit, or the appeal
 * token expired) does the appeal fall back to an email template.
 *
 * The screen also shows the reason the admin recorded for the suspension/ban,
 * and the appeal form's email is the account's own, read-only.
 */
function AccountLockedScreen({ variant }) {
  const navigate = useNavigate();
  const clearSessionOnLeave = useAuthStore((s) => s.clearSession);
  const hasSessionToken = useAuthStore((s) => Boolean(s.accessToken));
  // Present only when a Google sign-in was refused for this account.
  const [appealToken] = useState(captureAppealToken);
  // Kept by not calling clearSession() until the user leaves; the account's
  // email normally comes from the server below, this is just a fallback.
  const cachedEmail = useAuthStore((s) => s.user?.email);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showEmptyError, setShowEmptyError] = useState(false);
  // True once an appeal exists, whether just sent or already waiting from earlier.
  const [appealSent, setAppealSent] = useState(false);
  const setAppealPending = setAppealSent;
  const isBanned = variant === 'banned';

  // The account's email, the admin's reason and any appeal already waiting.
  const context = useQuery({
    queryKey: ['appeal-context', appealToken ? 'appeal-token' : 'session'],
    queryFn: () => getAppealContext({ token: appealToken }),
    enabled: hasSessionToken || Boolean(appealToken),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const contextStatus = context.error?.response?.status;
  const contextCode = context.error?.response?.data?.error?.code;
  // The suspension was lifted while this screen was open.
  const restored = contextCode === 'NOT_APPEALABLE';
  // 401: the appeal token (or session) is no longer valid, so only email is left.
  const hasToken = (hasSessionToken || Boolean(appealToken)) && contextStatus !== 401;
  const appealPending = appealSent || Boolean(context.data?.appealPending);
  const reason = context.data?.reason || null;
  const accountEmail = context.data?.email || cachedEmail || '';

  const appeal = useMutation({
    mutationFn: () => submitAppeal({ message: message.trim(), token: appealToken }),
    onSuccess: () => { setSubmitted(true); setAppealPending(true); },
    onError: (error) => {
      if (error.response?.data?.error?.code === 'APPEAL_ALREADY_PENDING') {
        setAppealPending(true);
        setModalOpen(false);
      }
    },
  });

  function openModal() { setMessage(''); setSubmitted(false); setShowEmptyError(false); appeal.reset(); setModalOpen(true); }
  function closeModal() { setModalOpen(false); }

  function handleSubmit(e) {
    e.preventDefault();
    if (message.trim().length === 0) { setShowEmptyError(true); return; }
    appeal.mutate();
  }

  function goHome() {
    // Only now drop the credentials that were kept alive purely for the appeal form.
    if (hasSessionToken) clearSessionOnLeave();
    clearAppealToken();
    navigate('/login', { replace: true });
  }

  if (restored) {
    return (
      <ErrorScreen
        tone="info"
        icon="check"
        title="Account restored"
        body="Your account is active again. Log in to keep playing."
        actions={<ErrorAction onClick={goHome}>Log in</ErrorAction>}
      />
    );
  }

  const title = isBanned ? 'Account banned' : 'Account suspended';
  return (
    <>
      <main className="app" style={{ display: 'flex', flexDirection: 'column' }}>
        <header className="topbar">
          <p className="eyebrow account-suspended-variant">Account status</p>
        </header>
        <div className="content account-suspended-variant">
          <section className="status-card" aria-labelledby="locked-title">
            <div className="status-icon" aria-hidden="true">!</div>
            <h1 className="account-suspended-variant" id="locked-title">{title}</h1>
            <p className="summary">
              {isBanned
                ? "Your account was permanently banned for breaking the guessIo rules. You can't play or sign in."
                : "Your account was suspended for breaking the guessIo rules. You can't play or sign in to matches until it is reviewed."}
            </p>

            {reason && (
              <div className="reason">
                <span className="reason-label">{isBanned ? 'Reason for ban' : 'Reason for suspension'}</span>
                <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: 'var(--white)' }}>{reason}</p>
              </div>
            )}

            <div className="details">
              <div className="detail">
                <span>Review status</span>
                <strong>{isBanned ? 'Final decision' : (appealPending ? 'Appeal under review' : 'No appeal sent')}</strong>
              </div>
            </div>
            {!isBanned && (
              <p className="helper" role="status">
                {appealPending
                  ? 'We will email you with the outcome.'
                  : 'If you think this was a mistake, send us an appeal and we will take another look.'}
              </p>
            )}

            <div className="actions account-suspended-variant">
              {!isBanned && (appealPending
                ? <button type="button" className="button account-suspended-variant secondary" disabled>Appeal submitted</button>
                : <button type="button" className="button account-suspended-variant primary" onClick={openModal}>Submit an appeal</button>)}
              <button type="button" className={`button account-suspended-variant ${isBanned ? 'primary' : 'secondary'}`} onClick={goHome}>Log out</button>
            </div>
          </section>
        </div>
      </main>

      {!isBanned && (
        <Sheet accent="r" open={modalOpen} onClose={closeModal} labelledBy="appeal-title">
          {submitted ? (
            <div className="flex flex-col items-center text-center py-4" role="status">
              <div className="grid h-14 w-14 place-items-center rounded-full border border-g bg-s1 text-g"><Icon name="check" className="h-7 w-7" /></div>
              <h2 id="appeal-title" className="mt-4 font-display text-2xl font-bold">Appeal sent</h2>
              <p className="mt-2 text-sm text-mute max-w-[30ch]">We will review it and email you with the outcome.</p>
              <div className="mt-6 w-full"><Button variant="outline" onClick={closeModal}>Close</Button></div>
            </div>
          ) : !hasToken ? (
            <>
              <h2 id="appeal-title" className="font-display text-2xl font-bold">Submit an appeal</h2>
              <p className="mt-2 text-sm text-mute">We can&apos;t verify which account this is from here, so appeals for this case are handled by email. Please include:</p>
              <ul className="mt-3 space-y-1 text-sm list-disc pl-5">
                <li>Your guessIo username</li>
                <li>The email address on your account</li>
                <li>The product name (guessIo)</li>
              </ul>
              <div className="mt-5">
                <a href={buildAppealGmailUrl({ variant })} target="_blank" rel="noopener noreferrer" className="btn w-full">Open email</a>
              </div>
              <p className="mt-3 text-center text-xs text-mute">Opens Gmail addressed to {SUPPORT_EMAIL}. No Gmail? Email us directly.</p>
            </>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h2 id="appeal-title" className="pr-10 font-display text-2xl font-bold">Appeal your suspension</h2>
              <p className="mt-2 text-sm text-mute">Your email is locked to this account. We will reply to it with the outcome.</p>
              {appeal.isError && <div className="mt-3"><Banner variant="error">{getErrorMessage(appeal.error, 'Could not submit your appeal. Please try again.')}</Banner></div>}
              <label htmlFor="appeal-email" className="block mt-5 text-sm text-mute">Email</label>
              <div className="relative mt-1">
                <input id="appeal-email" type="email" value={accountEmail} readOnly aria-readonly="true" className="min-h-[48px] w-full cursor-not-allowed rounded-lg border border-edge bg-s2 pl-3 pr-10 text-mute" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-mute"><Icon name="lock" className="w-4 h-4" /></span>
              </div>
              <label htmlFor="appeal-message" className="block mt-4 text-sm text-mute">Why do you think this is wrong?</label>
              <textarea
                id="appeal-message"
                rows={5}
                maxLength={APPEAL_MAX_LENGTH}
                required
                placeholder="Tell us why this decision should be reviewed"
                value={message}
                aria-describedby="appeal-hint"
                onChange={(e) => { setMessage(e.target.value); if (e.target.value.trim()) setShowEmptyError(false); }}
                className={`mt-1 w-full resize-none rounded-lg border bg-s2 px-3 py-3 ${showEmptyError ? 'shake border-bad' : 'border-edge'}`}
              />
              <div className="mt-1 flex justify-between text-xs">
                <span id="appeal-hint" className={showEmptyError ? 'text-bad' : 'text-mute'}>{showEmptyError ? 'Tell us why to send your appeal' : 'Required'}</span>
                <span className="text-mute tnum">{message.length} / {APPEAL_MAX_LENGTH}</span>
              </div>
              <div className="mt-5 space-y-2.5">
                <Button type="submit" disabled={appeal.isPending}>{appeal.isPending ? 'Sending…' : 'Send appeal'}</Button>
                <Button variant="outline" onClick={closeModal}>Cancel</Button>
              </div>
            </form>
          )}
        </Sheet>
      )}
    </>
  );
}

export function Suspended() { return <AccountLockedScreen variant="suspended" />; }
export function Banned() { return <AccountLockedScreen variant="banned" />; }
