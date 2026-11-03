import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Sheet from '../ui/Sheet';
import Avatar from '../ui/Avatar';
import PlayerSheet from './PlayerSheet';
import { getWeeklyRecap, markWeeklyRecapSeen } from '../../api/leaderboards.api';
import { useFeatures } from '../../hooks/useFeatures';
import { formatWeekOf } from '../../lib/week';

const PLACE = { 1: 'First', 2: 'Second', 3: 'Third' };

/**
 * Shown once, on the first app open after the weekly reset: last week's top 3,
 * the player's own finish if they made the top 10, and a tap through to a
 * read-only profile. The server remembers what has been seen, so a second open
 * (or another device) gets nothing. A blocked player is listed but not tappable.
 */
export default function WeeklyRecap({ canShow = true }) {
  const { weeklyLeaderboard } = useFeatures();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const markedRef = useRef(null);
  const { data: recap } = useQuery({
    queryKey: ['weeklyRecap'],
    queryFn: getWeeklyRecap,
    enabled: weeklyLeaderboard && canShow,
    retry: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const seen = useMutation({ mutationFn: (weekId) => markWeeklyRecapSeen(weekId) });

  useEffect(() => {
    if (recap && canShow) setOpen(true);
  }, [recap, canShow]);

  // Counted as seen the moment it is shown, so closing the tab does not bring it back.
  useEffect(() => {
    if (open && recap && markedRef.current !== recap.weekId) {
      markedRef.current = recap.weekId;
      seen.mutate(recap.weekId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recap]);

  if (!recap) return null;

  return (
    <>
      <Sheet open={open && !selected} onClose={() => setOpen(false)} title="Last week's top players" accent="p">
        <p className="mt-1 text-sm text-mute">Week of {formatWeekOf(recap.weekId)}. Ratings start again from zero.</p>
        <ol className="recap-list mt-4" aria-label="Top three">
          {recap.top.map((entry) => {
            const body = (
              <>
                <span className="recap-place" aria-hidden="true">{entry.position}</span>
                <Avatar name={entry.displayName} url={entry.avatarUrl} size={40} />
                <span className="recap-name">
                  <b>{entry.displayName}</b>
                  <small>{PLACE[entry.position]} place</small>
                </span>
                <span className="recap-rating tnum">{Number(entry.rating).toLocaleString()}</span>
              </>
            );
            return (
              <li key={entry.position}>
                {entry.openable ? (
                  <button type="button" className="recap-row" onClick={() => setSelected({ userId: entry.userId, username: entry.displayName, handle: entry.handle, avatarUrl: entry.avatarUrl })}>
                    {body}
                  </button>
                ) : (
                  <div className="recap-row static">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
        {recap.me && recap.me.position > 3 && (
          <p className="recap-own" role="status">You finished {recap.me.position}th with {Number(recap.me.rating).toLocaleString()}.</p>
        )}
        {recap.me && recap.me.position <= 3 && (
          <p className="recap-own" role="status">You finished on the podium. Well played.</p>
        )}
        <button type="button" className="btn mt-5 w-full" onClick={() => setOpen(false)}>Start the new week</button>
      </Sheet>
      {selected && <PlayerSheet player={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
