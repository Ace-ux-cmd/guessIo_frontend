import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import Sheet from '../../components/ui/Sheet';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { Banner } from '../../components/ui/Feedback';
import ErrorScreen from '../../components/ui/ErrorScreen';
import { useAuthStore } from '../../stores/authStore';
import { submitAppeal } from '../../api/appeals.api';
import { getErrorMessage } from '../../api/client';
import { SUPPORT_EMAIL, buildAppealGmailUrl } from '../../constants/legalLinks';

const APPEAL_MAX_LENGTH = 1000;

/**
 * Shared screen for suspended / banned accounts: same layout, different copy,
 * and a banned account can't appeal (the decision is final).
 *
 * Reachable two ways:
 *  1. Mid-session: an admin suspends/bans an authenticated user; api/client.js
 *     redirects here without clearing the access token, so the appeal form can
 *     still authenticate as this account via POST /me/appeals.
 *  2. At Google login: the backend redirects here when exchangeGoogleCode
 *     rejects a non-ACTIVE account. No session ever existed, so there is no
 *     token to appeal with - the appeal falls back to an email template.
 */
function AccountLockedScreen({ variant }) {
  const navigate = useNavigate();
  const clearSessionOnLeave = useAuthStore((s) => s.clearSession);
  const hasToken = useAuthStore((s) => Boolean(s.accessToken));
  // Kept by not calling clearSession() until the user leaves, so the locked
  // email field can show the real address.
  const cachedEmail = useAuthStore((s) => s.user?.email);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showEmptyError, setShowEmptyError] = useState(false);
  // True once an appeal exists, whether just sent or already waiting from earlier.
  const [appealPending, setAppealPending] = useState(false);
  const isBanned = variant === 'banned';

  const appeal = useMutation({
    mutationFn: () => submitAppeal({ message: message.trim() }),
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
    // Only now drop the access token that was kept alive purely for the appeal form.
    if (hasToken) clearSessionOnLeave();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <ErrorScreen
        tone="danger"
        icon={isBanned ? 'lock' : 'alert'}
        title={isBanned ? 'Account banned' : 'Account suspended'}
        body={isBanned
          ? "Your account was permanently banned for breaking the guessIo rules. You can't play or sign in."
          : "Your account was suspended for breaking the guessIo rules. You can't play or sign in to matches until it is reviewed."}
        detail={isBanned ? 'This decision is final.' : (appealPending
          ? 'Your appeal is under review. We will email you with the outcome.'
          : 'If you think this was a mistake, send us an appeal and we will take another look.')}
        actions={isBanned ? (
          <Button onClick={goHome}>Log out</Button>
        ) : (
          <>
            {appealPending
              ? <Button variant="outline" disabled>Appeal submitted</Button>
              : <Button onClick={openModal}>Submit appeal</Button>}
            <Button variant="outline" onClick={goHome}>Log out</Button>
          </>
        )}
      />

      {!isBanned && (
        <Sheet open={modalOpen} onClose={closeModal} labelledBy="appeal-title">
          {submitted ? (
            <div className="flex flex-col items-center text-center py-4" role="status">
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-s2 text-g"><Icon name="check" className="w-7 h-7" /></div>
              <h2 id="appeal-title" className="mt-4 text-xl font-bold">Appeal sent</h2>
              <p className="mt-2 text-sm text-mute max-w-[30ch]">We will review it and email you with the outcome.</p>
              <div className="mt-6 w-full"><Button variant="outline" onClick={closeModal}>Close</Button></div>
            </div>
          ) : !hasToken ? (
            <>
              <h2 id="appeal-title" className="text-xl font-bold">Submit an appeal</h2>
              <p className="mt-2 text-sm text-mute">We can&apos;t verify which account this is from here, so appeals for this case are handled by email. Please include:</p>
              <ul className="mt-3 space-y-1 text-sm list-disc pl-5">
                <li>Your guessIo username</li>
                <li>The email address on your account</li>
                <li>The product name (guessIo)</li>
              </ul>
              <div className="mt-5">
                <a href={buildAppealGmailUrl({ variant })} target="_blank" rel="noopener noreferrer" className="cut flex items-center justify-center h-12 px-5 text-base font-bold bg-g text-bg">Open email</a>
              </div>
              <p className="mt-3 text-center text-xs text-mute">Opens Gmail addressed to {SUPPORT_EMAIL}. No Gmail? Email us directly.</p>
            </>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h2 id="appeal-title" className="text-xl font-bold pr-10">Appeal your suspension</h2>
              <p className="mt-2 text-sm text-mute">Tell us why the suspension should be lifted. We will reply to the email below.</p>
              {appeal.isError && <div className="mt-3"><Banner variant="error">{getErrorMessage(appeal.error, 'Could not submit your appeal. Please try again.')}</Banner></div>}
              <label htmlFor="appeal-email" className="block mt-5 text-sm text-mute">Email</label>
              <div className="relative mt-1">
                <input id="appeal-email" type="email" value={cachedEmail || ''} readOnly aria-readonly="true" className="w-full h-12 rounded-md bg-s2 border border-line pl-3 pr-10 text-mute cursor-not-allowed outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-mute"><Icon name="lock" className="w-4 h-4" /></span>
              </div>
              <label htmlFor="appeal-message" className="block mt-4 text-sm text-mute">Message</label>
              <textarea
                id="appeal-message"
                rows={5}
                maxLength={APPEAL_MAX_LENGTH}
                required
                placeholder="Explain what happened"
                value={message}
                aria-describedby="appeal-hint"
                onChange={(e) => { setMessage(e.target.value); if (e.target.value.trim()) setShowEmptyError(false); }}
                className={`mt-1 w-full rounded-md bg-s2 border px-3 py-3 outline-none focus:border-g resize-none ${showEmptyError ? 'border-bad shake' : 'border-line'}`}
              />
              <div className="mt-1 flex justify-between text-xs">
                <span id="appeal-hint" className={showEmptyError ? 'text-bad' : 'text-mute'}>{showEmptyError ? 'Write a message to send your appeal' : 'Required'}</span>
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
