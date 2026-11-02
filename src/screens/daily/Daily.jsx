import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BottomNav from '../../components/ui/BottomNav';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import GuessInput from '../../components/gameplay/GuessInput';
import GuessBoard from '../../components/gameplay/GuessBoard';
import TurnPanel from '../../components/gameplay/TurnPanel';
import { PageSkeleton, ErrorState, Banner } from '../../components/ui/Feedback';
import * as dailyApi from '../../api/daily.api';
import { getErrorMessage } from '../../api/client';
import { useCurrentUser } from '../../hooks/useAuth';

const fmtMs = (ms) => (ms == null ? '-' : ms >= 60000 ? `${Math.floor(ms / 60000)}m ${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}s` : `${(ms / 1000).toFixed(1)}s`);

const PLAYER_ID = 'daily-player';

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

/** Own component so the 100ms tick re-renders only the clock, not the guess board. */
const Clock = memo(function Clock({ startedAt, serverNow, running }) {
  const elapsed = useElapsed(startedAt, serverNow, running);
  return <span className="daily-timer tnum" role="timer" aria-label="Elapsed time">{fmtMs(elapsed)}</span>;
});

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

const OUTCOME_CLASS = { HIT: 'hit', MISS: 'miss', BASELINE: 'base' };
const OUTCOME_LABEL = { HIT: 'faster', MISS: 'missed', BASELINE: 'first time set' };
const LEGEND = [
  { cls: 'hit', label: 'Faster' },
  { cls: 'miss', label: 'Missed' },
  { cls: 'base', label: 'Time first set' },
  { cls: 'none', label: 'No attempt' },
];

function Calendar({ view }) {
  const byDay = new Map(view.window.map((w) => [w.day, w.outcome]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(`${view.day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
  return (
    <div className="daily-calendar" role="list" aria-label="Last 30 days">
      {days.map((d) => {
        const o = byDay.get(d);
        const today = d === view.day;
        return (
          <i
            key={d}
            role="listitem"
            title={`${d}${o ? `, ${OUTCOME_LABEL[o]}` : ''}`}
            aria-label={`${d}${today ? ', today' : ''}${o ? `, ${OUTCOME_LABEL[o]}` : ', no attempt'}`}
            className={`daily-day ${o ? OUTCOME_CLASS[o] : 'none'}${today ? ' today' : ''}`}
          />
        );
      })}
    </div>
  );
}

function Attempt({ attempt, onEnd }) {
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const [draft, setDraft] = useState('');
  const [rows, setRows] = useState(attempt.guesses);
  const [outcome, setOutcome] = useState(null); // { status, result }
  const [error, setError] = useState(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const busy = useRef(false);

  const send = useMutation({
    mutationFn: (guess) => dailyApi.submitDailyGuess(attempt.attemptId, guess),
    onSuccess: (res, guess) => {
      busy.current = false;
      setError(null);
      setDraft('');
      setRows((r) => [...r, { guess, feedback: res.feedback }]);
      if (res.status !== 'ACTIVE') setOutcome({ status: res.status, result: res.result });
      queryClient.invalidateQueries({ queryKey: ['daily'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    // The typed code stays in the entry row so a failed send can be retried.
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
  }

  const players = useMemo(() => [{ userId: PLAYER_ID, username: me?.username || 'You', avatarUrl: me?.avatarUrl }], [me?.username, me?.avatarUrl]);
  const guessLog = useMemo(() => rows.map((r, i) => ({ playerId: PLAYER_ID, guess: r.guess, feedback: r.feedback, guessNumber: i + 1 })), [rows]);

  const left = attempt.guessLimit - rows.length;
  const result = outcome?.result;
  const completed = outcome?.status === 'COMPLETED';
  const headline = !completed ? 'Out of guesses'
    : result.result === 'BASELINE' ? 'Time set' : result.result === 'PASS' ? 'New best' : 'Not faster';

  return (
    <>
      <main className="app gameplay-live">
        <header className="game-header">
          <div>
            <p className="round-label">Daily challenge</p>
            <span className="guess-count">{outcome ? 'Guesses used' : 'Guess'} <strong>{outcome ? rows.length : Math.min(rows.length + 1, attempt.guessLimit)}</strong> of <strong>{attempt.guessLimit}</strong></span>
          </div>
          <div className="daily-clock">
            <Clock startedAt={attempt.startedAt} serverNow={attempt.serverNow} running={!outcome} />
            {!outcome && <button type="button" onClick={() => setLeaveOpen(true)} className="forfeit" aria-label="Give up this attempt">&#9873;</button>}
          </div>
        </header>

        <section className="history" aria-label="Guess board" aria-live="polite">
          {rows.length === 0 ? (
            <div className="guess-empty">Crack the {attempt.codeLength} digit code. Your time counts.</div>
          ) : (
            <GuessBoard guessLog={guessLog} players={players} difficulty="STANDARD" myUserId={PLAYER_ID} />
          )}
        </section>

        {outcome ? (
          <section className="turn-panel daily-outcome" role="status" aria-label="Attempt result">
            <div className="turn-status">
              <div className="turn-copy">
                <strong className={completed && result.result !== 'MISS' ? 'mine' : undefined}>{headline}</strong>
                <span>
                  {completed ? (
                    <>
                      {fmtMs(result.elapsedMs)}
                      {result.result === 'PASS' && ` (was ${fmtMs(result.previousBestMs)})`}
                      {result.result === 'MISS' && `. The time to beat was ${fmtMs(result.previousBestMs)}.`}
                      {result.result === 'BASELINE' && '. Tomorrow you beat this.'}
                    </>
                  ) : 'You can try again with a new code.'}
                </span>
              </div>
            </div>
            <div className="daily-outcome-actions">
              {completed
                ? <Link to="/dashboard" replace className="action results-victory-variant primary">Back home</Link>
                : <button type="button" className="action results-victory-variant primary" onClick={onEnd}>Try again</button>}
            </div>
          </section>
        ) : (
          <TurnPanel myTurn title="Your turn" subtitle={`${left} ${left === 1 ? 'guess' : 'guesses'} left`}>
            {error && <div className="daily-error"><Banner variant="error">{error}</Banner></div>}
            <GuessInput length={attempt.codeLength} value={draft} onChange={setDraft} onSubmit={submit} pending={send.isPending} />
          </TurnPanel>
        )}
      </main>
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
    </>
  );
}

function statusLine(view, closed) {
  if (closed) {
    if (view.status === 'PASSED') return { tone: 'win', text: `Beaten today: ${fmtMs(view.todayResult?.elapsedMs)}` };
    if (view.status === 'BASELINE') return { tone: 'base', text: `Time set today: ${fmtMs(view.todayResult?.elapsedMs)}` };
    return { tone: 'miss', text: `Finished in ${fmtMs(view.todayResult?.elapsedMs)}, not faster` };
  }
  if (view.attemptsToday > 0) return { tone: '', text: `${view.attemptsToday} attempt${view.attemptsToday === 1 ? '' : 's'} today` };
  return { tone: '', text: 'Not started' };
}

export default function Daily() {
  const queryClient = useQueryClient();
  const [playing, setPlaying] = useState(null);
  const { data: view, isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ['daily'], queryFn: dailyApi.getDaily });
  const resetsIn = useCountdown(view?.resetsAt);
  const start = useMutation({
    mutationFn: dailyApi.startDailyAttempt,
    onSuccess: (next) => { queryClient.setQueryData(['daily'], next); setPlaying(next.activeAttempt); },
  });

  if (playing) return <Attempt key={playing.attemptId} attempt={playing} onEnd={() => { setPlaying(null); queryClient.invalidateQueries({ queryKey: ['daily'] }); }} />;

  if (isLoading) return (<><PageSkeleton cards={3} /><BottomNav active="/dashboard" /></>);

  const closed = view && ['PASSED', 'MISSED', 'BASELINE'].includes(view.status);
  let cta = 'Start';
  if (view?.activeAttempt) cta = 'Continue';
  else if (view && view.attemptsToday > 0) cta = 'Try again';
  const line = view ? statusLine(view, closed) : null;
  const windowDays = view?.targetWindowDays ?? 7;

  return (
    <>
      <main className="app">
        <header className="topbar with-back leading">
          <Link to="/dashboard" replace aria-label="Back" className="back">&larr;</Link>
          <div>
            <p className="eyebrow">{view ? new Date(`${view.day}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }) : 'Today'}</p>
            <h1>Daily Challenge</h1>
          </div>
        </header>

        <div className="content daily-variant">
          {isError || !view ? (
            <ErrorState
              description="Could not load today's challenge."
              action={<Button onClick={() => refetch()} disabled={isFetching}>{isFetching ? 'Loading…' : 'Try again'}</Button>}
            />
          ) : (
            <>
              <section className="daily-hero" aria-labelledby="daily-title">
                <p className="daily-kicker">{view.hasTarget ? 'Time to beat' : 'First finish'}</p>
                <h2 id="daily-title" className="daily-target tnum">{view.hasTarget ? fmtMs(view.timeToBeatMs) : 'Set your time'}</h2>
                <p className="daily-copy">
                  {view.hasTarget
                    ? `Crack a fresh code faster than your best finish from the last ${windowDays} days. Retry as often as you like until you finish one.`
                    : `Crack a code in as few seconds as you can. Your finish becomes the time to beat. It resets after ${windowDays} days without one.`}
                </p>
                <p className={`daily-status${line.tone ? ` ${line.tone}` : ''}`} role="status">{line.text}</p>
              </section>

              {closed ? (
                <p className="daily-done">Done for today. A new challenge opens in {resetsIn} (00:00 UTC).</p>
              ) : (
                <button
                  type="button"
                  className="launch daily-start"
                  disabled={start.isPending}
                  onClick={() => (view.activeAttempt ? setPlaying(view.activeAttempt) : start.mutate())}
                >
                  {start.isPending ? 'Starting…' : cta}
                  <span aria-hidden="true">&rarr;</span>
                </button>
              )}
              {start.isError && <div className="daily-error"><Banner variant="error">{getErrorMessage(start.error, 'Could not start.')}</Banner></div>}

              <section className="section" aria-labelledby="streak-title">
                <div className="section-heading profile-variant"><h2 id="streak-title">Streak</h2><span>Any attempt counts</span></div>
                <div className="daily-streaks">
                  <div className="stat profile-variant"><strong className="tnum">{view.streak.current}</strong><span>Current streak</span></div>
                  <div className="stat profile-variant"><strong className="tnum">{view.streak.longest}</strong><span>Longest streak</span></div>
                </div>
                <p className="helper">Any attempt keeps the streak. Missing a whole day ends it.</p>
              </section>

              <section className="section" aria-labelledby="calendar-title">
                <div className="section-heading profile-variant"><h2 id="calendar-title">Last 30 days</h2><span>UTC days</span></div>
                <div className="daily-panel">
                  <Calendar view={view} />
                  <ul className="daily-legend">
                    {LEGEND.map((l) => <li key={l.cls}><i className={`daily-day ${l.cls}`} aria-hidden="true" />{l.label}</li>)}
                  </ul>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      <BottomNav active="/dashboard" />
    </>
  );
}
