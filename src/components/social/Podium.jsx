import Avatar from '../ui/Avatar';

// Second, first, third: the DOM order the template's nth-child rules expect
// (.player:nth-child(2) is the taller, centred first-place block).
const SLOTS = [1, 0, 2];

/**
 * Top three of a leaderboard, styled to match the template's podium-stage
 * exactly (crown on first place, colour per rank, rank-block riser behind
 * each player). `items` come straight from the leaderboard API
 * ({ userId, username, avatarUrl, value }). `onSelect(item)` makes each name
 * tappable; without it the names are plain text.
 */
export default function Podium({ items, unit = 'rating', onSelect }) {
  if (!items.length) return null;
  return (
    <div className="podium-stage" role="list" aria-label="Top three players">
      {SLOTS.map((index) => {
        const item = items[index];
        const first = index === 0;
        if (!item) return <div key={index} role="presentation" className="player" />;
        const ringColor = first ? '#FFBA37' : index === 2 ? '#CD7F32' : '#C0C0C0';
        const frameStyle = {
          borderColor: ringColor,
          color: ringColor,
          boxShadow: `0 0 ${first ? 30 : 20}px ${ringColor}61`,
        };
        return (
          <article key={index} role="listitem" className="player">
            {first && <span className="crown" aria-label="First place">&#9819;</span>}
            <div className="portrait" style={frameStyle}>
              <Avatar name={item.username} url={item.avatarUrl} size={first ? 80 : 62} ringColor={ringColor} />
            </div>
            {onSelect && !item.isBot ? (
              <button type="button" onClick={() => onSelect(item)} className="player-name player-name-btn" style={{ background: 'transparent', textAlign: 'center', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{item.username}</button>
            ) : (
              <strong className="player-name">{item.username}</strong>
            )}
            <span className="player-score"><strong className="tnum">{Number(item.value).toLocaleString()}</strong> {unit}</span>
            <div className="rank-block"><span>{index + 1}</span></div>
          </article>
        );
      })}
    </div>
  );
}
