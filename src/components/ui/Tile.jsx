const LABEL = { c: 'correct place', p: 'in the code, wrong place', w: 'not in the code' };

/** Digit tile. state: 'c' correct | 'p' present | 'w' wrong | 'raw' | '' (empty). */
export default function Tile({ state = '', size = 'w-12 h-12 text-xl', className = '', children, ...rest }) {
  const label = LABEL[state] ? `${String(children)}, ${LABEL[state]}` : undefined;
  return (
    <span
      className={`tile ${state} ${size} ${className}`.replace(/\s+/g, ' ').trim()}
      role={label ? 'img' : undefined}
      aria-label={label}
      {...rest}
    >
      {children}
    </span>
  );
}
