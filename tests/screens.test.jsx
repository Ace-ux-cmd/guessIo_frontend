import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

// No real network: every request fails fast, so each screen shows its loading or error state.
vi.mock('../src/api/client', async () => {
  const actual = await vi.importActual('../src/api/client');
  const fail = () => Promise.reject(Object.assign(new Error('offline'), { response: { status: 503, data: {} } }));
  return { ...actual, apiClient: { get: fail, post: fail, patch: fail, delete: fail, interceptors: { request: { use() {} }, response: { use() {} } }, defaults: { headers: { common: {} } } } };
});

import Login from '../src/screens/auth/Login';
import GuestHome from '../src/screens/guest/GuestHome';
import Play from '../src/screens/play/Play';
import Dashboard from '../src/screens/dashboard/Dashboard';
import Leaderboards from '../src/screens/leaderboard/Leaderboards';
import MatchHistory from '../src/screens/history/MatchHistory';
import Profile from '../src/screens/profile/Profile';
import Achievements from '../src/screens/profile/Achievements';
import PlayerProfile from '../src/screens/profile/PlayerProfile';
import Settings from '../src/screens/settings/Settings';
import Support from '../src/screens/support/Support';
import Friends from '../src/screens/friends/Friends';
import FriendSearch from '../src/screens/friends/FriendSearch';
import Daily from '../src/screens/daily/Daily';
import GuestResults from '../src/screens/results/GuestResults';
import GuestGameplay from '../src/screens/gameplay/GuestGameplay';
import PrivateRoom from '../src/screens/play/PrivateRoom';
import { NoConnection, ServerError, RoomNotFound, NotFound, Maintenance, Unauthorized } from '../src/screens/errors/ErrorScreens';

afterEach(cleanup);

function at(element, url = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>{element}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('every screen renders without throwing', () => {
  const cases = [
    ['Login', <Login />, '/login'],
    ['GuestHome', <GuestHome />, '/guest-home'],
    ['Play (guest)', <Play />, '/play?guest=1'],
    ['Play (pass and play)', <Play />, '/play?guest=1&mode=PASS_AND_PLAY'],
    ['Dashboard', <Dashboard />, '/dashboard'],
    ['Leaderboards', <Leaderboards />, '/leaderboards'],
    ['MatchHistory', <MatchHistory />, '/history'],
    ['Profile', <Profile />, '/profile'],
    ['Achievements', <Achievements />, '/profile/achievements'],
    ['PlayerProfile', <PlayerProfile />, '/players/x'],
    ['Settings', <Settings />, '/settings'],
    ['Support', <Support />, '/support'],
    ['Friends', <Friends />, '/friends'],
    ['FriendSearch', <FriendSearch />, '/friends/add'],
    ['Daily', <Daily />, '/daily'],
    ['GuestResults', <GuestResults />, '/results/guest?winnerId=guest&mode=VS_COMPUTER&score=2-1&rounds=3'],
    ['GuestGameplay', <GuestGameplay />, '/gameplay/guest?mode=VS_COMPUTER&difficulty=STANDARD&roundTier=EASY'],
    ['PrivateRoom', <PrivateRoom />, '/private-room?difficulty=STANDARD&playerCount=2'],
    ['NoConnection', <NoConnection />, '/'],
    ['ServerError', <ServerError />, '/'],
    ['RoomNotFound', <RoomNotFound />, '/'],
    ['NotFound', <NotFound />, '/'],
    ['Maintenance', <Maintenance />, '/'],
    ['Unauthorized', <Unauthorized />, '/'],
  ];
  it.each(cases)('%s', (_name, element, url) => {
    const { container } = at(element, url);
    expect(container.textContent.length).toBeGreaterThan(0);
  });
});

describe('guest play screen', () => {
  it('tells guests their matches are not saved, below the setup', () => {
    at(<Play />, '/play?guest=1');
    const name = screen.getByText(/Your name/);
    const note = screen.getByText('Guest matches are not saved to an account.');
    expect(name.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('new match', () => {
  it('calls the friends option Custom, not Private', async () => {
    const { useAuthStore } = await import('../src/stores/authStore');
    useAuthStore.setState({ accessToken: 'x', refreshToken: 'y', user: { id: 'u', username: 'me' } });
    at(<Play />, '/play');
    expect(screen.getByText('Custom')).toBeTruthy();
    expect(screen.queryByText(/Private/)).toBeNull();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
  });
});
