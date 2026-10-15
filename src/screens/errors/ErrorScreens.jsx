import { useNavigate, useSearchParams } from 'react-router-dom';
import ErrorScreen from '../../components/ui/ErrorScreen';
import Button from '../../components/ui/Button';

export function NoConnection() {
  const navigate = useNavigate();
  return (
    <ErrorScreen
      tone="warn"
      icon="wifioff"
      title="No internet"
      body="We can't reach guessIo. Check your Wi-Fi or mobile data and try again."
      actions={(
        <>
          <Button onClick={() => window.location.reload()}>Try again</Button>
          <Button variant="outline" onClick={() => navigate('/guest-home', { replace: true })}>Play solo offline</Button>
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
      icon="server"
      title="Something broke"
      body="Our servers hit a problem, not you. We're looking into it."
      note={errorId ? `Error ID ${errorId}` : undefined}
      actions={(
        <>
          <Button onClick={() => window.location.reload()}>Try again</Button>
          <Button variant="outline" onClick={() => navigate('/dashboard', { replace: true })}>Back home</Button>
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
      icon="nofind"
      title="Room not found"
      body="That room code is invalid, or the match has already ended."
      note={roomCode ? `Room code ${roomCode}` : undefined}
      actions={(
        <>
          <Button onClick={() => navigate('/play', { replace: true })}>Try a different code</Button>
          <Button variant="outline" onClick={() => navigate('/dashboard', { replace: true })}>Back home</Button>
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
      icon="nofind"
      title="Page not found"
      body="We couldn't find what you were looking for. It may have moved or never existed."
      actions={<Button onClick={() => navigate('/dashboard', { replace: true })}>Back home</Button>}
    />
  );
}

export function Maintenance() {
  return (
    <ErrorScreen
      tone="warn"
      icon="history"
      title="Back soon"
      body="guessIo is down for planned maintenance. Please check again shortly."
      actions={<Button onClick={() => window.location.reload()}>Check again</Button>}
    />
  );
}

export function Unauthorized() {
  const navigate = useNavigate();
  return (
    <ErrorScreen
      tone="mute"
      icon="lock"
      title="You were signed out"
      body="Your session expired. Log in again to pick up where you left off."
      actions={(
        <>
          <Button onClick={() => navigate('/login', { replace: true })}>Log in again</Button>
          <Button variant="outline" onClick={() => navigate('/guest-home', { replace: true })}>Continue as guest</Button>
        </>
      )}
    />
  );
}

export { Suspended, Banned } from './AccountLocked';
