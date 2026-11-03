import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fakeSocket = { connected: true, on: vi.fn(), off: vi.fn(), io: { on: vi.fn(), off: vi.fn() } };
vi.mock('../src/sockets/socketClient', () => ({
  emit: vi.fn(),
  getSocket: () => fakeSocket,
  connectSocket: () => fakeSocket,
  retryConnection: vi.fn(),
}));

import Gameplay from '../src/screens/gameplay/Gameplay';
import { useMatchStore } from '../src/stores/matchStore';
import { useAuthStore } from '../src/stores/authStore';

const players = [{ userId: 'me', username: 'Ace', rating: 1285 }, { userId: 'dex', username: 'Dex', rating: 1300 }];
const result = (extra = {}) => ({
  roundNumber: 2, winnerId: 'me', secretCode: '4721', score: { me: 2, dex: 0 }, guessLog: [{ playerId: 'me', guess: '4721', guessNumber: 3 }],
  roundTimeSeconds: 42, fastestGuessSeconds: 3.1, fastestGuessUsername: 'Ace', isFinalRound: false, byForfeit: false, nextRoundStartsInSeconds: 3, ...extra,
});

// Records every distinct thing the screen shows, so a one-frame flash cannot hide.
function mount() {
  const seen = new Set();
  const record = () => {
    const text = document.body.textContent;
    for (const t of ['is guessing', 'Your turn', 'Round 3 starts in', 'Match results in', 'Loading results', 'You cracked it', 'results screen']) {
      if (text.includes(t)) seen.add(t);
    }
    if (document.querySelector('.keypad, [data-testid="keypad"]') || screen.queryByRole('button', { name: 'Go' })) seen.add('keypad');
  };
  const observer = new MutationObserver(record);
  const utils = render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={['/gameplay']}>
      <Routes>
        <Route path="/gameplay" element={<Gameplay />} />
        <Route path="/results" element={<p>results screen</p>} />
      </Routes>
    </MemoryRouter>
    </QueryClientProvider>,
  );
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  record();
  return { ...utils, seen, record, stop: () => observer.disconnect() };
}

const seed = (state) => useMatchStore.setState({
  matchId: 'm1', players, myUserId: 'me', config: { matchType: 'RANKED', difficulty: 'STANDARD', codeLength: 4, playerCount: 2 },
  activePlayerId: 'me', guessLog: [], ...state,
});

beforeEach(() => {
  vi.useFakeTimers();
  useAuthStore.setState({ user: { id: 'me', username: 'Ace' } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); useMatchStore.getState().reset(); });

describe('round win to results', () => {
  it('shows the next-round countdown when the round did not decide the match', () => {
    seed({ status: 'ROUND_ENDED', roundResult: result({ roundNumber: 1, nextRoundStartsInSeconds: 3 }) });
    mount();
    expect(screen.getByText('Round 2 starts in 3s')).toBeTruthy();
    expect(screen.queryByText(/Match results in/)).toBeNull();
  });

  it('shows "Match results" instead of a next-round countdown when the round decides the match', () => {
    seed({ status: 'ROUND_ENDED', roundResult: result({ isFinalRound: true, nextRoundStartsInSeconds: null }) });
    mount();
    expect(screen.getByText('Match results in 3s')).toBeTruthy();
    expect(screen.getByText('You cracked it')).toBeTruthy();
    expect(screen.queryByText(/starts in/)).toBeNull();
  });

  it('keeps the round result up through match.ended, never paints the live board, then opens the results after 3s', () => {
    seed({ status: 'ROUND_ENDED', roundResult: result({ isFinalRound: true, nextRoundStartsInSeconds: null }) });
    const { seen } = mount();
    // match.ended arrives in the same tick as round.ended.
    act(() => useMatchStore.getState().onMatchEnded({ winnerId: 'me', finalScore: { me: 2, dex: 0 }, ratingChanges: { me: 20, dex: -20 } }));
    expect(screen.getByText(/Match results in/)).toBeTruthy();
    expect(screen.queryByText('results screen')).toBeNull();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.queryByText('results screen')).toBeNull();
    act(() => { vi.advanceTimersByTime(1700); });
    expect(screen.getByText('results screen')).toBeTruthy();
    expect(seen.has('is guessing')).toBe(false);
    expect(seen.has('Your turn')).toBe(false);
    expect(seen.has('keypad')).toBe(false);
    expect(seen.has('Round 3 starts in')).toBe(false);
  });

  it('waits for match.ended if the countdown finishes first, then opens the results', () => {
    seed({ status: 'ROUND_ENDED', roundResult: result({ isFinalRound: true, nextRoundStartsInSeconds: null }) });
    mount();
    act(() => { vi.advanceTimersByTime(3500); });
    expect(screen.queryByText('results screen')).toBeNull();
    expect(screen.getByText('Loading results…')).toBeTruthy();
    act(() => useMatchStore.getState().onMatchEnded({ winnerId: 'me', finalScore: { me: 2, dex: 0 } }));
    expect(screen.getByText('results screen')).toBeTruthy();
  });

  it('goes straight to the results, with no live board, when a forfeit ended the match', () => {
    seed({ status: 'ROUND_ENDED', roundResult: result({ isFinalRound: true, byForfeit: true, nextRoundStartsInSeconds: null }) });
    const { seen } = mount();
    expect(screen.queryByText('You cracked it')).toBeNull();
    act(() => useMatchStore.getState().onMatchEnded({ winnerId: 'me', finalScore: { me: 1, dex: 0 }, forfeitedUserId: 'dex' }));
    expect(screen.getByText('results screen')).toBeTruthy();
    expect(seen.has('You cracked it')).toBe(false);
    expect(seen.has('is guessing')).toBe(false);
    expect(seen.has('keypad')).toBe(false);
  });

  it('goes straight to the results for a cancelled match, without painting the board', () => {
    seed({ status: 'ACTIVE', roundResult: null });
    const { seen } = mount();
    act(() => useMatchStore.getState().onMatchCancelled({ reason: 'INACTIVITY', penalties: {} }));
    expect(screen.getByText('results screen')).toBeTruthy();
    expect(seen.has('is guessing')).toBe(false);
  });
});
