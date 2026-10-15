import { ICONS } from './icons';

/** Stroke icon from the redesign's shared icon set. `name` must be a key of ICONS. */
export default function Icon({ name, className = 'w-5 h-5' }) {
  return (
    <svg
      className={`${className} shrink-0`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] || '' }}
    />
  );
}
