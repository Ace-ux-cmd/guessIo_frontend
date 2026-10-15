const BASE = 'flex w-full items-center justify-center gap-2 px-5 text-base font-semibold';
const VARIANTS = {
  primary: 'h-12 bg-g text-bg font-bold cut',
  outline: 'h-12 border border-line text-ink bg-s1 rounded-md',
  ghost: 'h-12 border border-line text-ink bg-s1 rounded-md',
  danger: 'h-12 bg-bad text-white font-bold rounded-md',
  google: 'h-12 bg-white text-[#1F1F1F] rounded-md active:translate-y-[2px] transition-transform disabled:opacity-80',
  text: 'h-10 text-mute',
};

/** Redesign buttons. `variant`: primary | outline | ghost | danger | google | text. Full-width by default (block flex). */
export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={`${BASE} ${VARIANTS[variant] || VARIANTS.primary} ${props.disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`.replace(/\s+/g, ' ').trim()}
      {...props}
    >
      {children}
    </button>
  );
}
