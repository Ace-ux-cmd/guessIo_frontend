import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BottomNav from '../../components/ui/BottomNav';
import Icon from '../../components/ui/Icon';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import GuessInput from '../../components/gameplay/GuessInput';
import { PageSkeleton, ErrorState, Banner } from '../../components/ui/Feedback';
import * as dailyApi from '../../api/daily.api';
import { getErrorMessage } from '../../api/client';

const fmtMs = (ms) => (ms == null ? '-' : ms >= 60000 ? `${Math.floor(ms / 60000)}m ${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}s` : `${(ms / 1000).toFixed(1)}s`);

function states(feedback, length) {
  return Array.from({ length }, (_, i) => {
    const cell = feedback?.cellFeedback?.[i];
    return cell === 'CORRECT_POSITION' ? 'c' : cell === 'WRONG_POSITION' ? 'p' : 'w';
  });
}

/** Counts up from the server's start time, corrected for the gap between this device's clock and the server's. */
function useElapsed(startedAt, serverNow, running) {
  const skew = useMemo(() => (serverNow ? Date.now() - new Date(serverNow).getTime() : 0), [serverNow]);
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!startedAt || !running) return undefined;
    const tick = () => setMs(Math.max(0, Date.now() - skew - new Date(startedAt).getTime()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [startedAt, skew, running]);
  return ms;
}

function useCountdown(iso) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    if (!iso) return undefined;
    const tick = () => {
      const s = Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
      setLeft(`${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [iso]);
  return left;
}

const OUTCOME_COLOR = { HIT: '#8DFF39', MISS: '#FF506E', BASELINE: '#00E5FF' };
const OUTCOME_LABEL = { HIT: 'faster', MISS: 'missed', BASELINE: 'first time set' };

function Calendar({ view }) {
  const byDay = new Map(view.window.map((w) => [w.day, w.outcome]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(`${view.day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
  return (
    <div className="mt-3 grid grid-cols-10 gap-1.5" role="list" aria-label="Last 30 days">
      {days.map((d) => {
        const o = byDay.get(d);
        return (
          <i
            key={d}
            role="listitem"
            title={`${d}${o ? `, ${OUTCOME_LABEL[o]}` : ''}`}
            aria-label={`${d}${o ? `, ${OUTCOME_LABEL[o]}` : ', no attempt'}`}
            className="block aspect-square rounded-[4px]"
            style={{ background: o ? OUTCOME_COLOR[o] : '#0B1124', outline: d === view.day ? '2px solid #fff' : 'none' }}
          />
        );
      })}
    </div>
  );
}

function Attempt({ attempt, onEnd }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [rows, setRows] = useState(attempt.guesses);
  const [outcome, setOutcome] = useState(null); // { status, result }
  const [error, setError] = useState(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const busy = useRef(false);
  const elapsed = useElapsed(attempt.startedAt, attempt.serverNow, !outcome);

  const send = useMutation({
    mutationFn: (guess) => dailyApi.submitDailyGuess(attempt.attemptId, guess),
    onSuccess: (res, guess) => {
      busy.current = false;
      setError(null);
      setRows((r) => [...r, { guess, feedback: res.feedback }]);
      if (res.status !== 'ACTIVE') setOutcome({ status: res.status, result: res.result });
      queryClient.invalidateQueries({ queryKey: ['daily'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err) => { busy.current = false; setError(getErrorMessage(err, 'Could not submit that guess.')); },
  });
  const leave = useMutation({
    mutationFn: () => dailyApi.abandonDailyAttempt(attempt.attemptId),
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['daily'] }); onEnd(); },
  });

  function submit() {
    if (busy.current || draft.length !== attempt.codeLength) return;
    busy.current = true;
    send.mutate(draft);
    setDraft('');
  }

  const left = attempt.guessLimit - rows.length;

  return (
    <main className="mx-auto flex h-screen w-full max-w-[430px] flex-col">
      <header className="flex items-center justify-between px-4 pt-4 text-sm text-mute">
        <span className="tnum">Guess {Math.min(rows.length + 1, attempt.guessLimit)} of {attempt.guessLimit}</span>
        <span className="font-display text-xl text-white tnum" role="timer" aria-label="Elapsed time">{fmtMs(elapsed)}</span>
        {!outcome && <button type="button" onClick={() => setLeaveOpen(true)} className="min-h-[44px] px-2 text-sm font-bold text-white underline">Give up</button>}
      </header>

      <div className="board-scroll flex-1 space-y-2 overflow-y-auto px-4 py-3" aria-live="polite">
        {rows.length === 0 && <p className="py-8 text-center text-sm text-mute">Crack the {attempt.codeLength} digit code. Your time counts.</p>}
        {rows.map((r, i) => {
          const st = states(r.feedback, r.guess.length);
          return (
            <div key={i} className="flex justify-center gap-1" role="img" aria-label={`Guess ${i + 1}: ${r.guess}`}>
              {r.guess.split('').map((d, k) => <span key={k} className={`tile ${st[k]} h-12 w-11 text-xl`}>{d}</span>)}
            </div>
          );
        })}
      </div>

      {outcome ? (
        <section className="border-t-2 border-[#17213A] bg-s1 px-4 pb-6 pt-4" role="status">
          {outcome.status === 'COMPLETED' ? (
            <>
              <h2 className="font-display text-3xl font-bold">
                {outcome.result.result === 'BASELINE' ? 'Time set' : outcome.result.result === 'PASS' ? 'New best' : 'Not faster'}
              </h2>
              <p className="mt-1">
                {fmtMs(outcome.result.elapsedMs)}
                {outcome.result.result === 'PASS' && ` (was ${fmtMs(outcome.result.previousBestMs)})`}
                {outcome.result.result === 'MISS' && `. The time to beat was ${fmtMs(outcome.result.previousBestMs)}.`}
                {outcome.result.result === 'BASELINE' && '. Tomorrow you beat this.'}
              </p>
              <Link to="/dashboard" replace className="btn mt-4 w-full">Back home</Link>
            </>
          ) : (
            <>
              <h2 className="font-display text-3xl font-bold">Out of guesses</h2>
              <p className="mt-1">You can try again with a new code.</p>
              <button type="button" className="btn mt-4 w-full" onClick={onEnd}>Try again</button>
            </>
          )}
        </section>
      ) : (
        <section className="border-t-2 border-[#17213A] bg-s1 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
          <p className="font-display text-2xl font-bold text-g">Your turn</p>
          <p className="text-sm text-mute">{left} guesses left</p>
          {error && <div className="mt-2"><Banner variant="error">{error}</Banner></div>}
          <GuessInput length={attempt.codeLength} value={draft} onChange={setDraft} onSubmit={submit} disabled={send.isPending} />
        </section>
      )}
      <ConfirmDialog
        open={leaveOpen}
        tone="warn"
        title="Give up this attempt?"
        body="It counts as an attempt for today. You can start a new one with a fresh code."
        cancelLabel="Keep going"
        confirmLabel="Give up"
        busy={leave.isPending}
        onCancel={() => setLeaveOpen(false)}
        onConfirm={() => leave.mutate()}
      />
    </main>
  );
}

export default function Daily() {
  const queryClient = useQueryClient();
  const [playing, setPlaying] = useState(null);
  const { data: view, isLoading, isError } = useQuery({ queryKey: ['daily'], queryFn: dailyApi.getDaily });
  const resetsIn = useCountdown(view?.resetsAt);
  const start = useMutation({
    mutationFn: dailyApi.startDailyAttempt,
    onSuccess: (next) => { queryClient.setQueryData(['daily'], next); setPlaying(next.activeAttempt); },
  });

  if (playing) return <Attempt key={playing.attemptId} attempt={playing} onEnd={() => { setPlaying(null); queryClient.invalidateQueries({ queryKey: ['daily'] }); }} />;

  const closed = view && ['PASSED', 'MISSED', 'BASELINE'].includes(view.status);
  let cta = 'Start';
  if (view?.activeAttempt) cta = 'Continue';
  else if (view && view.attemptsToday > 0) cta = 'Try again';

  if (isLoading) return (<><PageSkeleton cards={3} /><BottomNav active="/dashboard" /></>);

  return (
    <>
      <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pb-24 pt-6">
        <header className="flex items-center gap-3">
          <Link to="/dashboard" replace aria-label="Back" className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-xl border border-line bg-s1 text-info"><Icon name="back" /></Link>
          <h1 className="font-display text-3xl font-bold">Daily Challenge</h1>
        </header>

        {isError || !view ? (
          <div className="mt-4"><ErrorState description="Could not load today's challenge." /></div>
        ) : (
          <>
            <section className="card a-g mt-4 p-4">
              <p className="text-sm font-bold text-mute">{new Date(`${view.day}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}</p>
              <h2 className="mt-1 font-display text-3xl font-bold">{view.hasTarget ? `Beat ${fmtMs(view.timeToBeatMs)}` : 'Set your time'}</h2>
              <p className="mt-2 text-[13px]">
                {view.hasTarget
                  ? `Crack a fresh code faster than your best finish from the last ${view.targetWindowDays ?? 7} days. Retry as often as you like until you finish one.`
                  : `Crack a code in as few seconds as you can. Your finish becomes the time to beat. It resets after ${view.targetWindowDays ?? 7} days without one.`}
              </p>
              <p className="mt-3 text-sm font-bold" role="status">
                {closed
                  ? view.status === 'PASSED' ? `Beaten today: ${fmtMs(view.todayResult?.elapsedMs)}`
                    : view.status === 'BASELINE' ? `Time set today: ${fmtMs(view.todayResult?.elapsedMs)}`
                      : `Finished in ${fmtMs(view.todayResult?.elapsedMs)}, not faster`
                  : view.attemptsToday > 0 ? `${view.attemptsToday} attempt${view.attemptsToday === 1 ? '' : 's'} today` : 'Not started'}
              </p>
            </section>

            {closed ? (
              <p className="card mt-5 p-4 text-[13px]">Done for today. A new challenge opens in {resetsIn} (00:00 UTC).</p>
            ) : (
              <button type="button" className="btn mt-5 w-full" disabled={start.isPending} onClick={() => (view.activeAttempt ? setPlaying(view.activeAttempt) : start.mutate())}>{start.isPending ? 'Starting…' : cta}</button>
            )}
            {start.isError && <div className="mt-3"><Banner variant="error">{getErrorMessage(start.error, 'Could not start.')}</Banner></div>}

            <section className="card mt-5 p-4">
              <div className="grid grid-cols-2 text-center">
                <div><p className="font-display text-3xl font-bold tnum">{view.streak.current}</p><p className="text-xs text-mute">Current streak</p></div>
                <div><p className="font-display text-3xl font-bold tnum">{view.streak.longest}</p><p className="text-xs text-mute">Longest streak</p></div>
              </div>
              <p className="mt-3 text-xs text-mute">Any attempt keeps the streak. Missing a whole day ends it.</p>
            </section>

            <h2 className="mb-1 mt-5 font-display text-xl font-bold">Last 30 days</h2>
            <Calendar view={view} />
            <p className="mt-2 text-xs text-mute">
              <span style={{ color: OUTCOME_COLOR.HIT }}>Green</span> faster, <span style={{ color: OUTCOME_COLOR.MISS }}>red</span> missed, <span style={{ color: OUTCOME_COLOR.BASELINE }}>blue</span> time first set.
            </p>
          </>
        )}
      </main>
      <BottomNav active="/dashboard" />
    </>
  );
}
