import { Link } from 'react-router-dom';
import { formatRelativeTime, joinNames, matchTypeLabel, scoreText, signed } from '../../lib/format';

/** Badge text and card modifier for each outcome, as the match history template shows them. */
function outcomeView(m) {
  if (m.outcome === 'WIN') return { badge: 'WIN', mod: '', label: 'Victory' };
  if (m.outcome === 'LOSS') return { badge: 'LOSS', mod: ' loss', label: m.myForfeited ? 'Forfeit' : 'Defeat' };
  if (m.outcome === 'CANCELLED') return { badge: 'VOID', mod: ' cancelled', label: 'Cancelled' };
  return { badge: 'DRAW', mod: ' draw', label: 'Draw' };
}

/** One finished match in the history list. Links to its details. */
export default function MatchCard({ match: m }) {
  const v = outcomeView(m);
  const opponents = m.opponents.map((o) => o.username).filter(Boolean);
  const versus = opponents.length > 1 ? `${opponents.length} players` : joinNames(opponents);
  const hasDelta = m.ratingChange !== null && m.ratingChange !== undefined;
  return (
    <Link to={`/history/${m.id}`} replace className={`match-card${v.mod}`}>
      <div className="result matches-variant" aria-hidden="true">{v.badge}</div>
      <div className="match-info">
        <strong>{v.label} vs {versus}</strong>
        <p>
          <span>{matchTypeLabel(m.type)}</span>
          <span>{m.difficulty === 'HARDCORE' ? 'Hardcore' : 'Standard'}</span>
          <span>{formatRelativeTime(m.startedAt || m.endedAt)}</span>
        </p>
      </div>
      <div className="match-result">
        <span className="score tnum">{scoreText(m)}</span>
        {hasDelta && <span className="rating-change tnum">{signed(m.ratingChange)}</span>}
      </div>
    </Link>
  );
}
