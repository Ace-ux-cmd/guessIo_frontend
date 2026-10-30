const VARIANTS = {
  primary: 'btn',
  outline: 'btn alt',
  ghost: 'btn alt',
  danger: 'btn danger',
  google: 'btn light',
  text: 'inline-flex min-h-[44px] items-center justify-center px-3 font-bold text-mute underline decoration-white/20 underline-offset-4',
};

/** v3.8 buttons. `variant`: primary | outline | ghost | danger | google | text. Full width by default. */
export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={`w-full ${VARIANTS[variant] || VARIANTS.primary} ${className}`.replace(/\s+/g, ' ').trim()}
      {...props}
    >
      {children}
    </button>
  );
}
