import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useLogout, useDeleteAccount } from '../../hooks/useAuth';
import * as profileApi from '../../api/profile.api';
import { getErrorMessage } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

const INPUT = 'mt-1 w-full h-12 rounded-md bg-s2 border border-line px-3 outline-none focus:border-g disabled:opacity-60';

/** Edit profile sheet. The call sign (bold name, shown in matches and on the leaderboards) is editable and starts as the Google name; the @username chosen at sign-up is fixed. */
export function EditProfileSheet({ open, onClose, user, profile }) {
  const queryClient = useQueryClient();
  const savedCallSign = user?.displayName || user?.username || '';
  const [callSign, setCallSign] = useState(savedCallSign);
  const hasChanges = callSign.trim() !== savedCallSign.trim();
  const mutation = useMutation({
    mutationFn: profileApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicProfile'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      onClose();
    },
  });

  return (
    <Sheet open={open} onClose={onClose} title="Edit profile">
      <div className="mt-4">
        <label htmlFor="ep-name" className="text-sm text-mute">Call sign</label>
        <input id="ep-name" value={callSign} maxLength={30} onChange={(e) => setCallSign(e.target.value)} className={INPUT} />
        <p className="mt-1 text-xs text-mute">Starts as your Google name. Other players see this.</p>
        <label htmlFor="ep-handle" className="mt-4 block text-sm text-mute">Username</label>
        <input id="ep-handle" value={`@${user?.username || ''}`} disabled className={INPUT} />
        <p className="mt-1 text-xs text-mute">Your username can't be changed.</p>
        <label htmlFor="ep-email" className="mt-4 block text-sm text-mute">Email</label>
        <input id="ep-email" value={user?.email || ''} disabled className={INPUT} />
        <p className="mt-1 text-xs text-mute">Contact support to change your email.</p>
        {mutation.isError && <p className="mt-3 text-sm text-bad" role="alert">{getErrorMessage(mutation.error, 'Could not save your profile.')}</p>}
        <div className="mt-6">
          <Button disabled={!callSign.trim() || !hasChanges || mutation.isPending} onClick={() => mutation.mutate({ displayName: callSign.trim() })}>
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export function LogoutDialog({ open, onClose }) {
  const navigate = useNavigate();
  const logout = useLogout();
  function confirm() {
    // Navigate before clearing the session (see useLogout's onSettled): /login
    // has no auth guard, so this lands cleanly before isAuthenticated flips.
    onClose();
    navigate('/login', { replace: true });
    logout.mutate();
  }
  return (
    <ConfirmDialog
      open={open}
      tone="warn"
      title="Log out?"
      body="You will need to sign in again to play. You will be disconnected from any active match."
      cancelLabel="Cancel"
      confirmLabel="Log out"
      onCancel={onClose}
      onConfirm={confirm}
    />
  );
}

export function DeleteAccountSheet({ open, onClose, userEmail }) {
  const navigate = useNavigate();
  const deleteAccount = useDeleteAccount();
  const clearSession = useAuthStore((s) => s.clearSession);
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  function handleDeleted() {
    // Navigate before clearing the session so RequireAuth never swaps in its
    // locked gate on the current route (see useLogout).
    onClose();
    navigate('/login', { replace: true });
    clearSession();
    queryClient.clear();
  }
  const confirmed = userEmail ? confirmText.trim().toLowerCase() === userEmail.toLowerCase() : false;
  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="text-xl font-bold text-bad">Delete account</h2>
      <p className="mt-2 text-sm text-mute">This permanently deletes your profile, rating and points, and signs you out everywhere. It cannot be undone.</p>
      {deleteAccount.isError && (
        <p className="mt-3 text-sm text-bad" role="alert">{deleteAccount.error?.response?.data?.error?.message || 'Could not delete account.'}</p>
      )}
      <label htmlFor="del-email" className="block mt-4 text-sm text-mute">Type your email to confirm</label>
      <input
        id="del-email"
        type="email"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={userEmail}
        autoComplete="off"
        className="mt-1 w-full h-12 rounded-md bg-s2 border border-line px-3 outline-none focus:border-bad"
      />
      <div className="mt-5 space-y-2.5">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          variant="danger"
          disabled={!confirmed || deleteAccount.isPending}
          onClick={() => deleteAccount.mutate(undefined, { onSuccess: handleDeleted })}
        >
          {deleteAccount.isPending ? 'Deleting…' : 'Delete account'}
        </Button>
      </div>
    </Sheet>
  );
}

export function Chevron() { return <Icon name="chev" className="w-4 h-4 text-mute" />; }
