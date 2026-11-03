import { useEffect, useLayoutEffect, useState } from 'react';
import Sheet from './Sheet';
import { SKILL_INFO, SKILL_ORDER, skillName } from '../../constants/skills';
import { useExitTransition } from '../../hooks/useExitTransition';

const safeGet = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const safeSet = (key, value) => { try { localStorage.setItem(key, value); } catch { /* storage unavailable: the notice just shows again */ } };
const safeRemove = (key) => { try { localStorage.removeItem(key); } catch { /* nothing to remove */ } };

const welcomeKey = (userId) => `guessio:welcome:${userId}`;
const SKILLS_INTRO_KEY = 'guessio:skillsIntro:v2';

/** Called once when a new account finishes choosing a username. */
export function markNewAccount(userId) {
  if (userId) safeSet(welcomeKey(userId), '1');
}

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
);

/**
 * First-launch tip for a new account: a small blue banner that floats over the
 * screen (it takes no space in the layout) and points at the help button. It
 * fades and slides in and out. A tap anywhere, or the X, dismisses it for good;
 * the tap still reaches whatever was tapped.
 */
export function WelcomeTip({ userId, anchorRef, open, onDone }) {
  const { mounted, shown } = useExitTransition(open, 250);
  const [place, setPlace] = useState(null);

  useLayoutEffect(() => {
    if (!mounted) return undefined;
    const measure = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = Math.min(300, window.innerWidth - 24);
      const arrowX = r.left + r.width / 2;
      const left = Math.min(Math.max(12, arrowX + 28 - width), window.innerWidth - width - 12);
      setPlace({ top: r.bottom + 12, left, width, arrow: Math.min(Math.max(16, arrowX - left - 8), width - 32) });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [mounted, anchorRef]);

  useEffect(() => {
    if (!open) return undefined;
    const dismiss = () => { safeRemove(welcomeKey(userId)); onDone(); };
    document.addEventListener('pointerdown', dismiss, { once: true });
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open, userId, onDone]);

  if (!mounted || !place) return null;
  return (
    <div
      role="status"
      className={`pointer-events-none fixed z-30 transition duration-[250ms] ease-out ${shown ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
      style={{ top: place.top, left: place.left, width: place.width }}
    >
      <i className="absolute -top-1.5 block h-4 w-4 rotate-45 bg-info" style={{ left: place.arrow }} aria-hidden="true" />
      <div className="pointer-events-auto relative flex items-start gap-2 rounded-lg bg-info py-2 pl-3 pr-1 text-sm font-bold text-black">
        <p className="flex-1 py-1">Welcome to guessIo! Need a walkthrough of how to play? Tap the help button.</p>
        <button type="button" onClick={() => { safeRemove(welcomeKey(userId)); onDone(); }} className="grid h-[36px] w-[36px] shrink-0 place-items-center" aria-label="Dismiss"><CloseIcon /></button>
      </div>
    </div>
  );
}

/** One-time "Introducing skills" pop-up, with the same short descriptions as the pick screen. */
export function SkillsIntro({ open, onDone }) {
  function close() { safeSet(SKILLS_INTRO_KEY, '1'); onDone(); }
  return (
    <Sheet open={open} onClose={close} variant="center" accent="c" labelledBy="skills-intro-title">
      <p className="text-xs font-bold uppercase tracking-wide text-info">New</p>
      <h2 id="skills-intro-title" className="font-display pr-8 text-2xl font-bold">Introducing skills</h2>
      <p className="mt-1 text-sm text-mute">Before an online match you pick one skill. Use it once, on your own turn.</p>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {SKILL_ORDER.map((skill) => (
          <li key={skill} className="card flat p-3">
            <b className="font-display text-base">{skillName(skill)}</b>
            <span className="block text-xs text-mute">{SKILL_INFO[skill]}</span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={close} className="btn mt-4 w-full">Got it</button>
    </Sheet>
  );
}

/** Which first-launch notice is up: the welcome tip first, then the skills pop-up, never both at once. */
export function useWelcomeState(userId) {
  const [tip, setTip] = useState(() => Boolean(userId) && safeGet(welcomeKey(userId)) === '1');
  const [intro, setIntro] = useState(() => safeGet(SKILLS_INTRO_KEY) !== '1');
  return { tip, intro: intro && !tip, closeTip: () => setTip(false), closeIntro: () => setIntro(false) };
}
