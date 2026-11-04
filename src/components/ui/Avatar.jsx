import { useEffect, useState } from 'react';

const RINGS = ['#8DFF39', '#00E5FF', '#9C4DFF', '#FFBA37'];

// Escapes the characters that could end a quoted CSS url() early, leaving the rest (including existing %xx) as is.
const cssSafeUrl = (value) => String(value).replace(/["\\\s()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);

/**
 * Round avatar with an accent ring. The ring colour is derived from the name,
 * so the same player always gets the same colour. A supplied avatarUrl wins
 * over the silhouette. `name` is the display name; `size` is px.
 */
export default function Avatar({ name = '?', size = 36, url, className = '', active = false, ringColor, style: customStyle }) {
  const [imageFailed, setImageFailed] = useState(false);
  const label = name || '?';
  useEffect(() => setImageFailed(false), [url]);
  let h = 0;
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) % RINGS.length;
  const ring = ringColor || RINGS[h];
  // --ui is shared across screens, so avatars follow the same compact scale.
  const dim = `calc(${size}px * var(--ui, 1))`;
  const style = { position: 'relative', width: dim, height: dim, border: `2px solid ${ring}`, background: `${ring}26` };
  if (url && !imageFailed) {
    style.backgroundImage = `url("${cssSafeUrl(url)}")`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
  }
  Object.assign(style, customStyle);
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full select-none ${active ? 'avt-on' : ''} ${className}`.trim()}
      style={style}
      role={url ? 'img' : undefined}
      aria-label={url ? label : undefined}
      aria-hidden={url ? undefined : true}
    >
      {url && !imageFailed && (
        <img
          src={url}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
        />
      )}
      {(!url || imageFailed) && (
        <svg viewBox="0 0 24 24" style={{ width: '62%', height: '62%' }}>
          <circle cx="12" cy="9" r="4.2" fill={ring} />
          <path d="M3.5 22c.8-5 4.2-7.5 8.5-7.5s7.7 2.5 8.5 7.5z" fill={ring} />
        </svg>
      )}
    </span>
  );
}
