import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import BottomNav from '../../components/ui/BottomNav';
import PlayerSheet from '../../components/social/PlayerSheet';
import { PageSkeleton, ErrorState, EmptyState } from '../../components/ui/Feedback';
import * as leaderboardsApi from '../../api/leaderboards.api';
import { useAuthStore } from '../../stores/authStore';

// Second, first, third: the order the podium stands in, left to right.
const PODIUM_ORDER = [1, 0, 2];
const TABS = [['rating', 'Ratings'], ['points', 'Points']];

const initialOf = (name) => (name || '?').charAt(0).toUpperCase();
const avatarProps = (url) => (url ? { className: 'avatar-img', style: { backgroundImage: `url(${url})` } } : {});

export default function Leaderboards() {
  const [type, setType] = useState('rating');
  const [selected, setSelected] = useState(null);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['leaderboard', type],
    queryFn: () => (type === 'rating' ? leaderboardsApi.getRatingLeaderboard() : leaderboardsApi.getPointsLeaderboard()),
  });

  // The board is the top 20; your own rank is shown separately below it.
  const items = (data?.items || []).slice(0, 20);
  const me = data?.me || null;
  const unit = type === 'rating' ? 'rating' : 'points';
  const rest = items.slice(3);

  if (isLoading) return (<><PageSkeleton cards={5} />{isAuthenticated && <BottomNav />}</>);

  return (
    <>
      <main className="app">
        <header className="topbar">
          <div>
            <p className="eyebrow">guessIo leaderboard</p>
            <h1>Leaderboard</h1>
          </div>
        </header>

        <section className="podium-wrap">
          <div className="leaderboard-tabs" role="tablist" aria-label="Leaderboard type">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={type === key}
                className={`leaderboard-tab${type === key ? ' active' : ''}`}
                onClick={() => setType(key)}
              >
                {label}
              </button>
            ))}
          </div>

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
                    <div className="avatar rank-variant" role="img" aria-label={`${e.username} avatar`} {...avatarProps(e.avatarUrl)}>
                      {!e.avatarUrl && initialOf(e.username)}
                    </div>
                    <button type="button" className="podium-name rank-link" onClick={() => setSelected(e)}>{e.username}</button>
                    <span className="podium-rating"><strong className="tnum">{Number(e.value).toLocaleString()}</strong> <span className="metric-label">{unit}</span></span>
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
                        <span className="mini-avatar" aria-hidden="true" {...avatarProps(e.avatarUrl)}>{!e.avatarUrl && initialOf(e.username)}</span>
                        <div className="rank-details">
                          {mine ? (
                            <strong>{e.username} (you)</strong>
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

            {isAuthenticated && me && (
              <section className="your-rank" aria-labelledby="your-rank-title">
                <div className="section-heading rank-variant">
                  <h2 className="section-title rank-variant" id="your-rank-title">Your rank</h2>
                  <span className="section-count">Keep climbing</span>
                </div>
                <article className="your-card">
                  <span className="you-label">You</span>
                  <span className="rank-number">{me.rank}</span>
                  <span className="mini-avatar" aria-hidden="true" {...avatarProps(me.avatarUrl)}>{!me.avatarUrl && initialOf(me.username)}</span>
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
