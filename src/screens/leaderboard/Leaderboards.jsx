import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import BottomNav from '../../components/ui/BottomNav';
import Avatar from '../../components/ui/Avatar';
import PlayerSheet from '../../components/social/PlayerSheet';
import { PageSkeleton, ErrorState, EmptyState } from '../../components/ui/Feedback';
import * as leaderboardsApi from '../../api/leaderboards.api';
import { useAuthStore } from '../../stores/authStore';
import { formatWeekEnd, formatTimeLeft, matchesNeededText } from '../../lib/week';

// Second, first, third: the order the podium stands in, left to right.
const PODIUM_ORDER = [1, 0, 2];

export default function Leaderboards() {
  const [selected, setSelected] = useState(null);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['leaderboard', 'rating'],
    queryFn: () => leaderboardsApi.getRatingLeaderboard(),
  });

  // The board is the top 20; your own rank is shown separately below it.
  const items = (data?.items || []).slice(0, 20);
  const me = data?.me || null;
  const rest = items.slice(3);
  const week = data?.week ?? null;
  // A human below the weekly minimum has no rank: the server sends rank null and how many matches are left.
  const rankLocked = me && me.eligible === false;

  if (isLoading) return (<><PageSkeleton cards={5} />{isAuthenticated && <BottomNav />}</>);

  return (
    <>
      <main className="app">
        <header className="topbar">
          <div>
            <h1>Leaderboard</h1>
            {week && (
              <p className="week-note" data-testid="week-end">
                Resets {formatWeekEnd(week.weekEndsAt)} <span className="week-left">({formatTimeLeft(week.weekEndsAt)} left)</span>
              </p>
            )}
          </div>
        </header>

        <section className="podium-wrap">
          {isError ? (
            <div className="mt-4"><ErrorState description="Could not load the leaderboard." /></div>
          ) : items.length === 0 ? (
            <div className="mt-4"><EmptyState title="No rankings yet" description="Play some matches to appear here." /></div>
          ) : (
            <div className="podium rank-variant" role="list" aria-label="Top three players">
              {PODIUM_ORDER.map((index) => {
                const e = items[index];
                if (!e) return <div key={index} role="presentation" />;
                const first = index === 0;
                return (
                  <article key={e.userId} role="listitem" className={`podium-player${first ? ' center' : ''}`}>
                    {first && <span className="crown rank-variant" aria-label="First place">&#9819;</span>}
                    <Avatar
                      name={e.username}
                      url={e.avatarUrl}
                      size={first ? 80 : 62}
                      className="avatar rank-variant"
                      ringColor={index === 0 ? '#FFBA37' : index === 2 ? '#CD7F32' : '#C0C0C0'}
                    />
                    {e.isBot ? (
                      <span className="podium-name">{e.username}</span>
                    ) : (
                      <button type="button" className="podium-name rank-link" onClick={() => setSelected(e)}>{e.username}</button>
                    )}
                    <span className="podium-rating"><strong className="tnum">{Number(e.value).toLocaleString()}</strong> <span className="metric-label">rating</span></span>
                    <div className="podium-block">{index + 1}</div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {!isError && items.length > 0 && (
          <section className="leaderboard" aria-labelledby="players-title">
            {rest.length > 0 && (
              <>
                <div className="section-heading rank-variant">
                  <h2 className="section-title rank-variant" id="players-title">Top {items.length} players</h2>
                  <span className="section-count">Top 20</span>
                </div>
                <ol className="player-list">
                  {rest.map((e) => {
                    const mine = e.userId === user?.id;
                    return (
                      <li key={e.userId} className={`rank-card${mine ? ' mine' : ''}`}>
                        <span className="rank-number">{String(e.rank).padStart(2, '0')}</span>
                        <Avatar name={e.username} url={e.avatarUrl} size={34} className="mini-avatar" />
                        <div className="rank-details">
                          {mine ? (
                            <strong>{e.username} (you)</strong>
                          ) : e.isBot ? (
                            <strong>{e.username}</strong>
                          ) : (
                            <strong><button type="button" className="rank-link" onClick={() => setSelected(e)}>{e.username}</button></strong>
                          )}
                        </div>
                        <div className="rating tnum">{Number(e.value).toLocaleString()}</div>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}

            {isAuthenticated && rankLocked && (
              <section className="your-rank" aria-labelledby="your-rank-title">
                <div className="section-heading rank-variant">
                  <h2 className="section-title rank-variant" id="your-rank-title">Your rank</h2>
                  <span className="section-count">Locked</span>
                </div>
                <article className="locked-rank" data-testid="locked-rank">
                  <span className="locked-rank-mark" aria-hidden="true">?</span>
                  <div className="rank-details">
                    <strong>{matchesNeededText(me.matchesNeeded)}</strong>
                    <small>Every match counts toward your rating from the first one. {me.matchesPlayed} played this week.</small>
                  </div>
                  <div className="rating tnum" aria-label="Your rating this week">{Number(me.value).toLocaleString()}</div>
                </article>
              </section>
            )}

            {isAuthenticated && me && !rankLocked && me.rank != null && (
              <section className="your-rank" aria-labelledby="your-rank-title">
                <div className="section-heading rank-variant">
                  <h2 className="section-title rank-variant" id="your-rank-title">Your rank</h2>
                  <span className="section-count">Keep climbing</span>
                </div>
                <article className="your-card">
                  <span className="you-label">You</span>
                  <span className="rank-number">{me.rank}</span>
                  <Avatar name={me.username} url={me.avatarUrl} size={38} className="mini-avatar" />
                  <div className="rank-details"><strong>{me.username}</strong></div>
                  <div className="rating tnum">{Number(me.value).toLocaleString()}</div>
                </article>
              </section>
            )}
          </section>
        )}
      </main>
      {selected && <PlayerSheet player={selected} onClose={() => setSelected(null)} />}
      {isAuthenticated && <BottomNav />}
    </>
  );
}
