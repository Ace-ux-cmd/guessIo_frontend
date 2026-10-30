/** Rating, points and matches in one card, plus the win/draw/loss bar. Shared by your profile and other players'. */
export default function ProfileStats({ profile }) {
  const stats = profile?.statistics;
  const played = stats?.matchesPlayed ?? 0;
  const won = stats?.matchesWon ?? 0;
  const drawn = stats?.matchesDrawn ?? 0;
  const lost = stats?.matchesLost ?? 0;
  const winRate = played ? Math.round((won / played) * 100) : null;
  return (
    <>
      <section className="card a-g mt-5 grid grid-cols-3 p-4 text-center">
        {[['Rating', (profile?.rating ?? 0).toLocaleString()], ['Points', (profile?.points ?? 0).toLocaleString()], ['Matches', played.toLocaleString()]].map(([label, value]) => (
          <div key={label}>
            <p className="font-display text-2xl font-bold tnum">{value}</p>
            <p className="text-xs text-mute">{label}</p>
          </div>
        ))}
      </section>
      <section className="card mt-5 p-4">
        <div className="flex justify-between text-sm font-bold">
          <span>{won} wins</span><span>{drawn} draws</span><span>{lost} losses</span>
        </div>
        <div className="mt-2 flex h-3 gap-0.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${won} wins, ${drawn} draws, ${lost} losses`}>
          {played > 0 && (
            <>
              <i style={{ flex: won, background: '#8DFF39' }} />
              <i style={{ flex: drawn, background: '#00E5FF' }} />
              <i style={{ flex: lost, background: '#FF506E' }} />
            </>
          )}
        </div>
        <p className="mt-2 text-sm">Win rate {winRate !== null ? `${winRate}%` : '-'}</p>
      </section>
    </>
  );
}
