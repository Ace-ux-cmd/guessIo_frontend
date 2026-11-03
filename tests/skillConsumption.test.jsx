import { describe, it, expect, beforeEach } from 'vitest';
import { useMatchStore } from '../src/stores/matchStore';

const store = () => useMatchStore.getState();

describe('a skill is shown as used only when the server says its effect happened', () => {
  beforeEach(() => {
    store().reset();
    store().onSkillAssigned({ skill: 'EXTRA_TURN' });
  });

  it('keeps Extra Turn active but not used after activation', () => {
    store().onSkillResult({ skill: 'EXTRA_TURN', roundNumber: 1, consumed: false });
    expect(store().mySkill).toMatchObject({ skill: 'EXTRA_TURN', used: false, pending: true });
  });

  it('marks it used on skill.consumed', () => {
    store().onSkillResult({ skill: 'EXTRA_TURN', roundNumber: 1, consumed: false });
    store().onSkillConsumed({ skill: 'EXTRA_TURN', roundNumber: 1 });
    expect(store().mySkill).toMatchObject({ used: true, pending: false });
  });

  it('gives it back, with a message, on skill.returned', () => {
    store().onSkillResult({ skill: 'EXTRA_TURN', roundNumber: 1, consumed: false });
    store().onSkillReturned({ skill: 'EXTRA_TURN', reason: 'TURN_EXPIRED' });
    expect(store().mySkill).toMatchObject({ used: false, pending: false });
    expect(store().skillToast.text).toMatch(/turn ran out/i);
  });

  it('spends Reveal Position and X-Ray at activation, and Freeze only when consumed', () => {
    store().onSkillAssigned({ skill: 'REVEAL_POSITION' });
    store().onSkillResult({ skill: 'REVEAL_POSITION', pattern: '___5' });
    expect(store().mySkill.used).toBe(true);

    store().onSkillAssigned({ skill: 'FREEZE' });
    store().onSkillResult({ skill: 'FREEZE', targetId: 'b', consumed: false });
    expect(store().mySkill).toMatchObject({ used: false, pending: true });
    store().onSkillConsumed({ skill: 'FREEZE' });
    expect(store().mySkill.used).toBe(true);
  });

  it('takes the used and pending state from a reconnect snapshot, matching the server', () => {
    store().applySnapshot({ matchId: 'm', status: 'ACTIVE', roundNumber: 1, score: {}, mySkill: { skill: 'EXTRA_TURN', used: false, pending: true, targetId: null } });
    expect(store().mySkill).toMatchObject({ used: false, pending: true });
    store().applySnapshot({ matchId: 'm', status: 'ACTIVE', roundNumber: 1, score: {}, mySkill: { skill: 'EXTRA_TURN', used: true, pending: false, targetId: null } });
    expect(store().mySkill).toMatchObject({ used: true, pending: false });
  });
});
