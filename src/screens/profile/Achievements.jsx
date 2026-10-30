import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { ICONS } from '../../components/ui/icons';
import { PageSkeleton, ErrorState } from '../../components/ui/Feedback';
import { useAchievements } from '../../hooks/useAuth';

function Row({ a }) {
  const when = a.unlockedAt ? new Date(a.unlockedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : null;
  return (
    <article className={`achievement achievements-variant${a.unlocked ? '' : ' locked'}`}>
      <span className="badge achievements-variant" aria-hidden="true">
        <Icon name={a.unlocked ? (ICONS[a.icon] ? a.icon : 'star') : 'lock'} className="h-4 w-4" />
      </span>
      <span className="achievement-copy"><strong>{a.title}</strong><span>{a.description}</span></span>
      <span className="status">{a.unlocked ? (when ? `Done ${when}` : 'Done') : 'Locked'}</span>
    </article>
  );
}

function Shell({ children }) {
  return (
    <main className="app" style={{ display: 'flex', flexDirection: 'column' }}>
      <header className="topbar with-back leading">
        <Link to="/profile" replace aria-label="Back" className="back">&larr;</Link>
        <div>
          <p className="eyebrow">Profile</p>
          <h1>Achievements</h1>
        </div>
      </header>
      {children}
    </main>
  );
}

export default function Achievements() {
  const { data, isLoading, isError } = useAchievements();
  const list = data?.achievements || [];
  const unlocked = list.filter((a) => a.unlocked);
  const locked = list.filter((a) => !a.unlocked);
  const pct = list.length ? Math.round((unlocked.length / list.length) * 100) : 0;

  if (isLoading) return <PageSkeleton cards={5} />;

  return (
    <Shell>
      <div className="content achievements-variant">
        {isError ? (
          <ErrorState description="Could not load achievements." />
        ) : (
          <>
            <section className="progress-card" aria-label="Achievement progress">
              <div className="progress-copy">
                <strong>Achievement progress</strong>
                <span className="tnum">{unlocked.length} / {list.length}</span>
              </div>
              <div
                className="progress-track"
                style={{ '--pct': `${pct}%` }}
                role="progressbar"
                aria-valuenow={unlocked.length}
                aria-valuemin={0}
                aria-valuemax={list.length}
                aria-label="Achievements unlocked"
              />
              <p>{locked.length > 0 ? 'Keep cracking codes to unlock the next badge.' : 'Every badge unlocked.'}</p>
            </section>

            {unlocked.length > 0 && (
              <section className="section" aria-labelledby="unlocked-title">
                <h2 className="section-title" id="unlocked-title">Unlocked</h2>
                <div className="achievement-list achievements-variant">{unlocked.map((a) => <Row key={a.key} a={a} />)}</div>
              </section>
            )}

            {locked.length > 0 && (
              <section className="section" aria-labelledby="locked-title">
                <h2 className="section-title" id="locked-title">Next milestones</h2>
                <div className="achievement-list achievements-variant">{locked.map((a) => <Row key={a.key} a={a} />)}</div>
              </section>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
