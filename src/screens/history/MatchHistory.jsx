import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import MatchCard from '../../components/ui/MatchCard';
import BottomNav from '../../components/ui/BottomNav';
import Icon from '../../components/ui/Icon';
import { PageSkeleton, ErrorState, EmptyState } from '../../components/ui/Feedback';
import * as matchesApi from '../../api/matches.api';

const FILTERS = ['All', 'Ranked', 'Casual', 'Wins', 'Losses'];
const PAGE_SIZE = 20;

function dateGroupLabel(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const same = (a, b) => a.toDateString() === b.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (same(date, now)) return 'Today';
  if (same(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
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

  if (isLoading) return (<><PageSkeleton cards={5} /><BottomNav /></>);

  return (
    <>
      <main className="app">
        <header className="topbar">
          <div>
            <h1 className="sr-only">Matches</h1>
            <p className="eyebrow">Match history</p>
          </div>
        </header>

        <div className="filters" role="tablist" aria-label="Match filters">
          {FILTERS.map((f) => (
            <button key={f} type="button" role="tab" aria-selected={filter === f} className={`filter${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>

        <section className="history matches-variant" aria-label="Matches grouped by date">
          {isError ? (
            <ErrorState description="Could not load match history." />
          ) : filtered.length === 0 ? (
            <EmptyState title="No matches here yet" description="Play one and it shows up." />
          ) : (
            <>
              {[...grouped.entries()].map(([label, matches], i) => (
                <section key={label} className="date-group" aria-labelledby={`group-${i}`}>
                  <div className="date-heading">
                    <h2 id={`group-${i}`}>{label}</h2>
                    <span>{matches.length} {matches.length === 1 ? 'match' : 'matches'}</span>
                  </div>
                  <div className="match-list">
                    {matches.map((m) => <MatchCard key={m.id} match={m} />)}
                  </div>
                </section>
              ))}
              {hasMore && (
                <button type="button" onClick={() => setPage((p) => p + 1)} disabled={isFetching} className="load-more">
                  {isFetching ? 'Loading...' : <>Load more<Icon name="down" className="h-4 w-4" /></>}
                </button>
              )}
            </>
          )}
        </section>
      </main>
      <BottomNav />
    </>
  );
}
