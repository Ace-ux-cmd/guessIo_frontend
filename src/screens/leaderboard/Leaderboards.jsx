import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import BottomNav from '../../components/ui/BottomNav';
import Avatar from '../../components/ui/Avatar';
import Icon from '../../components/ui/Icon';
import { LoadingScreen, ErrorState, EmptyState } from '../../components/ui/Feedback';
import * as leaderboardsApi from '../../api/leaderboards.api';
import { useAuthStore } from '../../stores/authStore';

export default function Leaderboards() {
  const [type, setType] = useState('rating');
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['leaderboard', type],
    queryFn: () => (type === 'rating' ? leaderboardsApi.getRatingLeaderboard() : leaderboardsApi.getPointsLeaderboard()),
  });

  const items = data?.items || [];
  const me = data?.me || null;
  const valueLabel = type === 'rating' ? 'rating' : 'points';
  const [first, second, third] = items;
  const rest = items.slice(3);

  return (
    <>
      <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col pb-24">
        <header className="px-4 pt-5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Link to="/dashboard" replace className="p-2 text-mute" aria-label="Back"><Icon name="back" /></Link>
            <h1 className="text-xl font-bold">Leaderboard</h1>
          </div>
          <div className="flex rounded-lg bg-s1 p-0.5 text-sm font-semibold" role="tablist" aria-label="Ranking type">
            {[['rating', 'Rating'], ['points', 'Points']].map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={type === key} onClick={() => setType(key)} className={`px-3 py-1 rounded-md ${type === key ? 'bg-s2' : 'text-mute'}`}>{label}</button>
            ))}
          </div>
        </header>

        {isLoading ? <LoadingScreen /> : isError ? (
          <div className="px-5"><ErrorState description="Could not load the leaderboard." /></div>
        ) : items.length === 0 ? (
          <div className="px-5 mt-4"><EmptyState title="No rankings yet" description="Play some matches to appear here." /></div>
        ) : (
          <>
            <section className="relative mt-2 px-5 pt-6 overflow-hidden">
              <div className="spot absolute inset-x-0 top-0 h-[320px] pointer-events-none" />
              <div className="relative flex items-end gap-2">
                {second ? (
                  <div className="col flex-1 flex flex-col items-center" style={{ '--d': '0.15s' }}>
                    <Avatar name={second.username} size={48} url={second.avatarUrl} />
                    <span className="mt-2 font-semibold text-sm truncate max-w-full">{second.username}</span>
                    <span className="text-xs text-mute tnum">{second.value}</span>
                    <div className="ped ped2 w-full mt-2" style={{ height: 96 }}>2</div>
                  </div>
                ) : <div className="flex-1" />}
                <div className="col flex-1 flex flex-col items-center" style={{ '--d': '0.4s' }}>
                  <span className="text-xs font-bold text-g mb-1">#1</span>
                  <div className="ring1"><Avatar name={first.username} size={72} url={first.avatarUrl} /></div>
                  <span className="mt-2 font-semibold text-base truncate max-w-full">{first.username}</span>
                  <span className="font-display font-black text-xl text-g tnum">{first.value}</span>
                  <div className="ped ped1 w-full mt-2" style={{ height: 148 }}>1</div>
                </div>
                {third ? (
                  <div className="col flex-1 flex flex-col items-center" style={{ '--d': '0s' }}>
                    <Avatar name={third.username} size={48} url={third.avatarUrl} />
                    <span className="mt-2 font-semibold text-sm truncate max-w-full">{third.username}</span>
                    <span className="text-xs text-mute tnum">{third.value}</span>
                    <div className="ped ped3 w-full mt-2" style={{ height: 68 }}>3</div>
                  </div>
                ) : <div className="flex-1" />}
              </div>
              <div className="h-px bg-line" />
            </section>

            <section className="px-5 mt-4 space-y-1.5">
              {rest.map((e) => {
                const mine = e.userId === user?.id;
                return (
                  <div key={e.userId} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${mine ? 'bg-g/20 ring-1 ring-g' : 'bg-s1'}`}>
                    <span className={`tile ${mine ? 'c h-8 min-w-[32px] px-1.5' : 'w-8 h-8'} text-xs`}>{e.rank}</span>
                    <Avatar name={e.username} size={32} url={e.avatarUrl} />
                    <span className="flex-1 font-semibold truncate">{e.username}{mine ? ' (you)' : ''}</span>
                    <span className="font-bold tnum">{e.value}</span>
                  </div>
                );
              })}
            </section>

            {isAuthenticated && me && (
              <section className="px-5 mt-5" aria-label="Your position">
                <div className="flex items-center gap-2 text-xs text-mute mb-2">
                  <span className="h-px flex-1 bg-line" />Your position<span className="h-px flex-1 bg-line" />
                </div>
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-g/20 ring-1 ring-g">
                  <span className="tile c h-8 min-w-[32px] px-1.5 text-xs">{me.rank}</span>
                  <Avatar name={me.username} size={32} url={me.avatarUrl} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{me.username} (you)</div>
                    <div className="text-xs text-mute">Rank #{me.rank}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tnum">{me.value}</div>
                    <div className="text-xs text-mute">{valueLabel}</div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
      {isAuthenticated && <BottomNav />}
    </>
  );
}
