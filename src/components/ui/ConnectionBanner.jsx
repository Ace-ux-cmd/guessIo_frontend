import { useEffect, useState } from 'react';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import { retryConnection } from '../../sockets/socketClient';
import { useAuthStore } from '../../stores/authStore';
import Icon from './Icon';

const COPY = {
  connected: 'Connected',
  reconnecting: 'Reconnecting',
  offline: 'Connection lost',
};

// How long the button shows "Connecting" before offering another tap, in case
// the attempt never reports back.
const RETRY_FEEDBACK_MS = 8000;

/**
 * Only visible when there's something to tell the user (reconnecting / offline).
 * Styling follows the shared-components "Connection" banners.
 * `alwaysShow` forces the at-rest "Connected" state to render too.
 */
export default function ConnectionBanner({ alwaysShow = false }) {
  const status = useConnectionStatus();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (status !== 'offline') setRetrying(false);
  }, [status]);

  useEffect(() => {
    if (!retrying) return undefined;
    const timer = setTimeout(() => setRetrying(false), RETRY_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [retrying]);

  function handleReconnect() {
    setRetrying(true);
    retryConnection();
  }

  // Guests never connect to a server at all (see useConnectionStatus), so
  // their 'offline' status is a deliberate mode, not a failure worth a banner.
  if (!isAuthenticated) return null;
  if (status === 'connected' && !alwaysShow) return null;

  const copy = COPY[status];
  if (status === 'reconnecting') {
    return (
      <div role="status" className="flex items-center gap-2 rounded-md bg-warn/20 text-warn p-3 text-sm font-semibold">
        <span className="w-2 h-2 rounded-full bg-warn animate-pulse" />{copy}
      </div>
    );
  }
  if (status === 'offline') {
    return (
      <div role="status" className="flex items-center gap-2 rounded-md bg-bad/20 text-bad p-3 text-sm font-semibold">
        <Icon name="wifioff" className="w-4 h-4" />{copy}
        <button
          type="button"
          onClick={handleReconnect}
          disabled={retrying}
          className="ml-auto h-8 px-3 rounded-md bg-bad text-white text-xs font-bold disabled:opacity-60"
        >
          {retrying ? 'Connecting…' : 'Reconnect'}
        </button>
      </div>
    );
  }
  return (
    <div role="status" className="flex items-center gap-2 rounded-md bg-g/20 text-g p-3 text-sm font-semibold">
      <span className="w-2 h-2 rounded-full bg-g" />{copy}
    </div>
  );
}
