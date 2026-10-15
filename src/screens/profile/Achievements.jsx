import { Link } from 'react-router-dom';
import BottomNav from '../../components/ui/BottomNav';
import Icon from '../../components/ui/Icon';
import AchievementBadge from '../../components/achievements/AchievementBadge';
import { LoadingScreen, ErrorState } from '../../components/ui/Feedback';
import { useAchievements } from '../../hooks/useAuth';

function Row({ a }) {
  return (
    <div className="surface rounded-xl border border-line p-4">
      <div className="flex items-center gap-3">
        <AchievementBadge icon={a.icon} unlocked={a.unlocked} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{a.title}</div>
          <div className="text-sm text-mute">{a.description}</div>
        </div>
        {a.unlocked && <Icon name="check" className="w-4 h-4 text-g" />}
      </div>
    </div>
  );
}

export default function Achievements() {
  const { data, isLoading, isError } = useAchievements();
  const list = data?.achievements || [];
  const unlocked = list.filter((a) => a.unlocked);
  const locked = list.filter((a) => !a.unlocked);
  const pct = list.length ? Math.round((unlocked.length / list.length) * 100) : 0;

  return (
    <>
      <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col pb-24">
        <header className="flex items-center gap-1 px-4 pt-5">
          <Link to="/profile" replace className="p-2 text-mute" aria-label="Back"><Icon name="back" /></Link>
        </header>
        {isLoading ? <LoadingScreen /> : isError ? (
          <div className="px-5"><ErrorState description="Could not load achievements." /></div>
        ) : (
          <section className="px-5 mt-7">
            <div className="flex items-end justify-between">
              <h1 className="text-xl font-bold">Achievements</h1>
              <span className="text-sm text-mute tnum">{unlocked.length} of {list.length} unlocked</span>
            </div>
            <div className="mt-3 h-2 rounded bg-s2 overflow-hidden"><span className="block h-full bg-g" style={{ width: `${pct}%` }} /></div>
            {unlocked.length > 0 && (<><h2 className="mt-6 mb-2 text-xs font-semibold text-mute">Unlocked</h2><div className="space-y-2.5">{unlocked.map((a) => <Row key={a.key} a={a} />)}</div></>)}
            {locked.length > 0 && (<><h2 className="mt-6 mb-2 text-xs font-semibold text-mute">Locked</h2><div className="space-y-2.5">{locked.map((a) => <Row key={a.key} a={a} />)}</div></>)}
          </section>
        )}
      </main>
      <BottomNav active="/profile" />
    </>
  );
}
