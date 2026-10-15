// Presentation helpers shared by the match screens. Pure formatting only -
// every value comes from the backend response.

export function formatRelativeTime(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export function matchTypeLabel(type) {
  if (type === 'RANKED') return 'Ranked';
  if (type === 'PRIVATE') return 'Private';
  return 'Casual';
}

/** { label, text, sign } for a match list item's outcome (WIN | LOSS | DRAW | CANCELLED). */
export function outcomeInfo(outcome) {
  if (outcome === 'WIN') return { label: 'Victory', text: 'text-g' };
  if (outcome === 'LOSS') return { label: 'Defeat', text: 'text-bad' };
  if (outcome === 'CANCELLED') return { label: 'Cancelled', text: 'text-mute' };
  return { label: 'Draw', text: 'text-warn' };
}

/** "John", "John and Mike", "Mike, Priya and Leo" */
export function joinNames(names) {
  const list = (names || []).filter(Boolean);
  if (list.length <= 1) return list[0] || '';
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

/** "2–1" from a match list item (my rounds won vs best opponent's). */
export function scoreText(match) {
  const mine = match.myRoundsWon ?? 0;
  const best = (match.opponents || []).reduce((max, o) => Math.max(max, o.roundsWon ?? 0), 0);
  return `${mine}–${best}`;
}

export function signed(n) {
  if (n == null) return '—';
  return `${n > 0 ? '+' : ''}${n}`;
}
