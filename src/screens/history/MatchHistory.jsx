import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import BottomNav from '../../components/ui/BottomNav';
import Icon from '../../components/ui/Icon';
import { LoadingScreen, ErrorState, EmptyState } from '../../components/ui/Feedback';
import * as matchesApi from '../../api/matches.api';
import { formatRelativeTime, joinNames, matchTypeLabel, scoreText, signed } from '../../lib/format';

const FILTERS = ['All', 'Ranked', 'Casual', 'Wins', 'Losses'];
const PAGE_SIZE = 20;
const CHIP = 'inline-flex items-center h-6 px-2 rounded text-xs font-semibold border text-mute border-line';

function dateGroupLabel(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const same = (a, b) => a.toDateString() === b.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (same(date, now)) return 'Today';
  if (same(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function outcomeView(m) {
  if (m.outcome === 'WIN') return { bar: 'bg-g', text: 'text-g', label: 'Win', delta: 'text-g' };
  if (m.outcome === 'LOSS') return { bar: 'bg-bad', text: 'text-bad', label: m.myForfeited ? 'Forfeit' : 'Loss', delta: 'text-bad' };
  if (m.outcome === 'CANCELLED') return { bar: 'bg-mute', text: 'text-mute', label: 'Cancelled', delta: 'text-mute' };
  return { bar: 'bg-mute', text: 'text-mute', label: 'Draw', delta: 'text-mute' };
}

export default function MatchHistory() {
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['matches', page],
    queryFn: () => matchesApi.listMatches({ page, pageSize: PAGE_SIZE }),
    // Keep prior pages visible while the next one loads.
    placeholderData: (prev) => prev,
  });

  // Matches accumulate across pages as "Load more" is pressed.
  const [allMatches, setAllMatches] = useState([]);
  useEffect(() => {
    // While the next page loads, `data` is still the previous page (see
    // placeholderData above); appending it again would duplicate its rows.
    if (!data || isPlaceholderData) return;
    setAllMatches((prev) => {
      if (page === 1) return data.items;
      const seen = new Set(prev.map((m) => m.id));
      return [...prev, ...data.items.filter((m) => !seen.has(m.id))];
    });
  }, [data, page, isPlaceholderData]);

  // No total/hasMore field is documented on this endpoint, so a full page
  // coming back is the heuristic for "more may exist" (unchanged).
  const hasMore = (data?.items?.length ?? 0) === PAGE_SIZE;

  const filtered = useMemo(() => {
    switch (filter) {
      case 'Ranked': return allMatches.filter((m) => m.type === 'RANKED');
      case 'Casual': return allMatches.filter((m) => m.type === 'CASUAL');
      case 'Wins': return allMatches.filter((m) => m.outcome === 'WIN');
      case 'Losses': return allMatches.filter((m) => m.outcome === 'LOSS');
      default: return allMatches;
    }
  }, [allMatches, filter]);

  const grouped = useMemo(() => {
    const groups = new Map();
    for (const m of filtered) {
      const label = dateGroupLabel(m.startedAt || m.endedAt);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(m);
    }
    return groups;
  }, [filtered]);

  return (
    <>
      <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col pb-24">
        <header className="px-5 pt-5 pb-3"><h1 className="text-2xl font-bold">Matches</h1></header>

        <div className="flex gap-2 overflow-x-auto px-5 pb-3" role="group" aria-label="Filter matches">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`shrink-0 h-9 px-4 rounded-full border text-sm font-semibold ${filter === f ? 'border-g bg-s2 text-g' : 'border-line'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {isLoading ? <LoadingScreen /> : isError ? (
          <div className="px-5"><ErrorState description="Could not load match history." /></div>
        ) : filtered.length === 0 ? (
          <div className="px-5"><EmptyState title="No matches yet" description="Your match history shows up here after your first game." /></div>
        ) : (
          <section className="px-5 space-y-2">
            {[...grouped.entries()].map(([label, matches], gi) => (
              <div key={label} className="space-y-2">
                <h2 className={`text-sm font-semibold text-mute ${gi === 0 ? 'pt-1' : 'pt-3'}`}>{label}</h2>
                {matches.map((m) => {
                  const v = outcomeView(m);
                  return (
                    <Link key={m.id} to={`/history/${m.id}`} replace className="flex items-center gap-3 pr-4 bg-s1 rounded-md overflow-hidden">
                      <span className={`w-1 self-stretch ${v.bar}`} />
                      <div className="flex-1 py-3 min-w-0">
                        <div className="font-semibold truncate">
                          <span className={v.text}>{v.label}</span> against {joinNames(m.opponents.map((o) => o.username).filter(Boolean)).replace(' and ', ', ')}
                        </div>
                        <div className="mt-0.5 flex gap-1.5 flex-wrap">
                          <span className={CHIP}>{matchTypeLabel(m.type)}</span>
                          {m.difficulty && <span className={CHIP}>{m.difficulty === 'HARDCORE' ? 'Hardcore' : 'Standard'}</span>}
                          <span className="text-xs text-mute self-center">{formatRelativeTime(m.startedAt || m.endedAt)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {m.ratingChange !== null && m.ratingChange !== undefined && (
                          <div className={`font-bold tnum ${v.delta}`}>{signed(m.ratingChange)}</div>
                        )}
                        <div className="text-xs text-mute tnum">{scoreText(m).replace('–', ' to ')}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
            {hasMore && (
              <button type="button" onClick={() => setPage((p) => p + 1)} disabled={isFetching} className="w-full h-11 text-sm font-semibold text-mute inline-flex items-center justify-center gap-1">
                {isFetching ? 'Loading…' : <>Load more<Icon name="down" className="w-4 h-4" /></>}
              </button>
            )}
          </section>
        )}
      </main>
      <BottomNav />
    </>
  );
}
