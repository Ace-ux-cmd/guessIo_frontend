import { useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icon';

// Four tabs, as in the redesign. Support/Settings live under Profile.
const TABS = [
  { icon: 'home', label: 'Home', path: '/dashboard', match: ['/dashboard', '/play', '/matchmaking', '/private-room'] },
  { icon: 'trophy', label: 'Leaderboard', path: '/leaderboards', match: ['/leaderboards'] },
  { icon: 'history', label: 'Matches', path: '/history', match: ['/history'] },
  { icon: 'user', label: 'Profile', path: '/profile', match: ['/profile', '/settings', '/support'] },
];

/**
 * Fixed bottom tab bar (centred under the content frame on desktop - see
 * `#root > nav.bottom-nav` in app.css). Render as a direct child of the
 * route's fragment, next to <main>. `active` may force a tab by path.
 */
export default function BottomNav({ active }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function isActive(tab) {
    if (active) return tab.path === active;
    return tab.match.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }

  return (
    <nav
      className="bottom-nav fixed bottom-0 inset-x-0 z-20 mx-auto max-w-[430px] bg-bg/95 backdrop-blur border-t border-line grid grid-cols-4 pb-[env(safe-area-inset-bottom)]"
      aria-label="Main"
    >
      {TABS.map((tab) => (
        <button
          key={tab.path}
          type="button"
          onClick={() => navigate(tab.path, { replace: true })}
          aria-current={isActive(tab) ? 'page' : undefined}
          className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold whitespace-nowrap ${isActive(tab) ? 'text-g' : 'text-mute'}`}
        >
          <Icon name={tab.icon} />
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
