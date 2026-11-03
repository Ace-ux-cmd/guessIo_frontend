import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/api/daily.api', () => ({
  getDaily: vi.fn(),
  startDailyAttempt: vi.fn(),
  startDailyRetry: vi.fn(),
  submitDailyGuess: vi.fn(),
  abandonDailyAttempt: vi.fn(),
}));
vi.mock('../src/hooks/useAuth', () => ({ useCurrentUser: () => ({ data: { username: 'ace', avatarUrl: null } }) }));

import * as dailyApi from '../src/api/daily.api';
import Daily from '../src/screens/daily/Daily';
import DailyRetryDialogs from '../src/screens/daily/DailyRetry';

const base = {
  day: '2026-04-02',
  hasTarget: true,
  timeToBeatMs: 5000,
  targetWindowDays: 7,
  resetsAt: '2026-04-03T00:00:00.000Z',
  serverNow: '2026-04-02T10:00:09.000Z',
  streak: { current: 2, longest: 2 },
  attemptsToday: 1,
  activeAttempt: null,
  todayResult: { attemptId: 'a1', result: 'MISS', elapsedMs: 9000 },
};
const missed = (points) => ({
  ...base,
  status: 'MISSED',
  window: [{ day: '2026-04-01', outcome: 'BASELINE' }, { day: '2026-04-02', outcome: 'MISS' }],
  retry: { available: true, cost: 10, points },
});

function mount(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}
const todaySquare = () => screen.getAllByRole('listitem').find((el) => el.getAttribute('aria-label')?.includes('today'));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('daily page retry', () => {
  it('shows the retry button with its cost after a miss, and a red square for today', async () => {
    dailyApi.getDaily.mockResolvedValue(missed(30));
    mount(<Daily />);
    const button = await screen.findByRole('button', { name: /Retry for 10 points/ });
    expect(button.disabled).toBe(false);
    expect(screen.getByText(/You have 30 points/)).toBeTruthy();
    expect(todaySquare().className).toMatch(/miss/);
  });

  it('asks for confirmation that names the cost before anything is charged', async () => {
    dailyApi.getDaily.mockResolvedValue(missed(30));
    mount(<Daily />);
    fireEvent.click(await screen.findByRole('button', { name: /Retry for 10 points/ }));

    expect(await screen.findByText('Spend 10 points?')).toBeTruthy();
    expect(screen.getByText(/A retry costs 10 points/)).toBeTruthy();
    expect(dailyApi.startDailyRetry).not.toHaveBeenCalled();
  });

  it('charges and opens the new attempt once the player confirms', async () => {
    dailyApi.getDaily.mockResolvedValue(missed(30));
    dailyApi.startDailyRetry.mockResolvedValue({
      ...base,
      status: 'IN_PROGRESS',
      retry: { available: false, cost: 10, points: 20 },
      window: [{ day: '2026-04-02', outcome: 'MISS' }],
      activeAttempt: { attemptId: 'r1', codeLength: 4, guessLimit: 10, startedAt: '2026-04-02T11:00:00.000Z', serverNow: '2026-04-02T11:00:00.000Z', guesses: [] },
    });
    mount(<Daily />);
    fireEvent.click(await screen.findByRole('button', { name: /Retry for 10 points/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^Spend 10 points$/ }));

    await waitFor(() => expect(dailyApi.startDailyRetry).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Daily challenge')).toBeTruthy();
  });

  it('disables the retry button and says how many points are missing when the balance is too low', async () => {
    dailyApi.getDaily.mockResolvedValue(missed(4));
    mount(<Daily />);
    const button = await screen.findByRole('button', { name: /Retry for 10 points/ });
    expect(button.disabled).toBe(true);
    expect(screen.getByText(/You need 10 points to retry and have 4/)).toBeTruthy();
  });

  it('offers no retry after a pass, and shows a green square', async () => {
    dailyApi.getDaily.mockResolvedValue({
      ...base,
      status: 'PASSED',
      window: [{ day: '2026-04-02', outcome: 'HIT' }],
      retry: { available: false, cost: 10, points: 20 },
      todayResult: { attemptId: 'a2', result: 'PASS', elapsedMs: 3000 },
    });
    mount(<Daily />);
    expect(await screen.findByText(/Done for today/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull();
    expect(todaySquare().className).toMatch(/hit/);
  });
});

describe('retry dialogs', () => {
  const props = { onPromptClose: vi.fn(), onConfirmOpen: vi.fn(), onConfirmClose: vi.fn(), onStarted: vi.fn() };

  it('encourages without pressure after a miss and says how far off the player was', async () => {
    mount(<DailyRetryDialogs {...props} retry={{ available: true, cost: 10, points: 30 }} finishedMs={9000} targetMs={5000} promptOpen confirmOpen={false} />);
    expect(await screen.findByText('Want another go?')).toBeTruthy();
    expect(screen.getByText(/4\.0s off the time to beat/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Retry for 10 points/ }));
    expect(props.onConfirmOpen).toHaveBeenCalled();
  });

  it('cannot be confirmed when the balance is below the cost', async () => {
    mount(<DailyRetryDialogs {...props} retry={{ available: true, cost: 10, points: 4 }} promptOpen={false} confirmOpen />);
    const confirm = await screen.findByRole('button', { name: /^Spend 10 points$/ });
    expect(confirm.disabled).toBe(true);
    expect(screen.getByText(/costs 10 points and you have 4 points/)).toBeTruthy();
    fireEvent.click(confirm);
    expect(dailyApi.startDailyRetry).not.toHaveBeenCalled();
  });

  it('shows nothing when no retry is available', () => {
    mount(<DailyRetryDialogs {...props} retry={{ available: false, cost: 10, points: 50 }} promptOpen confirmOpen />);
    expect(screen.queryByText('Want another go?')).toBeNull();
    expect(screen.queryByText('Spend 10 points?')).toBeNull();
  });
});
