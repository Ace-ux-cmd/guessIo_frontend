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
  if (type === 'PRIVATE') return 'Custom';
  return 'Casual';
}

/** "John", "John and Mike", "Mike, Priya and Leo" */
export function joinNames(names) {
  const list = (names || []).filter(Boolean);
  if (list.length <= 1) return list[0] || '';
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

/** "2 - 1" from a match list item (my rounds won vs best opponent's). */
export function scoreText(match) {
  const mine = match.myRoundsWon ?? 0;
  const best = (match.opponents || []).reduce((max, o) => Math.max(max, o.roundsWon ?? 0), 0);
  return `${mine} - ${best}`;
}

export function signed(n) {
  if (n == null) return '-';
  return `${n > 0 ? '+' : ''}${n}`;
}

/**
 * Rating before and after a match, e.g. { text: '1250 \u2192 1268', tone: 'text-g', change: 18 }.
 * A rating never goes below 0, so the new value is floored there and `change` is the
 * change that really applies (a player on 0 who loses shows 0 \u2192 0, change 0).
 * The tone colours the whole string (gain green, loss red, no change plain), so the
 * old value, the arrow and the new value always read as one thing. When the server
 * sent no change for this player only the old rating is shown. Returns null when
 * the rating before the match is unknown.
 */
export function ratingTransition(before, delta) {
  if (typeof before !== 'number') return null;
  if (typeof delta !== 'number') return { text: String(before), tone: '', change: undefined };
  const after = Math.max(0, before + delta);
  const change = after - before;
  const tone = change > 0 ? 'text-g' : change < 0 ? 'text-[#FF6B6B]' : '';
  return { text: `${before} \u2192 ${after}`, tone, change };
}
