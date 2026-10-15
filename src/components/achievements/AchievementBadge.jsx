import Icon from '../ui/Icon';
import { ICONS } from '../ui/icons';

/** Round badge for an achievement: its icon once unlocked, a lock before. */
export default function AchievementBadge({ icon, unlocked }) {
  return (
    <div className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${unlocked ? 'bg-g/25 text-g' : 'bg-s2 text-mute'}`}>
      {unlocked ? <Icon name={ICONS[icon] ? icon : 'star'} className="w-5 h-5" /> : <Icon name="lock" className="w-5 h-5" />}
    </div>
  );
}
