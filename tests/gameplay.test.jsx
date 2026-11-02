import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GuessBoard from '../src/components/gameplay/GuessBoard';
import GuessInput from '../src/components/gameplay/GuessInput';
import { SkillTab, SkillToast, SkillLobby } from '../src/components/gameplay/SkillUi';
import { useMatchStore } from '../src/stores/matchStore';
import { compareVersions } from '../src/lib/version';

vi.mock('../src/sockets/socketClient', () => ({ emit: vi.fn(), getSocket: vi.fn(), connectSocket: vi.fn() }));
import { emit } from '../src/sockets/socketClient';

afterEach(() => { cleanup(); useMatchStore.getState().reset(); vi.clearAllMocks(); vi.useRealTimers(); });

const players = [{ userId: 'a', username: 'Ace' }, { userId: 'b', username: 'Dex' }, { userId: 'c', username: 'Fox' }];

describe('guess board', () => {
  it('shows one row per guess and nothing for a skipped turn', () => {
    const guessLog = [{ playerId: 'a', guess: '1234', guessNumber: 1 }, { playerId: 'c', guess: '5678', guessNumber: 2 }];
    const { container } = render(<GuessBoard guessLog={guessLog} players={players} difficulty="STANDARD" myUserId="a" myFeedbackHistory={[]} />);
    expect(container.querySelectorAll('[role="img"]').length).toBe(2);
    expect(container.textContent).not.toMatch(/skipped/i);
  });

  it('colours the watched player\'s row from X-Ray feedback, outlined', () => {
    const guessLog = [{ playerId: 'b', guess: '1234', guessNumber: 1 }];
    const feedback = { cellFeedback: ['CORRECT_POSITION', 'WRONG_POSITION', 'NOT_PRESENT', 'NOT_PRESENT'] };
    const xray = { targetId: 'b', dead: false, feed: [{ guess: '1234', guessNumber: 1, feedback }] };
    const { container } = render(<GuessBoard guessLog={guessLog} players={players} difficulty="STANDARD" myUserId="a" myFeedbackHistory={[]} xray={xray} />);
    const tiles = [...container.querySelectorAll('.digit')];
    expect(tiles.map((t) => t.className.includes('xr'))).toEqual([true, true, true, true]);
    expect(tiles[0].className).toContain('correct');
    expect(tiles[1].className).toContain('present');
  });
});

describe('skills in the match', () => {
  const seed = (extra = {}) => useMatchStore.setState({ players, disconnectedPlayerIds: [], mySkill: { skill: 'FREEZE', used: false, targetId: null }, ...extra });

  it('is disabled when it is not your turn, and says so', () => {
    seed();
    render(<SkillTab matchId="m" myUserId="a" myTurn={false} guessesLeft={9} />);
    const tab = screen.getByRole('button');
    expect(tab.disabled).toBe(true);
    expect(tab.textContent).toMatch(/on your turn/i);
    expect(emit).not.toHaveBeenCalled();
  });

  it('asks for a target when there are several opponents, then activates', () => {
    seed();
    render(<SkillTab matchId="m" myUserId="a" myTurn guessesLeft={9} />);
    act(() => screen.getByRole('button', { name: /Use Freeze/ }).click());
    act(() => screen.getByRole('button', { name: /Dex/ }).click());
    expect(emit).toHaveBeenCalledWith('skill.activate', { matchId: 'm', skill: 'FREEZE', targetId: 'b' });
  });

  it('activates straight away with a single opponent', () => {
    useMatchStore.setState({ players: players.slice(0, 2), disconnectedPlayerIds: [], mySkill: { skill: 'XRAY_VISION', used: false } });
    render(<SkillTab matchId="m" myUserId="a" myTurn guessesLeft={9} />);
    act(() => screen.getByRole('button').click());
    expect(emit).toHaveBeenCalledWith('skill.activate', { matchId: 'm', skill: 'XRAY_VISION' });
  });

  it('locks Extra Turn when one guess is left, and a used skill stays used', () => {
    useMatchStore.setState({ players, disconnectedPlayerIds: [], mySkill: { skill: 'EXTRA_TURN', used: false } });
    const { rerender } = render(<SkillTab matchId="m" myUserId="a" myTurn guessesLeft={1} />);
    expect(screen.getByRole('button').disabled).toBe(true);
    expect(screen.getByRole('button').textContent).toMatch(/locked/i);
    useMatchStore.setState({ mySkill: { skill: 'EXTRA_TURN', used: true } });
    rerender(<SkillTab matchId="m" myUserId="a" myTurn guessesLeft={9} />);
    expect(screen.getByRole('button').textContent).toMatch(/used/i);
  });

  it('shows Reveal Position as a blank pattern like ___5 for five seconds, then removes it', () => {
    vi.useFakeTimers();
    useMatchStore.getState().onSkillResult({ skill: 'REVEAL_POSITION', roundNumber: 1, position: 3, digit: '5', pattern: '___5' });
    render(<SkillToast />);
    expect(screen.getByText('___5')).toBeTruthy();
    expect(screen.queryByText(/position 3/i)).toBeNull();
    act(() => { vi.advanceTimersByTime(4900); });
    expect(screen.queryByText('___5')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByText('___5')).toBeNull();
  });

  it('shows the lobby with every pick visible and only the active picker able to choose', () => {
    useMatchStore.setState({
      players,
      skillLobby: { order: ['a', 'b', 'c'], activePickerId: 'b', secondsPerPick: 3, skills: [], picks: { a: 'FREEZE', b: null, c: null } },
      skillLobbyEndsAt: Date.now() + 3000,
    });
    render(<SkillLobby matchId="m" myUserId="a" />);
    expect(screen.getByText(/Dex is choosing/)).toBeTruthy();
    const freeze = screen.getAllByRole('button').find((b) => /Freeze/.test(b.textContent));
    expect(freeze.disabled).toBe(true);
    expect(screen.getAllByRole('button').every((b) => b.disabled)).toBe(true); // not my pick
  });
});

describe('versions', () => {
  it('compares x.y.z', () => {
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
  });
});

describe('frozen notice', () => {
  it('tells the frozen player, then closes by itself after 5 seconds', async () => {
    vi.useFakeTimers();
    const { FrozenNotice } = await import('../src/components/gameplay/SkillUi');
    useMatchStore.getState().onSkillFrozen();
    render(<FrozenNotice />);
    expect(screen.getByText(/not be able to play this turn/i)).toBeTruthy();
    act(() => { vi.advanceTimersByTime(4900); });
    expect(screen.queryByText(/not be able to play this turn/i)).toBeTruthy();
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByText(/not be able to play this turn/i)).toBeNull();
  });
});

describe('guess board flip', () => {
  it('starts a new own row on the flip (grey until the half turn) and leaves old rows alone', () => {
    const fb = { cellFeedback: ['CORRECT_POSITION', 'NOT_PRESENT', 'NOT_PRESENT', 'NOT_PRESENT'] };
    const base = [{ playerId: 'a', guess: '1234', guessNumber: 1 }];
    const { container, rerender } = render(<GuessBoard guessLog={base} players={players} difficulty="STANDARD" myUserId="a" myFeedbackHistory={[fb]} />);
    expect(container.querySelectorAll('.digit.rv').length).toBe(0); // already there when mounted
    rerender(<GuessBoard guessLog={[...base, { playerId: 'a', guess: '5678', guessNumber: 2 }]} players={players} difficulty="STANDARD" myUserId="a" myFeedbackHistory={[fb, fb]} />);
    expect(container.querySelectorAll('.digit.rv').length).toBe(4);
  });
});

describe('X-Ray warning for the target', () => {
  const seedPlayers = () => useMatchStore.setState({ players, myUserId: 'c' });

  it('shows "You\'re being monitored" and never says who is watching', () => {
    seedPlayers();
    render(<SkillToast />);
    act(() => useMatchStore.getState().onSkillMonitored());
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe("You're being monitored");
    for (const p of players) expect(alert.textContent).not.toContain(p.username);
    expect(alert.textContent).not.toMatch(/x-?ray/i);
  });

  it('goes away on its own after four seconds', () => {
    vi.useFakeTimers();
    render(<SkillToast />);
    act(() => useMatchStore.getState().onSkillMonitored());
    expect(screen.getByRole('alert')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(4100); });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('guess input while a guess is in flight', () => {
  it('sends one guess even if Go is pressed twice, and again once the server has answered', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<GuessInput length={4} value="1234" onChange={() => {}} onSubmit={onSubmit} disabled={false} pending={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    rerender(<GuessInput length={4} value="1234" onChange={() => {}} onSubmit={onSubmit} disabled={false} pending />);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Go' }).getAttribute('aria-disabled')).toBe('true');
    rerender(<GuessInput length={4} value="1234" onChange={() => {}} onSubmit={onSubmit} disabled={false} pending={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('keeps the latest "already used" warning for its full time when digits are tapped quickly', () => {
    vi.useFakeTimers();
    render(<GuessInput length={4} value="1" onChange={() => {}} onSubmit={() => {}} disabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    act(() => { vi.advanceTimersByTime(800); });
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    act(() => { vi.advanceTimersByTime(800); }); // 1.6s after the first tap, 0.8s after the second
    expect(screen.getByText('1 is already used')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.queryByText('1 is already used')).toBeNull();
  });
});

describe('skill tab while a skill is active', () => {
  it('shows Active and cannot be pressed again until the server spends or returns it', () => {
    useMatchStore.setState({ players, disconnectedPlayerIds: [], mySkill: { skill: 'EXTRA_TURN', used: false, pending: true } });
    render(<SkillTab matchId="m" myUserId="a" myTurn guessesLeft={9} />);
    expect(screen.getByRole('button').textContent).toMatch(/active/i);
    expect(screen.getByRole('button').disabled).toBe(true);
  });
});
