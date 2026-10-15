/**
 * Initial-letter avatar (hue derived from the name) from the redesign.
 * If the backend supplies an avatarUrl, that image is used instead.
 * `name` is the display name; `size` is px.
 */
export default function Avatar({ name = '?', size = 36, url, className = '' }) {
  const label = name || '?';
  let h = 0;
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) % 360;
  const style = {
    width: size,
    height: size,
    fontSize: size * 0.42,
    background: `hsl(${h} 30% 15%)`,
    color: `hsl(${h} 65% 70%)`,
    boxShadow: `inset 0 0 0 1px hsl(${h} 30% 28%)`,
  };
  if (url) {
    style.backgroundImage = `url(${url})`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold shrink-0 select-none ${className}`}
      style={style}
      role={url ? 'img' : undefined}
      aria-label={url ? label : undefined}
    >
      {url ? '' : label === '?' ? '?' : label[0].toUpperCase()}
    </span>
  );
}
