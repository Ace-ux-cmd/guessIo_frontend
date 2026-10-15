import Icon from '../ui/Icon';

/** One line of players: dot, name, rounds won. The active player is highlighted. */
export default function Scoreboard({ players, score, activePlayerId, disconnectedPlayerIds = [], activeNote = 'guessing', myUserId }) {
  return (
    <section className="flex items-center gap-4 px-4 mt-1 text-xs flex-wrap" aria-label="Scores">
      {players.map((p) => {
        const on = activePlayerId === p.userId;
        const gone = disconnectedPlayerIds.includes(p.userId);
        return (
          <div key={p.userId} className={`flex items-center gap-1.5 ${on ? 'text-ink' : 'text-mute'} ${gone ? 'opacity-60' : ''}`}>
            <span className={`w-2 h-2 rounded-full ${on ? 'bg-g' : 'bg-line'}`} />
            <span className="font-semibold">{p.username}</span>
            {gone && <Icon name="wifioff" className="w-3.5 h-3.5 text-bad" />}
            {on && p.userId !== myUserId && <span className="text-mute">{activeNote}</span>}
            <span className={`font-display font-bold tnum ${on ? 'text-g' : ''}`}>{score[p.userId] ?? 0}</span>
          </div>
        );
      })}
    </section>
  );
}
