import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/ui/AuthShell';
import Button from '../../components/ui/Button';
import { Banner } from '../../components/ui/Feedback';
import { exchangeGoogleCode } from '../../api/auth.api';
import { useAuthStore } from '../../stores/authStore';
import { useQueryClient } from '@tanstack/react-query';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      setError('Google sign-in could not be completed.');
      return;
    }
    exchangeGoogleCode(code)
      .then((result) => {
        if (result.onboarding) {
          // Brand-new Google identity: nothing has been saved yet. Hand the
          // short-lived, single-use onboarding token off via route state
          // rather than persisting it anywhere.
          navigate('/onboarding', {
            replace: true,
            state: { onboardingToken: result.onboardingToken, suggestedUsername: result.suggestedUsername },
          });
          return;
        }
        setSession(result);
        queryClient.invalidateQueries({ queryKey: ['me'] });
        navigate('/dashboard', { replace: true });
      })
      .catch((err) => {
        setError(err?.response?.data?.error?.message || 'Google sign-in could not be completed.');
      });
  }, [navigate, params, queryClient, setSession]);

  return (
    <AuthShell
      title={error ? <>Sign-in<br />failed.</> : <>Signing<br />you in.</>}
      sub={error ? undefined : 'Verifying your Google account…'}
    >
      {error && (
        <>
          <Banner variant="error">{error}</Banner>
          <Button onClick={() => navigate('/login', { replace: true })}>Back to login</Button>
        </>
      )}
    </AuthShell>
  );
}
