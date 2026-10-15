import { useLocation, useNavigate } from 'react-router-dom';
import Sheet from '../ui/Sheet';
import AchievementBadge from './AchievementBadge';
import { useAuthStore } from '../../stores/authStore';
import { useMatchStore } from '../../stores/matchStore';
import { useAchievementNotificationSync } from '../../hooks/useAchievementNotificationSync';
import { acknowledgeAchievements, useAchievementNotificationStore } from '../../stores/achievementNotifications';

// The prompt only ever appears on these screens. Matchmaking, private rooms
// and live gameplay are deliberately absent, and so is everything else not
// listed (auth, errors, account-locked screens): an allowlist cannot grow a
// new screen that the prompt would unexpectedly cover.
const QUIET_ROUTES = new Set([
  '/dashboard',
  '/play',
  '/results',
  '/profile',
  '/profile/achievements',
  '/history',
  '/leaderboards',
  '/settings',
  '/support',
]);

// Belt and braces with the route check: never interrupt a queue, a room or a
// match, even if the URL has not caught up with the match state yet.
const QUIET_MATCH_STATUSES = new Set(['IDLE', 'ENDED', 'CANCELLED']);

function isQuietRoute(pathname) {
  return QUIET_ROUTES.has(pathname) || pathname.startsWith('/history/');
}

/**
 * "Achievement unlocked" prompt with two choices: Ok, or go to the
 * achievements screen. Mount once inside the router.
 */
export default function AchievementUnlockedPrompt() {
  useAchievementNotificationSync();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const matchStatus = useMatchStore((s) => s.status);
  const pending = useAchievementNotificationStore((s) => s.pending);

  const canShow = isAuthenticated && isQuietRoute(pathname) && QUIET_MATCH_STATUSES.has(matchStatus);
  if (!canShow || pending.length === 0) return null;

  const keys = pending.map((achievement) => achievement.key);
  const title = pending.length === 1 ? 'Achievement unlocked' : `${pending.length} achievements unlocked`;

  function handleOk() {
    acknowledgeAchievements(keys);
  }

  function handleViewAchievements() {
    acknowledgeAchievements(keys);
    navigate('/profile/achievements', { replace: true });
  }

  return (
    <Sheet open locked showClose={false} labelledBy="achievement-unlocked-title">
      <div className="text-xs font-semibold text-g">Congratulations</div>
      <div id="achievement-unlocked-title" className="font-bold text-lg mt-0.5">{title}</div>
      <ul className="mt-3 space-y-2.5 overflow-y-auto" style={{ maxHeight: '40vh' }}>
        {pending.map((achievement) => (
          <li key={achievement.key} className="surface rounded-xl border border-line p-3 flex items-center gap-3">
            <AchievementBadge icon={achievement.icon} unlocked />
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{achievement.title}</div>
              <div className="text-sm text-mute">{achievement.description}</div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleOk}
          className="flex-1 h-11 rounded-md border border-line flex items-center justify-center text-sm font-semibold"
        >
          Ok
        </button>
        <button
          type="button"
          onClick={handleViewAchievements}
          className="flex-1 h-11 rounded-md bg-g text-bg flex items-center justify-center text-sm font-bold"
        >
          Go to achievements
        </button>
      </div>
    </Sheet>
  );
}
