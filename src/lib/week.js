/** "Ends Mon 9 Nov, 01:00" in the player's own time zone, and a short countdown. */
export function formatWeekEnd(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(d);
  return `${day}, ${time}`;
}

export function formatTimeLeft(iso, now = Date.now()) {
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return 'now';
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${Math.max(1, minutes)}m`;
}

/** "1 more ranked match" / "2 more ranked matches". */
export function matchesNeededText(n) {
  return `${n} more ranked ${n === 1 ? 'match' : 'matches'} to unlock your rank`;
}

/** "Oct 19" for a week id such as "2026-10-19" (the Monday the week started, UTC). */
export function formatWeekOf(weekId) {
  const d = new Date(`${weekId}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return weekId;
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
}
