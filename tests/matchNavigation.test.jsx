import { render, screen, cleanup, act, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A tiny socket: handlers registered with on() can be fired from a test with fire().
const handlers = new Map();
const fakeSocket = {
  connected: true,
  on: (e, h) => { handlers.set(e, [...(handlers.get(e) || []), h]); },
  off: (e, h) => { handlers.set(e, (handlers.get(e) || []).filter((x) => x !== h)); },
  io: { on: vi.fn(), off: vi.fn() },
};
const fire = (event, env) => act(() => { (handlers.get(event) || []).forEach((h) => h(env)); });
const emitMock = vi.fn();
vi.mock('../src/sockets/socketClient', () => ({
  emit: (...a) => emitMock(...a),
  getSocket: () => fakeSocket,
  connectSocket: () => fakeSocket,
  retryConnection: vi.fn(),
}));

const weeklyStatus = vi.hoisted(() => vi.fn());
vi.mock('../src/api/leaderboards.api', () => ({ getWeeklyStatus: (...a) => weeklyStatus(...a) }));

import Matchmaking from '../src/screens/play/Matchmaking';
import { useMatchSocket } from '../src/hooks/useMatchSocket';
import { useMatchStore } from '../src/stores/matchStore';
import { useAuthStore } from '../src/stores/authStore';

const QS = '?matchType=RANKED&difficulty=STANDARD&playerCount=2';

function Probe() {
  const loc = useLocation();
  const type = useNavigationType();
  return <p data-testid="where">{`${loc.pathname}|${type}`}</p>;
}
function renderAt(entry) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/matchmaking" element={<Matchmaking />} />
        <Route path="/play" element={<p>play screen</p>} />
        <Route path="/gameplay" element={<p>gameplay screen</p>} />
        <Route path="*" element={null} />
      </Routes>
      <Probe />
    </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  handlers.clear();
  emitMock.mockClear();
  weeklyStatus.mockReset();
  weeklyStatus.mockResolvedValue({ rankedOpen: true, state: 'OPEN' });
  useAuthStore.setState({ user: { id: 'me', username: 'Ace' } });
});
afterEach(() => { cleanup(); useMatchStore.getState().reset(); });

describe('ranked while the week is resetting', () => {
  it('does not join the queue, and blocks with a dialog the player must leave through', async () => {
    weeklyStatus.mockResolvedValue({ rankedOpen: false, state: 'CLOSING' });
    renderAt({ pathname: '/matchmaking', search: QS, state: { queueIntent: true } });
    const back = await screen.findByRole('button', { name: 'Back to Play' });
    expect(emitMock.mock.calls.filter(([e]) => e === 'queue.join')).toHaveLength(0);
    fireEvent.click(back);
    expect(await screen.findByText('play screen')).toBeTruthy();
    expect(emitMock.mock.calls.filter(([e]) => e === 'queue.join')).toHaveLength(0);
  });

  it('casual matches are never held up by the ranked check', async () => {
    weeklyStatus.mockResolvedValue({ rankedOpen: false, state: 'CLOSING' });
    renderAt({ pathname: '/matchmaking', search: '?matchType=CASUAL&difficulty=STANDARD&playerCount=2', state: { queueIntent: true } });
    await waitFor(() => expect(emitMock.mock.calls.filter(([e]) => e === 'queue.join')).toHaveLength(1));
    expect(weeklyStatus).not.toHaveBeenCalled();
  });

  it('still joins if the status cannot be read, because the server enforces the lock', async () => {
    weeklyStatus.mockRejectedValue(new Error('offline'));
    renderAt({ pathname: '/matchmaking', search: QS, state: { queueIntent: true } });
    await waitFor(() => expect(emitMock.mock.calls.filter(([e]) => e === 'queue.join')).toHaveLength(1));
  });
});

describe('matchmaking can only be entered on purpose', () => {
  it('joins the queue once when the player tapped Start', async () => {
    renderAt({ pathname: '/matchmaking', search: QS, state: { queueIntent: true } });
    await waitFor(() => expect(emitMock.mock.calls.filter(([e]) => e === 'queue.join')).toHaveLength(1));
    const joins = emitMock.mock.calls.filter(([e]) => e === 'queue.join');
    expect(joins[0][1]).toEqual({ matchType: 'RANKED', difficulty: 'STANDARD', playerCount: 2 });
    expect(screen.getByText('Finding opponents')).toBeTruthy();
  });

  it('never queues when reached by Back, Forward, a refresh or a bookmark', () => {
    renderAt({ pathname: '/matchmaking', search: QS });
    expect(emitMock.mock.calls.filter(([e]) => e === 'queue.join')).toHaveLength(0);
    expect(screen.getByText('play screen')).toBeTruthy();
    expect(screen.queryByText('Finding opponents')).toBeNull();
  });

  it('never queues when the history entry has already used its permission', () => {
    renderAt({ pathname: '/matchmaking', search: QS, state: { queueIntent: false } });
    expect(emitMock.mock.calls.filter(([e]) => e === 'queue.join')).toHaveLength(0);
    expect(screen.getByText('play screen')).toBeTruthy();
  });

  it('sends a player who comes back during a live match to that match, not the queue', () => {
    useMatchStore.setState({ matchId: 'm1', status: 'ACTIVE' });
    renderAt({ pathname: '/matchmaking', search: QS });
    expect(emitMock.mock.calls.filter(([e]) => e === 'queue.join')).toHaveLength(0);
    expect(screen.getByText('gameplay screen')).toBeTruthy();
  });

  it('replaces matchmaking with the match, so Back cannot return to it', () => {
    renderAt({ pathname: '/matchmaking', search: QS, state: { queueIntent: true } });
    fire('match.found', { matchId: 'm1', payload: { matchId: 'm1', players: [{ userId: 'me' }, { userId: 'x' }], config: { matchType: 'RANKED', playerCount: 2 } } });
    expect(screen.getByText('gameplay screen')).toBeTruthy();
    expect(screen.getByTestId('where').textContent).toBe('/gameplay|REPLACE');
  });

  it('does not leave the queue when the match was found, but does when the player cancels', () => {
    const { unmount } = renderAt({ pathname: '/matchmaking', search: QS, state: { queueIntent: true } });
    fire('match.found', { matchId: 'm1', payload: { matchId: 'm1', players: [], config: {} } });
    expect(emitMock.mock.calls.filter(([e]) => e === 'queue.leave')).toHaveLength(0);
    unmount();
    cleanup();
    useMatchStore.getState().reset();

    emitMock.mockClear();
    renderAt({ pathname: '/matchmaking', search: QS, state: { queueIntent: true } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel search' }));
    expect(emitMock.mock.calls.some(([e]) => e === 'queue.leave')).toBe(true);
    expect(screen.getByText('play screen')).toBeTruthy();
  });
});

describe('stale events from another match are ignored', () => {
  function Host() { useMatchSocket(); return null; }
  const mount = () => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><Host /></MemoryRouter></QueryClientProvider>);

  it('ignores a late match.ended for an old match after the store was reset', () => {
    mount();
    fire('match.ended', { matchId: 'old', payload: { winnerId: 'x' } });
    expect(useMatchStore.getState().status).toBe('IDLE');
    expect(useMatchStore.getState().matchResult).toBeNull();
  });

  it('ignores events for a different match than the one in the store', () => {
    useMatchStore.setState({ matchId: 'new', status: 'ACTIVE' });
    mount();
    fire('match.ended', { matchId: 'old', payload: { winnerId: 'x' } });
    expect(useMatchStore.getState().status).toBe('ACTIVE');
  });

  it('still applies events for the current match, queue progress and a first snapshot', () => {
    useMatchStore.setState({ matchId: 'm1', status: 'ACTIVE' });
    mount();
    fire('round.ended', { matchId: 'm1', payload: { score: { me: 1 } } });
    expect(useMatchStore.getState().status).toBe('ROUND_ENDED');
    fire('queue.progress', { payload: { playersWaiting: 2, players: [] } });
    expect(useMatchStore.getState().queuePlayersWaiting).toBe(2);

    useMatchStore.getState().reset();
    fire('match.snapshot', { matchId: 'm9', payload: { matchId: 'm9', status: 'ACTIVE', roundNumber: 1, score: {} } });
    expect(useMatchStore.getState().matchId).toBe('m9');
  });
});

describe('guess lock', () => {
  it('is set when a guess is sent and cleared by every answer that settles it', () => {
    const s = () => useMatchStore.getState();
    for (const settle of [
      () => s().onGuessAccepted({ playerId: 'me', guess: '1234', guessNumber: 1 }),
      () => s().onGuessRejected({ code: 'NOT_YOUR_TURN', message: 'x' }),
      () => s().onTurnStarted({ activePlayerId: 'x', turnDurationSeconds: 30 }),
      () => s().onRoundEnded({ score: {} }),
      () => s().applySnapshot({ matchId: 'm1', status: 'ACTIVE', roundNumber: 1, score: {} }),
    ]) {
      s().onGuessSent();
      expect(s().guessPending).toBe(true);
      settle();
      expect(s().guessPending).toBe(false);
    }
  });
});
