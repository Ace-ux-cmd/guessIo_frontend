import Icon from '../ui/Icon';
import { ICONS } from '../ui/icons';

/** Square badge for an achievement: its icon once unlocked, a lock before. */
export default function AchievementBadge({ icon, unlocked }) {
  return (
    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${unlocked ? 'bg-g text-black' : 'bg-s2 text-mute'}`}>
      {unlocked ? <Icon name={ICONS[icon] ? icon : 'star'} className="h-5 w-5" /> : <Icon name="lock" className="h-5 w-5" />}
    </div>
  );
}
