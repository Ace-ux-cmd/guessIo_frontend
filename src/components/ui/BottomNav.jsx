import { useNavigate, useLocation } from 'react-router-dom';

// Four tabs, matching the template's bottom-nav exactly (order, labels, active state).
// Icons stay as stroke SVGs rather than the template's glyph characters (⌂ ◆ ≡ ◎) so they
// render consistently across platforms and stay screen-reader friendly; they sit inside
// the same .nav-icon box the template defines (border, size, active glow).
const TABS = [
  { label: 'Home', path: '/dashboard', icon: 'M3 11 12 3l9 8v10h-6v-6H9v6H3z', match: ['/dashboard', '/play', '/matchmaking', '/private-room', '/daily'] },
  { label: 'Rank', path: '/leaderboards', icon: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3', match: ['/leaderboards'] },
  { label: 'Matches', path: '/history', icon: 'M4 6h16M4 12h16M4 18h10', match: ['/history'] },
  { label: 'Profile', path: '/profile', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6', match: ['/profile', '/settings', '/support', '/friends', '/players'] },
];

/** Fixed bottom tab bar. Render as a direct child of the route fragment, next to <main>. */
export default function BottomNav({ active, variant }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function isActive(tab) {
    if (active) return tab.path === active;
    return tab.match.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }

  return (
    <nav
      className={`bottom-nav${variant ? ` ${variant}` : ''}`}
      aria-label="Main navigation"
    >
      {TABS.map((tab) => {
        const on = isActive(tab);
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path, { replace: true })}
            aria-current={on ? 'page' : undefined}
            className={`nav-item${on ? ' active' : ''}`}
          >
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={tab.icon} /></svg>
            </span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
