import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ConfirmDialog from './ConfirmDialog';
import { useFeatures } from '../../hooks/useFeatures';
import { getPushState } from '../../lib/push';

/** After "Not now" or a visit to Settings, the prompt stays away this long. */
export const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

const snoozeKey = (userId) => `guessio:notifPrompt:${userId}`;

export function isSnoozed(userId, now = Date.now()) {
  try {
    const until = Number(localStorage.getItem(snoozeKey(userId)));
    return Number.isFinite(until) && until > now;
  } catch {
    return false;
  }
}

function snooze(userId, now = Date.now()) {
  try {
    localStorage.setItem(snoozeKey(userId), String(now + SNOOZE_MS));
  } catch {
    /* storage unavailable: the prompt may show again next visit */
  }
}

/**
 * Asks a signed-in player to turn notifications on, and sends them to the
 * notifications section of Settings, where the real switch lives. It only
 * appears when this device can actually receive them (the same check Settings
 * uses), the system has not blocked them, the device has no subscription yet,
 * the player has not switched them off on purpose, and has not already said
 * "Not now" this week.
 * `canShow` lets the host screen hold it back while another dialog is open.
 */
export default function NotificationPrompt({ userId, canShow = true }) {
  const navigate = useNavigate();
  const { push } = useFeatures();
  const [closed, setClosed] = useState(() => isSnoozed(userId));
  const { data: state } = useQuery({ queryKey: ['pushState'], queryFn: getPushState, enabled: Boolean(userId) && push });

  const open = Boolean(state) && state.supported && state.permission !== 'denied' && !state.subscribed && !state.turnedOff && canShow && !closed;

  const later = () => {
    snooze(userId);
    setClosed(true);
  };
  const goToSettings = () => {
    snooze(userId);
    setClosed(true);
    navigate('/settings#notifications');
  };

  return (
    <ConfirmDialog
      open={open}
      tone="neutral"
      eyebrow="Notifications"
      title="Turn on notifications"
      body="Hear about it when someone knocks you out of the top 3, when a friend sends or accepts a request, and before your daily streak runs out. You choose which ones in Settings."
      cancelLabel="Not now"
      confirmLabel="Open settings"
      onCancel={later}
      onConfirm={goToSettings}
    />
  );
}
