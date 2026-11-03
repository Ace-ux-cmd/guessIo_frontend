import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BottomNav from '../../components/ui/BottomNav';
import Avatar from '../../components/ui/Avatar';
import Toggle from '../../components/ui/Toggle';
import { PageSkeleton } from '../../components/ui/Feedback';
import { useCurrentUser } from '../../hooks/useAuth';
import { useFeatures } from '../../hooks/useFeatures';
import { EditProfileSheet, DeleteAccountSheet } from '../../components/profile/AccountSheets';
import { DOCS_URL, TERMS_URL, PRIVACY_URL, DOWNLOAD_URL } from '../../constants/legalLinks';
import * as safetyApi from '../../api/safety.api';
import * as pushApi from '../../api/push.api';
import { enablePush, disablePush, getPushState } from '../../lib/push';
import { isNative } from '../../lib/native';
import { getErrorMessage } from '../../api/client';
import { APP_VERSION } from '../../lib/version';

const SectionTitle = ({ id, children }) => <h2 className="section-title" id={id}>{children}</h2>;

function LinkRow({ title, sub, to, href }) {
  const inner = (
    <>
      <div className="setting-copy">
        <strong>{title}</strong>
        {sub && <span>{sub}</span>}
      </div>
      <span className="select" aria-hidden="true">&rarr;</span>
    </>
  );
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className="setting">{inner}</a>
    : <Link to={to} replace className="setting">{inner}</Link>;
}

function PrivacySection({ data }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const save = useMutation({
    mutationFn: safetyApi.updatePrivacy,
    onSuccess: (next) => { setError(null); queryClient.setQueryData(['privacy'], next); queryClient.invalidateQueries({ queryKey: ['me'] }); },
    onError: (err) => setError(getErrorMessage(err, 'Could not save that setting.')),
  });
  const hidden = data.profilePrivate;
  return (
    <section className="section" aria-labelledby="privacy-title">
      <SectionTitle id="privacy-title">Privacy</SectionTitle>
      <div className="settings-list">
        <Toggle
          variant="settings"
          label="Private profile"
          description="Hides you from search, closes your profile to other players and blocks friend requests."
          checked={hidden}
          disabled={save.isPending}
          onChange={(v) => save.mutate({ profilePrivate: v })}
        />
        <Toggle
          variant="settings"
          label="Appear in search"
          description="Others can find you by username or call sign."
          checked={data.appearInSearch && !hidden}
          disabled={hidden || save.isPending}
          onChange={(v) => save.mutate({ appearInSearch: v })}
        />
        <Toggle
          variant="settings"
          label="Anyone can send friend requests"
          description="Turn off to receive none."
          checked={data.friendRequestsFrom === 'EVERYONE' && !hidden}
          disabled={hidden || save.isPending}
          onChange={(v) => save.mutate({ friendRequestsFrom: v ? 'EVERYONE' : 'NOBODY' })}
        />
      </div>
      <p className="version">Leaderboards and match results always show you. They are part of ranked play.</p>
      {error && <p role="alert" className="setting-error">{error}</p>}
    </section>
  );
}

const ALL_OFF = { rankLoss: false, friendActivity: false, dailyStreak: false };
const ALL_ON = { rankLoss: true, friendActivity: true, dailyStreak: true };

/**
 * Notifications. The device switch is the master: while it is off the three
 * alert types read as off and cannot be changed. Turning it off saves them all
 * off; turning it back on enables all three again.
 */
function NotificationsSection({ prefs, state }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState(null);
  const supported = state.supported;
  const blocked = state.permission === 'denied';
  const deviceOn = supported && state.subscribed;
  const save = useMutation({
    mutationFn: pushApi.updatePushPreferences,
    onSuccess: (next) => queryClient.setQueryData(['pushPrefs'], next),
    onError: (err) => setMessage(getErrorMessage(err, 'Could not save that setting.')),
  });
  const device = useMutation({
    mutationFn: async (on) => {
      if (on) await enablePush(); else await disablePush();
      return pushApi.updatePushPreferences(on ? ALL_ON : ALL_OFF);
    },
    onSuccess: (next) => { setMessage(null); queryClient.setQueryData(['pushPrefs'], next); queryClient.invalidateQueries({ queryKey: ['pushState'] }); },
    onError: (err) => setMessage(err.message || 'Could not change notifications on this device.'),
  });
  const busy = device.isPending || save.isPending;
  const typeToggle = (label, description, key) => (
    <Toggle variant="settings" label={label} description={description} checked={deviceOn && prefs[key]} disabled={!deviceOn || busy} onChange={(v) => save.mutate({ [key]: v })} />
  );
  return (
    <section id="notifications" className="section" aria-labelledby="notifications-title">
      <SectionTitle id="notifications-title">Notifications</SectionTitle>
      <div className="settings-list">
        {supported ? (
          <Toggle
            variant="settings"
            label="Notifications on this device"
            description={blocked ? `Blocked in your ${isNative() ? 'phone' : 'browser'} settings.` : 'Turn off to silence everything below.'}
            checked={deviceOn}
            disabled={busy || blocked}
            onChange={(v) => device.mutate(v)}
          />
        ) : (
          <p className="setting-note">{isNative() ? 'Notifications need the latest version of the app. Update guessIo to turn them on.' : 'This browser cannot receive notifications.'}</p>
        )}
        {typeToggle('Lost a top 3 spot', 'When someone knocks you out of the top 3.', 'rankLoss')}
        {typeToggle('Friend activity', 'Requests and accepted requests.', 'friendActivity')}
        {typeToggle('Daily streak at risk', 'A reminder before your streak ends at 00:00 UTC.', 'dailyStreak')}
      </div>
      {message && <p role="alert" className="setting-error">{message}</p>}
    </section>
  );
}

function BlockedSection({ data }) {
  const queryClient = useQueryClient();
  const unblock = useMutation({
    mutationFn: safetyApi.unblockPlayer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blocked'] }),
  });
  const items = data?.items || [];
  return (
    <section className="section" aria-labelledby="blocked-title">
      <SectionTitle id="blocked-title">Blocked players</SectionTitle>
      <div className="settings-list">
        {items.length === 0 ? (
          <p className="setting-note" style={{ borderBottom: 0 }}>You have not blocked anyone.</p>
        ) : items.map((b) => (
          <div key={b.username} className="setting">
            <Avatar name={b.displayName} url={b.avatarUrl} size={36} />
            <div className="setting-copy" style={{ flex: 1 }}>
              <strong>{b.displayName}</strong>
              <span>@{b.username}</span>
            </div>
            <button type="button" className="select" disabled={unblock.isPending} onClick={() => unblock.mutate(b.username)}>Unblock</button>
          </div>
        ))}
      </div>
      {unblock.isError && <p role="alert" className="setting-error">{getErrorMessage(unblock.error, 'Could not unblock.')}</p>}
    </section>
  );
}

/** Settings: account, privacy, notifications, blocked players, links, delete. */
export default function Settings() {
  const { data: user } = useCurrentUser();
  const { safety, push } = useFeatures();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Every section's data is fetched here, so the page appears once, complete.
  const privacy = useQuery({ queryKey: ['privacy'], queryFn: safetyApi.getPrivacy, enabled: safety });
  const prefs = useQuery({ queryKey: ['pushPrefs'], queryFn: pushApi.getPushPreferences, enabled: push });
  const pushState = useQuery({ queryKey: ['pushState'], queryFn: getPushState, enabled: push });
  const blocked = useQuery({ queryKey: ['blocked'], queryFn: safetyApi.listBlocked, enabled: safety });

  const waiting = !user || (safety && (privacy.isLoading || blocked.isLoading)) || (push && (prefs.isLoading || pushState.isLoading));

  // Arriving from the notifications prompt (/settings#notifications): bring that section into view once the page has rendered.
  const { hash } = useLocation();
  useEffect(() => {
    if (waiting || hash !== '#notifications') return;
    document.getElementById('notifications')?.scrollIntoView({ block: 'start' });
  }, [waiting, hash]);

  if (waiting) return (<><PageSkeleton cards={5} /><BottomNav active="/profile" /></>);

  const name = user.displayName || user.username;
  return (
    <>
      <main className="app">
        <header className="topbar with-back leading">
          <Link to="/profile" replace aria-label="Back" className="back">&larr;</Link>
          <div>
            <p className="eyebrow">settings</p>
            <h1 className="sr-only">Settings</h1>
          </div>
        </header>

        <div className="content">
          <section className="profile-card" aria-label="Account profile">
            <Avatar
              name={name}
              url={user.avatarUrl}
              size={43}
              className="settings-avatar"
              ringColor="#00E5FF"
              style={{ borderColor: 'var(--cyan)', ...(!user.avatarUrl ? { background: '#183254' } : {}) }}
            />
            <div className="profile-copy">
              <strong>{name}</strong>
              <span>{user.email || `@${user.username}`}</span>
            </div>
            <button type="button" className="edit" onClick={() => setEditOpen(true)}>Edit</button>
          </section>

          {safety && privacy.data && <PrivacySection data={privacy.data} />}
          {push && prefs.data && pushState.data && <NotificationsSection prefs={prefs.data} state={pushState.data} />}
          {safety && <BlockedSection data={blocked.data} />}

          <section className="section" aria-labelledby="help-title">
            <SectionTitle id="help-title">Help and links</SectionTitle>
            <div className="settings-list">
              <LinkRow href={DOWNLOAD_URL} title="Download the mobile app" sub="Play guessIo on your phone" />
              <LinkRow to="/support" title="Help and feedback" sub="Discord, feedback form, email" />
              <LinkRow href={DOCS_URL} title="Documentation" />
              <LinkRow href={TERMS_URL} title="Terms of service" />
              <LinkRow href={PRIVACY_URL} title="Privacy policy" />
            </div>
          </section>

          <section className="section" aria-labelledby="account-title">
            <SectionTitle id="account-title">Account</SectionTitle>
            <button type="button" className="danger" onClick={() => setDeleteOpen(true)}>Delete account</button>
          </section>

          <p className="version">guessIo version {APP_VERSION}</p>
        </div>
      </main>
      <BottomNav active="/profile" />
      {editOpen && <EditProfileSheet open onClose={() => setEditOpen(false)} user={user} />}
      <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} userEmail={user?.email} />
    </>
  );
}
