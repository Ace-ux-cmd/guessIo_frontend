import { render, screen, cleanup, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/api/leaderboards.api', () => ({
  getRatingLeaderboard: vi.fn(),
  getWeeklyStatus: vi.fn(),
  getWeeklyRecap: vi.fn(),
  markWeeklyRecapSeen: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/api/app.api', () => ({ getFeatures: vi.fn() }));
vi.mock('../src/sockets/socketClient', () => ({ emit: vi.fn(), getSocket: () => ({ on() {}, off() {} }), connectSocket: vi.fn() }));

import * as lb from '../src/api/leaderboards.api';
import { getFeatures } from '../src/api/app.api';
import Leaderboards from '../src/screens/leaderboard/Leaderboards';
import Play from '../src/screens/play/Play';
import WeeklyRecap from '../src/components/social/WeeklyRecap';
import { useAuthStore } from '../src/stores/authStore';
import { formatTimeLeft, matchesNeededText } from '../src/lib/week';

const week = { weekId: '2026-11-02', weekEndsAt: '2026-11-09T00:00:00.000Z', state: 'OPEN', rankedOpen: true };
const items = [
  { rank: 1, userId: 'bot1', username: 'Nova', handle: 'nova', avatarUrl: null, value: 120, isBot: true },
  { rank: 2, userId: 'h2', username: 'Ada', handle: 'ada', avatarUrl: null, value: 80, isBot: false },
  { rank: 3, userId: 'h3', username: 'Bo', handle: 'bo', avatarUrl: null, value: 60, isBot: false },
  { rank: 4, userId: 'h4', username: 'Cy', handle: 'cy', avatarUrl: null, value: 40, isBot: false },
];

function mount(element) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'token', user: { id: 'me', username: 'me' } });
  getFeatures.mockResolvedValue({ weeklyLeaderboard: true });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('weekly leaderboard screen', () => {
  it('shows when the week resets, and a locked rank slot with how many matches are left', async () => {
    lb.getRatingLeaderboard.mockResolvedValue({
      items, limit: 20, week,
      me: { eligible: false, rank: null, matchesPlayed: 1, matchesNeeded: 2, userId: 'me', username: 'Me', avatarUrl: null, value: 30 },
    });
    mount(<Leaderboards />);
    expect(await screen.findByTestId('locked-rank')).toBeTruthy();
    expect(screen.getByText('2 more ranked matches to unlock your rank')).toBeTruthy();
    expect(screen.getByTestId('week-end').textContent).toMatch(/Resets/);
    // No rank number for the locked player, and the board is still browsable.
    expect(screen.queryByText('You', { selector: '.you-label' })).toBeNull();
    expect(screen.getByText('Cy')).toBeTruthy();
  });

  it('shows the real rank once the player is eligible', async () => {
    lb.getRatingLeaderboard.mockResolvedValue({
      items, limit: 20, week,
      me: { eligible: true, rank: 7, matchesPlayed: 5, matchesNeeded: 0, userId: 'me', username: 'Me', avatarUrl: null, value: 20 },
    });
    mount(<Leaderboards />);
    expect(await screen.findByText('7')).toBeTruthy();
    expect(screen.queryByTestId('locked-rank')).toBeNull();
  });

  it('is a ratings board only: no switch between boards, and no points anywhere', async () => {
    lb.getRatingLeaderboard.mockResolvedValue({ items, limit: 20, week, me: null });
    mount(<Leaderboards />);
    await screen.findByText('Nova');
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByText(/points/i)).toBeNull();
    expect(screen.getAllByText('rating').length).toBeGreaterThan(0);
    expect(lb.getRatingLeaderboard).toHaveBeenCalledTimes(1);
  });

  it('lists a bot but does not make it tappable', async () => {
    lb.getRatingLeaderboard.mockResolvedValue({ items, limit: 20, week, me: null });
    mount(<Leaderboards />);
    await screen.findByText('Nova');
    expect(screen.queryByRole('button', { name: 'Nova' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ada' })).toBeTruthy();
  });
});

describe('ranked closed while the week resets', () => {
  it('disables Find opponents for ranked with an explanation, and keeps casual open', async () => {
    lb.getWeeklyStatus.mockResolvedValue({ ...week, state: 'CLOSING', rankedOpen: false });
    mount(<Play />);
    const find = await screen.findByRole('button', { name: /Find opponents/ });
    await waitFor(() => expect(find.disabled).toBe(true));
    expect(screen.getByText('The week is closing. Ranked matches reopen in a few minutes.')).toBeTruthy();

    act(() => screen.getByRole('button', { name: /Casual/ }).click());
    expect(screen.getByRole('button', { name: /Find opponents/ }).disabled).toBe(false);
    expect(screen.queryByText('The week is closing. Ranked matches reopen in a few minutes.')).toBeNull();
    act(() => screen.getByRole('button', { name: /Custom/ }).click());
    expect(screen.getByRole('button', { name: /Create a room/ }).disabled).toBe(false);
  });

  it('blocks a tap with a dialog when the screen still thought ranked was open', async () => {
    // The first answer (the screen opening) says open; by the time of the tap the server says closed.
    lb.getWeeklyStatus.mockResolvedValueOnce(week).mockResolvedValue({ ...week, state: 'CLOSING', rankedOpen: false });
    mount(<Play />);
    const find = await screen.findByRole('button', { name: /Find opponents/ });
    // Wait for the screen's own (open) answer, so the tap is the second, fresher question.
    await waitFor(() => expect(lb.getWeeklyStatus).toHaveBeenCalledTimes(1));
    expect(find.disabled).toBe(false);
    await act(async () => { find.click(); });
    expect(await screen.findByRole('button', { name: 'OK' })).toBeTruthy();
    expect(screen.getByText(/Ranked is closed/)).toBeTruthy();
  });

  it('leaves ranked open when the weekly feature is off', async () => {
    getFeatures.mockResolvedValue({ weeklyLeaderboard: false });
    mount(<Play />);
    const find = await screen.findByRole('button', { name: /Find opponents/ });
    expect(find.disabled).toBe(false);
    expect(lb.getWeeklyStatus).not.toHaveBeenCalled();
  });
});

describe('weekly recap', () => {
  const recap = {
    weekId: '2026-10-26',
    top: [
      { position: 1, userId: 'h2', handle: 'ada', displayName: 'Ada', avatarUrl: null, rating: 900, isBot: false, openable: true },
      { position: 2, userId: 'bot1', handle: null, displayName: 'Nova', avatarUrl: null, rating: 700, isBot: true, openable: false },
      { position: 3, userId: 'h3', handle: null, displayName: 'Bo', avatarUrl: null, rating: 500, isBot: false, openable: false },
    ],
    me: { position: 6, rating: 300 },
  };

  it('shows the top 3 once, marks the week seen, and only opens profiles it is allowed to', async () => {
    lb.getWeeklyRecap.mockResolvedValue(recap);
    mount(<WeeklyRecap />);
    expect(await screen.findByText("Last week's top players")).toBeTruthy();
    await waitFor(() => expect(lb.markWeeklyRecapSeen).toHaveBeenCalledWith('2026-10-26'));
    expect(lb.markWeeklyRecapSeen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Ada/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Nova/ })).toBeNull(); // bot
    expect(screen.queryByRole('button', { name: /^3 Bo/ })).toBeNull(); // blocked pair, shown but not tappable
    expect(screen.getByText('Bo')).toBeTruthy();
    expect(screen.getByText(/You finished 6th with 300/)).toBeTruthy();
  });

  it('shows nothing when there is no recap', async () => {
    lb.getWeeklyRecap.mockResolvedValue(null);
    mount(<WeeklyRecap />);
    await waitFor(() => expect(lb.getWeeklyRecap).toHaveBeenCalled());
    expect(screen.queryByText("Last week's top players")).toBeNull();
    expect(lb.markWeeklyRecapSeen).not.toHaveBeenCalled();
  });

  it('does not ask while another welcome prompt is showing, and not at all when the feature is off', async () => {
    mount(<WeeklyRecap canShow={false} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(lb.getWeeklyRecap).not.toHaveBeenCalled();
    cleanup();
    getFeatures.mockResolvedValue({ weeklyLeaderboard: false });
    mount(<WeeklyRecap />);
    await new Promise((r) => setTimeout(r, 20));
    expect(lb.getWeeklyRecap).not.toHaveBeenCalled();
  });
});

describe('week helpers', () => {
  it('words the matches left correctly', () => {
    expect(matchesNeededText(1)).toBe('1 more ranked match to unlock your rank');
    expect(matchesNeededText(2)).toBe('2 more ranked matches to unlock your rank');
  });
  it('formats the time left', () => {
    const now = Date.parse('2026-11-04T00:00:00Z');
    expect(formatTimeLeft('2026-11-09T05:00:00Z', now)).toBe('5d 5h');
    expect(formatTimeLeft('2026-11-04T02:30:00Z', now)).toBe('2h 30m');
    expect(formatTimeLeft('2026-11-03T00:00:00Z', now)).toBe('now');
  });
});
