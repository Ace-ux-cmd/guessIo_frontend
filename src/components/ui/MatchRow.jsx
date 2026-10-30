import { Link } from 'react-router-dom';
import { formatRelativeTime, joinNames, matchTypeLabel, scoreText, signed } from '../../lib/format';

/** Result badge letter and row modifier class, matching the template's .game/.result pattern. */
function outcomeView(m) {
  if (m.outcome === 'WIN') return { letter: 'W', loss: false, label: 'Victory' };
  if (m.outcome === 'LOSS') return { letter: 'L', loss: true, label: m.myForfeited ? 'Forfeit' : 'Defeat' };
  if (m.outcome === 'CANCELLED') return { letter: 'C', loss: false, label: 'Cancelled' };
  return { letter: 'D', loss: false, label: 'Draw' };
}

/** One finished match: coloured by outcome, links to its details. Matches the template's game-list row. */
export default function MatchRow({ match: m }) {
  const v = outcomeView(m);
  const names = joinNames(m.opponents.map((o) => o.username).filter(Boolean)).replace(' and ', ', ');
  const opponentCount = m.opponents.length;
  const title = opponentCount > 1 ? `${v.label} vs ${opponentCount} players` : `${v.label} vs ${names}`;
  const hasDelta = m.ratingChange !== null && m.ratingChange !== undefined;

  return (
    <Link to={`/history/${m.id}`} replace className={`game${v.loss ? ' loss' : ''}`}>
      <div className="result home-variant" aria-hidden="true">{v.letter}</div>
      <div className="game-info">
        <strong>{title}</strong>
        <span>{matchTypeLabel(m.type)} &middot; {m.difficulty === 'HARDCORE' ? 'Hardcore' : 'Standard'} &middot; {formatRelativeTime(m.startedAt || m.endedAt)}</span>
      </div>
      {hasDelta ? (
        <span className="game-score tnum">{signed(m.ratingChange)}</span>
      ) : (
        <span className="game-score">{scoreText(m)}</span>
      )}
    </Link>
  );
}
