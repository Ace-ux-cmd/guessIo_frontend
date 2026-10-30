import { useState } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import AuthShell from '../../components/ui/AuthShell';
import { Banner } from '../../components/ui/Feedback';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Icon from '../../components/ui/Icon';
import { useCompleteOnboarding } from '../../hooks/useAuth';
import { useUsernameAvailability, normalizeUsername } from '../../hooks/useUsernameAvailability';
import { getErrorMessage } from '../../api/client';

/**
 * Shown once, right after a brand-new Google sign-in (see
 * GoogleCallback.jsx), before any account exists in the database. Lets the
 * player pick a username. It is mandatory, must be unique and can't be
 * changed later (it is what friends will search for). The call sign shown
 * in bold starts as their Google name and is edited from the profile.
 *
 * onboardingToken arrives via route state from GoogleCallback, not from the
 * URL or any persisted store - it's short-lived and single-use. A direct
 * visit to /onboarding without that state (e.g. a refresh) has no token to
 * complete with, so it sends the player back to sign in again.
 *
 * Nothing is saved until this step completes, so the exit action discards
 * the pending sign-in and returns to /login; there is no partial progress to
 * keep.
 */
const FIELD_BORDER = {
  available: 'border-g',
  taken: 'border-bad',
};

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { onboardingToken, suggestedUsername } = location.state || {};
  const completeOnboarding = useCompleteOnboarding();
  const [username, setUsername] = useState('');
  const [exitOpen, setExitOpen] = useState(false);
  const availability = useUsernameAvailability({ username, onboardingToken });

  if (!onboardingToken) {
    return <Navigate to="/login" replace />;
  }

  // Rewriting the DOM value ourselves keeps the caret in place when a
  // character is lowercased or a space is dropped mid-string; letting React
  // do it would throw the caret to the end.
  function handleUsernameChange(e) {
    const input = e.target;
    const next = normalizeUsername(input.value);
    if (next !== input.value) {
      const caret = normalizeUsername(input.value.slice(0, input.selectionStart)).length;
      input.value = next;
      input.setSelectionRange(caret, caret);
    }
    setUsername(next);
  }

  const canSubmit = availability.status === 'available' || availability.status === 'error';

  function submit(e) {
    e.preventDefault();
    if (!canSubmit || completeOnboarding.isPending) return;
    const chosen = normalizeUsername(username);
    completeOnboarding.mutate(
      { onboardingToken, username: chosen },
      {
        onSuccess: () => navigate('/dashboard', { replace: true }),
        onError: (err) => {
          // Lost a race for the name: show it inline like any other taken name.
          if (err?.response?.data?.error?.code === 'USERNAME_TAKEN') {
            availability.markTaken(chosen);
            completeOnboarding.reset();
          }
        },
      }
    );
  }

  const failure = completeOnboarding.error;
  const message = completeOnboarding.isError
    ? getErrorMessage(failure, 'Could not complete sign-up.')
    : null;
  // The onboarding token is short-lived and single-use. Once it has lapsed,
  // retrying the form can never succeed, so the player needs a way back to
  // Google sign-in rather than a dead-end message.
  const tokenExpired = availability.status === 'expired' || (completeOnboarding.isError
    && (failure?.response?.status === 401 || /expir/i.test(message)));

  return (
    <AuthShell
      title={<>Choose a<br />username.</>}
      sub="Your username is unique and can't be changed later. One last step before you play."
      onExit={() => setExitOpen(true)}
    >
      {tokenExpired ? (
        <Banner variant="error">
          Your sign-in has expired. Please{' '}
          <Link to="/login" replace className="italic underline">sign in</Link>
          {' '}again.
        </Banner>
      ) : message && <Banner variant="error">{message}</Banner>}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="username" className="mb-1.5 block text-sm font-bold">Username</label>
          <input
            id="username"
            value={username}
            onChange={handleUsernameChange}
            placeholder={suggestedUsername ? `e.g. ${suggestedUsername}` : 'Choose a username'}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            minLength={3}
            maxLength={30}
            aria-invalid={availability.status === 'taken'}
            aria-describedby="username-status"
            className={`w-full min-h-[48px] rounded-lg border bg-s2 px-3 text-white placeholder:text-mute ${FIELD_BORDER[availability.status] || 'border-edge'}`}
          />
        </div>
        <UsernameStatus status={availability.status} />
        <Button type="submit" disabled={completeOnboarding.isPending || !canSubmit}>
          {completeOnboarding.isPending ? 'Saving…' : 'Continue'}
        </Button>
      </form>

      <ConfirmDialog
        open={exitOpen}
        tone="danger"
        title="Cancel sign-up?"
        body="Are you sure you want to cancel? Your setup progress will be lost."
        cancelLabel="Keep going"
        confirmLabel="Cancel sign-up"
        busy={completeOnboarding.isPending}
        onCancel={() => setExitOpen(false)}
        onConfirm={() => navigate('/login', { replace: true })}
      />
    </AuthShell>
  );
}

/**
 * Always rendered so screen readers announce changes (aria-live); the hint
 * about allowed characters stays visible until there is something to report.
 */
function UsernameStatus({ status }) {
  let content;
  if (status === 'available') {
    content = <span className="flex items-center gap-2 text-g"><Icon name="check" className="w-4 h-4" />Username available.</span>;
  } else if (status === 'taken') {
    content = <span className="flex items-center gap-2 text-bad"><Icon name="alert" className="w-4 h-4" />This username is already taken.</span>;
  } else if (status === 'checking') {
    content = <span className="text-mute">Checking availability…</span>;
  } else if (status === 'error') {
    content = <span className="text-mute">Couldn&apos;t check availability right now. We&apos;ll confirm when you continue.</span>;
  } else {
    content = <span className="text-mute">3 to 30 lowercase letters, numbers or underscores.</span>;
  }
  return <p id="username-status" aria-live="polite" className="text-xs">{content}</p>;
}
