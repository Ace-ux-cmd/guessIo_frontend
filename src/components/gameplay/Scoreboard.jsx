import Avatar from '../ui/Avatar';

/** One card per player: initials, name, rounds won. The player on turn is highlighted. */
export default function Scoreboard({ players, score, activePlayerId, disconnectedPlayerIds = [], activeNote = 'guessing', myUserId }) {
  return (
    <section className="scoreboard" aria-label="Round scoreboard" style={{ gridTemplateColumns: `repeat(${Math.max(players.length, 1)}, minmax(0, 1fr))` }}>
      {players.map((p) => {
        const on = activePlayerId === p.userId;
        const gone = disconnectedPlayerIds.includes(p.userId);
        return (
          <article key={p.userId} className={`score-card${on ? ' active' : ''}${gone ? ' away' : ''}`}>
            <Avatar name={p.username} url={p.avatarUrl} size={24} className="score-avatar" active={on} />
            <span className="score-name">{p.username}{p.userId === myUserId ? ' (you)' : ''}</span>
            {gone && <span className="sr-only">disconnected</span>}
            {on && p.userId !== myUserId && <span className="sr-only">{activeNote}</span>}
            <strong className="score-value tnum">{score[p.userId] ?? 0}</strong>
          </article>
        );
      })}
    </section>
  );
}
