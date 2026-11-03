import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/sockets/socketClient', () => ({ emit: vi.fn(), getSocket: vi.fn(), connectSocket: vi.fn() }));

import Results from '../src/screens/results/Results';
import { useMatchStore } from '../src/stores/matchStore';
import { useAuthStore } from '../src/stores/authStore';
import { ratingTransition } from '../src/lib/format';

afterEach(() => { cleanup(); useMatchStore.getState().reset(); useAuthStore.setState({ user: null }); });

const players = [
  { userId: 'me', username: 'Ace', rating: 1285 },
  { userId: 'dex', username: 'Dex', rating: 1300 },
];

function seed(ratingChanges, winnerId = 'me') {
  useAuthStore.setState({ user: { id: 'me', username: 'Ace' } });
  useMatchStore.setState({
    status: 'ENDED',
    matchId: 'm1',
    players,
    config: { matchType: 'RANKED', difficulty: 'STANDARD' },
    matchResult: { winnerId, finalScore: { me: 2, dex: 1 }, ratingChanges, pointsEarned: { me: 5, dex: 2 } },
  });
  return render(<MemoryRouter><Results /></MemoryRouter>);
}

const valueOf = (label) => screen.getByText(label).nextElementSibling;

describe('ratingTransition', () => {
  it('shows old to new and tones the whole string', () => {
    expect(ratingTransition(1300, -18)).toEqual({ text: '1300 \u2192 1282', tone: 'text-[#FF6B6B]', change: -18 });
    expect(ratingTransition(1285, 24)).toEqual({ text: '1285 \u2192 1309', tone: 'text-g', change: 24 });
    expect(ratingTransition(1285, 0)).toEqual({ text: '1285 \u2192 1285', tone: '', change: 0 });
  });
  it('never takes a rating below 0', () => {
    expect(ratingTransition(0, -11)).toEqual({ text: '0 \u2192 0', tone: '', change: 0 });
    expect(ratingTransition(11, -30)).toEqual({ text: '11 \u2192 0', tone: 'text-[#FF6B6B]', change: -11 });
  });
  it('falls back to the old rating when there is no change, and to null when unknown', () => {
    expect(ratingTransition(1285, undefined)).toEqual({ text: '1285', tone: '', change: undefined });
    expect(ratingTransition(undefined, 5)).toBeNull();
  });
});

describe('ranked results ratings', () => {
  it('shows the opponent as old to new, in the same colour as their change', () => {
    seed({ me: 24, dex: -24 });
    const mine = valueOf('Rating');
    const theirs = valueOf('Opponent rating');
    expect(mine.textContent).toBe('1285 \u2192 1309 (+24)');
    expect(mine.className).toContain('text-g');
    expect(theirs.textContent).toBe('1300 \u2192 1276');
    expect(theirs.className).toContain('text-[#FF6B6B]');
    expect(theirs.textContent).not.toMatch(/^1300$/);
  });

  it('shows an opponent on 0 who loses as 0 to 0 in plain colour, and my own line floored too', () => {
    useAuthStore.setState({ user: { id: 'me', username: 'Ace' } });
    useMatchStore.setState({
      status: 'ENDED', matchId: 'm1', config: { matchType: 'RANKED', difficulty: 'STANDARD' },
      players: [{ userId: 'me', username: 'Ace', rating: 5 }, { userId: 'dex', username: 'Dex', rating: 0 }],
      matchResult: { winnerId: 'dex', finalScore: { me: 0, dex: 2 }, ratingChanges: { me: -11, dex: -11 }, pointsEarned: { me: 1, dex: 5 } },
    });
    render(<MemoryRouter><Results /></MemoryRouter>);
    expect(valueOf('Opponent rating').textContent).toBe('0 \u2192 0');
    expect(valueOf('Opponent rating').className).not.toContain('text-g');
    expect(valueOf('Opponent rating').className).not.toContain('FF6B6B');
    expect(valueOf('Rating').textContent).toBe('5 \u2192 0 (-5)');
  });

  it('colours a gaining opponent green', () => {
    seed({ me: -10, dex: 10 }, 'dex');
    expect(valueOf('Opponent rating').textContent).toBe('1300 \u2192 1310');
    expect(valueOf('Opponent rating').className).toContain('text-g');
  });

  it('names each opponent when there are several', () => {
    useAuthStore.setState({ user: { id: 'me', username: 'Ace' } });
    useMatchStore.setState({
      status: 'ENDED', matchId: 'm1', config: { matchType: 'RANKED', difficulty: 'STANDARD' },
      players: [...players, { userId: 'fox', username: 'Fox', rating: 1250 }],
      matchResult: { winnerId: 'me', finalScore: { me: 2, dex: 1, fox: 0 }, ratingChanges: { me: 30, dex: -12, fox: -18 }, pointsEarned: { me: 5, dex: 2, fox: 2 } },
    });
    render(<MemoryRouter><Results /></MemoryRouter>);
    expect(valueOf('Dex rating').textContent).toBe('1300 \u2192 1288');
    expect(valueOf('Fox rating').textContent).toBe('1250 \u2192 1232');
  });

  it('shows no rating rows in casual matches', () => {
    useAuthStore.setState({ user: { id: 'me', username: 'Ace' } });
    useMatchStore.setState({ status: 'ENDED', matchId: 'm1', players, config: { matchType: 'CASUAL', difficulty: 'STANDARD' }, matchResult: { winnerId: 'me', finalScore: { me: 2, dex: 1 }, pointsEarned: { me: 3, dex: 1 } } });
    render(<MemoryRouter><Results /></MemoryRouter>);
    expect(screen.queryByText('Opponent rating')).toBeNull();
    expect(screen.queryByText('Rating')).toBeNull();
  });
});

describe('results exit buttons', () => {
  function mountWithRoutes() {
    return render(
      <MemoryRouter initialEntries={['/results']}>
        <Routes>
          <Route path="/results" element={<Results />} />
          <Route path="/play" element={<p>play screen</p>} />
          <Route path="/dashboard" element={<p>home screen</p>} />
          <Route path="/history/:id" element={<p>details screen</p>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('stacks Play again, Match details and Back home in that order', () => {
    seed({ me: 24, dex: -24 });
    const play = screen.getByRole('button', { name: 'Play again' });
    const details = screen.getByRole('button', { name: 'Match details' });
    const home = screen.getByRole('button', { name: 'Back home' });
    expect(play.parentElement).toBe(home.parentElement);
    expect(play.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(details.compareDocumentPosition(home) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('says Try again after a loss', () => {
    seed({ me: -24, dex: 24 }, 'dex');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('shows Back home alone when I forfeited', () => {
    useAuthStore.setState({ user: { id: 'me', username: 'Ace' } });
    useMatchStore.setState({ status: 'ENDED', matchId: 'm1', players, config: { matchType: 'RANKED', difficulty: 'STANDARD' }, matchResult: { winnerId: 'dex', forfeitedUserId: 'me', finalScore: {}, ratingChanges: { me: -20, dex: 5 }, pointsEarned: {} } });
    render(<MemoryRouter><Results /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /Play again|Try again/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Back home' })).toBeTruthy();
  });

  it('omits Match details for custom matches', () => {
    useAuthStore.setState({ user: { id: 'me', username: 'Ace' } });
    useMatchStore.setState({ status: 'ENDED', matchId: 'm1', players, config: { matchType: 'PRIVATE', difficulty: 'STANDARD' }, matchResult: { winnerId: 'me', finalScore: { me: 2, dex: 1 } } });
    render(<MemoryRouter><Results /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Match details' })).toBeNull();
  });

  it('leaves once, never flashes the cancelled view, and clears the match', () => {
    seed({ me: 24, dex: -24 });
    cleanup();
    const reset = vi.spyOn(useMatchStore.getState(), 'reset');
    useAuthStore.setState({ user: { id: 'me', username: 'Ace' } });
    useMatchStore.setState({ status: 'ENDED', matchId: 'm1', players, config: { matchType: 'RANKED', difficulty: 'STANDARD' }, matchResult: { winnerId: 'me', finalScore: { me: 2, dex: 1 }, ratingChanges: { me: 24, dex: -24 }, pointsEarned: { me: 5, dex: 2 } }, reset });
    mountWithRoutes();
    const home = screen.getByRole('button', { name: 'Back home' });
    const play = screen.getByRole('button', { name: 'Play again' });
    fireEvent.click(home);
    fireEvent.click(play); // a quick second tap on a different button must be ignored
    expect(screen.getByText('home screen')).toBeTruthy();
    expect(document.body.textContent).not.toContain('Match cancelled');
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('opens match details with the right match id', () => {
    seed({ me: 24, dex: -24 });
    cleanup();
    useAuthStore.setState({ user: { id: 'me', username: 'Ace' } });
    useMatchStore.setState({ status: 'ENDED', matchId: 'm7', players, config: { matchType: 'RANKED', difficulty: 'STANDARD' }, matchResult: { winnerId: 'me', finalScore: { me: 2, dex: 1 }, ratingChanges: { me: 24, dex: -24 } } });
    mountWithRoutes();
    fireEvent.click(screen.getByRole('button', { name: 'Match details' }));
    expect(screen.getByText('details screen')).toBeTruthy();
  });
});
