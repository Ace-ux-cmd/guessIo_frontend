import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GuessBoard from '../src/components/gameplay/GuessBoard';

const guestState = { pending: true };
const guestPlayers = [
  { id: 'guest', name: 'Guest', roundsWon: 2, isBot: false },
  { id: 'system', name: 'System', roundsWon: 0, isBot: true },
];
const finishedRound = { roundNumber: 2, secretCode: '4721', winnerId: 'guest', status: 'COMPLETED', codeLength: 4, guessLimit: 10, guessLog: [{ playerId: 'guest', guess: '4721', feedback: null }] };
const advance = vi.fn();

vi.mock('../src/hooks/useGuestMatch', () => ({
  findResumableGuestMatch: () => null,
  useGuestMatch: () => ({
    match: {
      players: guestPlayers,
      status: 'COMPLETED',
      winnerId: 'guest',
      activePlayerId: 'guest',
      isLocalPassAndPlay: false,
      currentRound: finishedRound,
      rounds: [finishedRound],
    },
    humanId: 'guest',
    submitGuess: vi.fn(),
    abandonMatch: vi.fn(),
    pendingRoundAdvance: guestState.pending,
    advanceToNextRound: advance,
  }),
}));

vi.mock('../src/api/profile.api', () => ({
  getPublicProfile: () => Promise.resolve({
    username: 'testplayer', displayName: 'Test_player', rank: 3, rating: 39, points: 24, relationship: 'NONE', canRequest: true,
    createdAt: '2026-10-05T10:00:00Z', statistics: { matchesPlayed: 12, matchesWon: 8, matchesLost: 4, matchesDrawn: 0 }, achievements: [],
  }),
}));
const sendFriendRequest = vi.fn(() => Promise.resolve({}));
vi.mock('../src/api/friends.api', () => ({
  sendFriendRequest: (...a) => sendFriendRequest(...a),
  acceptFriendRequest: vi.fn(), cancelFriendRequest: vi.fn(), removeFriend: vi.fn(),
}));
vi.mock('../src/hooks/useFeatures', () => ({ useFeatures: () => ({ friends: true, safety: true }) }));

import GuestGameplay from '../src/screens/gameplay/GuestGameplay';
import PlayerProfile from '../src/screens/profile/PlayerProfile';
import { useAuthStore } from '../src/stores/authStore';

afterEach(() => { cleanup(); vi.clearAllMocks(); guestState.pending = true; });

describe('guess board avatars', () => {
  it('shows each player avatar beside their guess instead of initials', () => {
    const players = [{ userId: 'a', username: 'Ace', avatarUrl: '/avatars/a.png' }, { userId: 'b', username: 'Dex' }];
    const guessLog = [{ playerId: 'a', guess: '1234', guessNumber: 1 }, { playerId: 'b', guess: '5678', guessNumber: 2 }];
    const { container } = render(<GuessBoard guessLog={guessLog} players={players} difficulty="STANDARD" myUserId="a" myFeedbackHistory={[]} />);
    const rows = container.querySelectorAll('.guess-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('[aria-label="Ace"]').style.backgroundImage).toContain('/avatars/a.png');
    expect(rows[1].querySelector('svg')).not.toBeNull();
    expect(container.textContent).not.toMatch(/\bAC\b|\bDE\b/);
  });
});

describe('guest final round to results', () => {
  it('goes straight to the match results and never paints the game board', () => {
    const tree = () => (
      <MemoryRouter initialEntries={['/gameplay/guest?mode=VS_COMPUTER']}>
        <Routes>
          <Route path="/gameplay/guest" element={<GuestGameplay />} />
          <Route path="/results/guest" element={<p>results screen</p>} />
        </Routes>
      </MemoryRouter>
    );
    const { rerender } = render(tree());
    fireEvent.click(screen.getByRole('button', { name: 'View match results' }));
    expect(advance).toHaveBeenCalledTimes(1);
    expect(screen.getByText('results screen')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Go' })).toBeNull();
    // Even if the hook reports the pause as over before the route changes, no board is drawn.
    guestState.pending = false;
    rerender(tree());
    expect(screen.queryByRole('button', { name: 'Go' })).toBeNull();
  });
});

describe('other player profile', () => {
  function mount() {
    useAuthStore.setState({ accessToken: 'tok', user: { username: 'me' } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/players/testplayer']}>
          <Routes><Route path="/players/:username" element={<PlayerProfile />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('uses the same rank pill text as My Profile, toned by position', async () => {
    mount();
    const pill = await screen.findByText('Rank #3 on the leaderboard');
    expect(pill.className).toContain('top-ten');
    expect(pill.className).toContain('bronze');
  });

  it('puts a small friend button beside the name and sends the request', async () => {
    mount();
    const heading = await screen.findByRole('heading', { name: 'Test_player' });
    const button = screen.getByRole('button', { name: 'Send friend request to Test_player' });
    expect(heading.parentElement.classList.contains('player-name-anchor')).toBe(true);
    expect(heading.parentElement.contains(button)).toBe(true);
    fireEvent.click(button);
    await waitFor(() => expect(sendFriendRequest).toHaveBeenCalledWith('testplayer'));
  });
});
