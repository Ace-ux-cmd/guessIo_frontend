import Icon from '../ui/Icon';
import { ICONS } from '../ui/icons';

const FLAWLESS_LEVELS = {
  FLAWLESS_FIVE: '5',
  FLAWLESS_TEN: '10',
  FLAWLESS_TWENTY: '20',
};

export const isFlawlessAchievement = (achievementKey) => Boolean(FLAWLESS_LEVELS[achievementKey]);

export function AchievementMark({ achievementKey, icon, className = 'h-5 w-5' }) {
  const level = FLAWLESS_LEVELS[achievementKey];
  if (!level) return <Icon name={ICONS[icon] ? icon : 'star'} className={className} />;

  return (
    <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.5 14.7 6.2 21l5.8-2.7 5.8 2.7-1.3-6.3" fill="currentColor" opacity=".28" />
      <circle cx="12" cy="10" r="7.3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="5.1" stroke="currentColor" strokeWidth="1" opacity=".65" />
      <text x="12" y="12.7" fill="currentColor" fontSize={level.length === 1 ? '8' : '6'} fontWeight="800" textAnchor="middle">{level}</text>
    </svg>
  );
}

/** Square badge for an achievement, with numbered marks for Flawless streaks. */
export default function AchievementBadge({ achievementKey, icon, unlocked }) {
  const hasFlawlessMark = isFlawlessAchievement(achievementKey);
  return (
    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${unlocked ? 'bg-g text-black' : 'bg-s2 text-mute'}`}>
      {unlocked || hasFlawlessMark
        ? <AchievementMark achievementKey={achievementKey} icon={icon} />
        : <Icon name="lock" className="h-5 w-5" />}
    </div>
  );
}
