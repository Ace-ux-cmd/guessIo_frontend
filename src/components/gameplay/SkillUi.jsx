import { useEffect, useState } from 'react';
import Avatar from '../ui/Avatar';
import Sheet from '../ui/Sheet';
import { useMatchStore } from '../../stores/matchStore';
import { SKILL_INFO, SKILL_ORDER, skillName } from '../../constants/skills';
import { emit } from '../../sockets/socketClient';

const TARGET_SECONDS = 5;

function useCountdown(endsAt) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!endsAt) { setLeft(0); return undefined; }
    const tick = () => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  return left;
}

/** Turn-based skill pick before the match starts. Everyone sees every pick. */
export function SkillLobby({ matchId, myUserId }) {
  const lobby = useMatchStore((s) => s.skillLobby);
  const endsAt = useMatchStore((s) => s.skillLobbyEndsAt);
  const players = useMatchStore((s) => s.players);
  const left = useCountdown(endsAt);

  if (!lobby) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col justify-center px-5 text-center" role="status">
        <p className="font-display text-3xl font-bold">Match found</p>
        <p className="mt-2 text-mute">Getting the table ready</p>
      </main>
    );
  }

  const taken = new Set(Object.values(lobby.picks).filter(Boolean));
  const picker = players.find((p) => p.userId === lobby.activePickerId);
  const myPick = lobby.activePickerId === myUserId;
  const closing = !lobby.activePickerId; // everyone has picked; the last window is playing out

  return (
    <main className="mx-auto min-h-screen w-full max-w-[430px] px-5 pb-10 pt-8">
      <h1 className="font-display text-3xl font-bold">Choose your skill</h1>
      <p className="mt-1 text-sm text-mute" role="status">
        {picker ? (myPick ? 'Your pick. One is chosen for you if time runs out.' : `${picker.username} is choosing`) : `Skills locked in. The match starts in ${left}s`}
      </p>

      <ul className="mt-5 space-y-3">
        {players.map((p) => {
          const pick = lobby.picks[p.userId];
          const on = lobby.activePickerId === p.userId;
          return (
            <li key={p.userId} className={`card ${pick ? 'a-c' : on ? 'a-g' : ''} flex items-center gap-4 p-4`}>
              <Avatar name={p.username} url={p.avatarUrl} size={40} active={on} />
              <span className="flex-1">
                <b>{p.username}{p.userId === myUserId ? ' (you)' : ''}</b>
                {pick && <span className="block text-sm text-mute">{skillName(pick)}</span>}
              </span>
              {on && <b className="font-display text-2xl text-g tnum">{left}</b>}
            </li>
          );
        })}
      </ul>

      <h2 className="mb-2 mt-7 font-display text-xl font-bold">Skills</h2>
      <div className="grid grid-cols-2 gap-3">
        {SKILL_ORDER.map((skill) => {
          const gone = taken.has(skill);
          return (
            <button
              key={skill}
              type="button"
              disabled={!myPick || gone || closing}
              onClick={() => emit('skill.pick', { matchId, skill })}
              className={`card p-3 text-left disabled:opacity-50 ${gone ? 'flat' : ''}`}
            >
              <b className="font-display text-lg">{skillName(skill)}</b>
              <span className="block text-sm text-mute">{gone ? 'Taken' : SKILL_INFO[skill]}</span>
            </button>
          );
        })}
      </div>
    </main>
  );
}

/**
 * The tab on the keypad's top edge. Skills are only usable on your own turn,
 * once per match. Freeze and X-Ray ask for a target when there is more than one
 * opponent; the picker closes by itself after 5 seconds without spending the skill.
 */
export function SkillTab({ matchId, myUserId, myTurn, guessesLeft, busy }) {
  const mySkill = useMatchStore((s) => s.mySkill);
  const players = useMatchStore((s) => s.players);
  const disconnected = useMatchStore((s) => s.disconnectedPlayerIds);
  const [picking, setPicking] = useState(false);
  const [endsAt, setEndsAt] = useState(null);
  const left = useCountdown(endsAt);

  // Close when the deadline has really passed. Comparing the clock, not `left`,
  // matters: `left` reads 0 on the first render, before its first tick.
  useEffect(() => {
    if (picking && endsAt && Date.now() >= endsAt) { setPicking(false); setEndsAt(null); }
  }, [picking, endsAt, left]);

  if (!mySkill || !mySkill.skill) return null;
  const { skill, used } = mySkill;
  const opponents = players.filter((p) => p.userId !== myUserId && !disconnected.includes(p.userId));
  const needsTarget = (skill === 'FREEZE' || skill === 'XRAY_VISION') && opponents.length > 1;
  const locked = skill === 'EXTRA_TURN' && guessesLeft <= 1;

  let label = `Use ${skillName(skill)}`;
  if (used) label = `${skillName(skill)} used`;
  else if (locked) label = 'Extra Turn locked';
  else if (!myTurn) label = `${skillName(skill)} on your turn`;
  const disabled = used || locked || !myTurn || busy;

  function activate(targetId) {
    emit('skill.activate', { matchId, skill, ...(targetId ? { targetId } : {}) });
    setPicking(false);
    setEndsAt(null);
  }

  function onTab() {
    if (needsTarget) { setPicking(true); setEndsAt(Date.now() + TARGET_SECONDS * 1000); return; }
    activate(null);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={onTab}
        className="skill-button"
      >
        <span aria-hidden="true">&#8983;</span> {label}
      </button>
      <Sheet open={picking} onClose={() => { setPicking(false); setEndsAt(null); }} title={`${skillName(skill)}: pick a target`} accent="c">
        <p className="mt-1 text-sm text-mute" role="status">{left} seconds to choose</p>
        <div className="mt-4 space-y-3">
          {opponents.map((p) => (
            <button key={p.userId} type="button" onClick={() => activate(p.userId)} className="card flex w-full items-center gap-3 p-3 text-left">
              <Avatar name={p.username} url={p.avatarUrl} size={36} />
              <b className="flex-1">{p.username}</b>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

/** Toast at the top of the screen. Reveal Position shows its pattern (e.g. ___5) for 5 seconds. */
export function SkillToast() {
  const toast = useMatchStore((s) => s.skillToast);
  const clear = useMatchStore((s) => s.clearSkillToast);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => clear(toast.id), toast.ms);
    return () => clearTimeout(id);
  }, [toast, clear]);

  if (!toast) return null;
  const reveal = toast.kind === 'reveal';
  return (
    <div
      role={toast.kind === 'warn' ? 'alert' : 'status'}
      className={`toast card ${reveal ? 'a-c' : toast.kind === 'warn' ? 'a-o' : ''} fixed left-1/2 top-4 z-50 w-[min(92vw,360px)] -translate-x-1/2 px-4 py-3 text-center`}
    >
      {reveal ? (
        <>
          <span className="block text-xs font-bold text-mute">Revealed digit</span>
          <span className="font-display text-5xl font-bold tracking-[0.18em]" aria-label={`Pattern ${toast.text.replace(/_/g, ' blank ')}`}>{toast.text}</span>
        </>
      ) : (
        <span className="text-sm font-bold">{toast.text}</span>
      )}
    </div>
  );
}

/** Told only to the player whose turn Freeze skipped. Closes after 5 seconds, or on any tap. */
export function FrozenNotice() {
  const notice = useMatchStore((s) => s.frozenNotice);
  const clear = useMatchStore((s) => s.clearFrozenNotice);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(clear, 5000);
    return () => clearTimeout(id);
  }, [notice, clear]);

  if (!notice) return null;
  return (
    <div className="ov fixed inset-0 z-50 grid place-items-center bg-black/80 p-6" onClick={clear} role="alertdialog" aria-live="assertive" aria-label="You are frozen">
      <div className="card a-c animate-pop w-full max-w-[340px] p-6 text-center">
        <p className="font-display text-3xl font-bold">Frozen</p>
        <p className="mt-2">You will not be able to play this turn.</p>
        <p className="mt-3 text-xs text-mute">Tap anywhere to close</p>
      </div>
    </div>
  );
}
