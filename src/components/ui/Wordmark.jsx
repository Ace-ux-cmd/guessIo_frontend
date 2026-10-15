const COLORS = ['#12E060', '#2FD8E8', '#A855F7', '#FF9A3C', '#E8434F'];

/** guess + Io wordmark. Size is set by the caller via a text-* class (e.g. "text-4xl"). */
export default function Wordmark({ className = 'text-xl' }) {
  return (
    <span className={`font-display font-black inline-flex items-baseline ${className}`}>
      {'guess'.split('').map((c, i) => (
        <span key={i} style={{ color: COLORS[i] }}>{c}</span>
      ))}
      <span className="italic text-ink">Io</span>
    </span>
  );
}
