import { useCallback, useEffect, useState } from 'react';
import { checkUsernameAvailability } from '../api/auth.api';

const DEBOUNCE_MS = 400;
const VALID_USERNAME = /^[a-z0-9_]{3,30}$/;

/** Usernames are lowercase with no whitespace, enforced as the player types. */
export function normalizeUsername(raw) {
  return raw.toLowerCase().replace(/\s+/g, '');
}

/**
 * Live availability check for the onboarding username field.
 *
 * status is one of:
 *   idle      nothing typed yet
 *   invalid   fails the local format rule, so no request is made
 *   checking  valid format, waiting on the debounce or the response
 *   available | taken
 *   expired   the onboarding token lapsed; the player must sign in again
 *   error     the check itself failed; the server re-checks on submit anyway
 *
 * The result is stored with the username it was computed for, so a response
 * that arrives after the player kept typing is never shown for the wrong text.
 */
export function useUsernameAvailability({ username, onboardingToken }) {
  const candidate = normalizeUsername(username);
  const [result, setResult] = useState({ username: null, status: 'idle' });

  const formatValid = VALID_USERNAME.test(candidate);

  useEffect(() => {
    if (!formatValid) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { available } = await checkUsernameAvailability({ onboardingToken, username: candidate }, { signal: controller.signal });
        setResult({ username: candidate, status: available ? 'available' : 'taken' });
      } catch (err) {
        if (controller.signal.aborted) return;
        setResult({ username: candidate, status: err?.response?.status === 401 ? 'expired' : 'error' });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [candidate, formatValid, onboardingToken]);

  // Lets the submit handler record a "taken" answer the server gave after the
  // fact, e.g. someone claimed the name between the check and the submit.
  const markTaken = useCallback((takenUsername) => {
    setResult({ username: takenUsername, status: 'taken' });
  }, []);

  let status;
  if (!candidate) status = 'idle';
  else if (!formatValid) status = 'invalid';
  else if (result.username === candidate) status = result.status;
  else status = 'checking';

  return { status, markTaken };
}
