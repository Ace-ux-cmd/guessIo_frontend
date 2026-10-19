import { useState } from 'react';
import { Link } from 'react-router-dom';
import BottomNav from '../../components/ui/BottomNav';
import Icon from '../../components/ui/Icon';
import { useCurrentUser } from '../../hooks/useAuth';
import { EditProfileSheet, LogoutDialog, DeleteAccountSheet } from '../../components/profile/AccountSheets';
import { DOCS_URL, TERMS_URL, PRIVACY_URL, DOWNLOAD_URL } from '../../constants/legalLinks';

const ROW = 'flex items-center justify-between py-3.5';

function Group({ title, children }) {
  return (
    <section className="px-5 mt-6">
      <h2 className="text-xs font-semibold text-mute mb-1.5 px-1">{title}</h2>
      <div className="rounded-xl bg-s1 px-4 divide-y divide-line">{children}</div>
    </section>
  );
}

function RowText({ title, sub }) {
  return (
    <span>
      <span className="block">{title}</span>
      {sub && <span className="block text-xs text-mute">{sub}</span>}
    </span>
  );
}

/**
 * Settings. Account actions and links only (edit profile, support/docs/legal,
 * log out, delete account). Preference controls are not part of v1; see
 * Possible-Updates.md.
 */
export default function Settings() {
  const { data: user } = useCurrentUser();
  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col pb-24">
        <header className="flex items-center gap-1 px-4 pt-5 pb-3">
          <Link to="/profile" replace className="p-2 text-mute" aria-label="Back"><Icon name="back" /></Link>
          <h1 className="text-xl font-bold flex-1">Settings</h1>
        </header>

        <Group title="Account">
          <button type="button" onClick={() => setEditOpen(true)} className={`${ROW} w-full text-left`}>
            <RowText title="Edit profile" sub="Username and email" />
            <Icon name="chev" className="w-4 h-4 text-mute" />
          </button>
        </Group>

        <Group title="Mobile app">
          <a href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className={ROW}>
            <RowText title="Download the mobile app" sub="Play guessIo on your phone" />
            <Icon name="chev" className="w-4 h-4 text-mute" />
          </a>
        </Group>

        <Group title="Support">
          <Link to="/support" replace className={ROW}>
            <RowText title="Help and feedback" sub="Discord, feedback form, email" />
            <Icon name="chev" className="w-4 h-4 text-mute" />
          </Link>
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className={ROW}>
            <RowText title="Documentation" />
            <Icon name="chev" className="w-4 h-4 text-mute" />
          </a>
          <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className={ROW}>
            <RowText title="Terms of service" />
            <Icon name="chev" className="w-4 h-4 text-mute" />
          </a>
          <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className={ROW}>
            <RowText title="Privacy policy" />
            <Icon name="chev" className="w-4 h-4 text-mute" />
          </a>
        </Group>

        <Group title="Account actions">
          <button type="button" onClick={() => setLogoutOpen(true)} className={`${ROW} w-full text-left`}>
            Log out<Icon name="chev" className="w-4 h-4 text-mute" />
          </button>
          <button type="button" onClick={() => setDeleteOpen(true)} className={`${ROW} w-full text-left text-bad`}>
            Delete account<Icon name="chev" className="w-4 h-4 text-mute" />
          </button>
        </Group>
      </main>
      <BottomNav active="/profile" />
      {editOpen && <EditProfileSheet open onClose={() => setEditOpen(false)} user={user} />}
      <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
      <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} userEmail={user?.email} />
    </>
  );
}
