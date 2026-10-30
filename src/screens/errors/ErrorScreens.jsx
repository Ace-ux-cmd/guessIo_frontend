import { useNavigate, useSearchParams } from 'react-router-dom';
import ErrorScreen, { ErrorAction } from '../../components/ui/ErrorScreen';

export function NoConnection() {
  const navigate = useNavigate();
  return (
    <ErrorScreen
      tone="warn"
      glyph={'\u2301'}
      title="You are offline"
      body="We cannot reach the guessIo servers right now, but you can still keep practicing."
      note="Solo practice is still available on this device."
      actions={(
        <>
          <ErrorAction onClick={() => window.location.reload()}>Check connection</ErrorAction>
          <ErrorAction kind="solo" onClick={() => navigate('/guest-home', { replace: true })}>Play solo</ErrorAction>
        </>
      )}
    />
  );
}

export function ServerError() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorId = searchParams.get('errorId');
  return (
    <ErrorScreen
      tone="bad"
      glyph="500"
      title="Something went wrong"
      body="The arena hit an unexpected error. Try again in a moment."
      note={errorId ? `Error ID ${errorId}` : undefined}
      actions={(
        <>
          <ErrorAction onClick={() => window.location.reload()}>Retry</ErrorAction>
          <ErrorAction kind="secondary" onClick={() => navigate('/dashboard', { replace: true })}>Back home</ErrorAction>
        </>
      )}
    />
  );
}

/** Entering/joining an invalid or expired private-room code. */
export function RoomNotFound() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('code');
  return (
    <ErrorScreen
      tone="info"
      glyph="404"
      title="Room not found"
      body="That room code is invalid, or the match has already ended."
      note={roomCode ? `Room code ${roomCode}` : undefined}
      actions={(
        <>
          <ErrorAction onClick={() => navigate('/play', { replace: true })}>Try a different code</ErrorAction>
          <ErrorAction kind="secondary" onClick={() => navigate('/dashboard', { replace: true })}>Back home</ErrorAction>
        </>
      )}
    />
  );
}

/** Catch-all for URLs that don't match any route in the app. */
export function NotFound() {
  const navigate = useNavigate();
  return (
    <ErrorScreen
      tone="info"
      glyph="404"
      title="Code not found"
      body="This page does not exist or the code you followed has expired."
      actions={<ErrorAction onClick={() => navigate('/dashboard', { replace: true })}>Back home</ErrorAction>}
    />
  );
}

export function Maintenance() {
  return (
    <ErrorScreen
      tone="vio"
      glyph={'\u25CC'}
      title="Arena maintenance"
      body="guessIo is being tuned behind the scenes. Multiplayer will return as soon as the work is complete."
      actions={<ErrorAction onClick={() => window.location.reload()}>Check again</ErrorAction>}
    />
  );
}

export function Unauthorized() {
  const navigate = useNavigate();
  return (
    <ErrorScreen
      tone="warn"
      glyph="401"
      title="You were signed out"
      body="Your session expired. Log in again to pick up where you left off."
      actions={(
        <>
          <ErrorAction onClick={() => navigate('/login', { replace: true })}>Log in again</ErrorAction>
          <ErrorAction kind="secondary" onClick={() => navigate('/guest-home', { replace: true })}>Continue as guest</ErrorAction>
        </>
      )}
    />
  );
}
