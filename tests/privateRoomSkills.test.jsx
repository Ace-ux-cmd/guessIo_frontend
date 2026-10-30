import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const emit = vi.fn();
const listeners = {};
const socket = {
  connected: true,
  on: (event, fn) => { listeners[event] = fn; },
  off: vi.fn(),
};

vi.mock('../src/sockets/socketClient', () => ({
  emit: (...args) => emit(...args),
  getSocket: () => socket,
  connectSocket: vi.fn(),
}));
vi.mock('../src/hooks/useMatchSocket', () => ({ useMatchSocket: () => {} }));
vi.mock('../src/hooks/useReconnectGate', () => ({ useReconnectGate: () => ({ exhausted: false, retry: vi.fn() }) }));

let features = { skills: true };
vi.mock('../src/hooks/useFeatures', () => ({ useFeatures: () => features }));

import PrivateRoom from '../src/screens/play/PrivateRoom';
import { useAuthStore } from '../src/stores/authStore';

function renderRoom() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/private-room?difficulty=STANDARD&playerCount=3']}>
        <PrivateRoom />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const room = (overrides = {}) => ({
  roomId: 'r1',
  roomCode: 'K7M42Q',
  hostUserId: 'host',
  players: [{ userId: 'host', username: 'Host', avatarUrl: null, ready: true }],
  playerCount: 3,
  difficulty: 'STANDARD',
  skills: true,
  status: 'WAITING',
  ...overrides,
});

beforeEach(() => {
  emit.mockReset();
  features = { skills: true };
  useAuthStore.setState({ user: { id: 'host', username: 'Host' } });
});
afterEach(cleanup);

describe('custom room skills option', () => {
  it('creates the room with skills on by default', () => {
    renderRoom();
    expect(screen.getByRole('switch', { name: 'Skill power-ups' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Create room' }));
    expect(emit).toHaveBeenCalledWith('room.create', { playerCount: 3, difficulty: 'STANDARD', skills: true });
  });

  it('sends skills false after the host switches them off', () => {
    renderRoom();
    fireEvent.click(screen.getByRole('switch', { name: 'Skill power-ups' }));
    expect(screen.getByRole('switch', { name: 'Skill power-ups' }).getAttribute('aria-checked')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Create room' }));
    expect(emit).toHaveBeenCalledWith('room.create', { playerCount: 3, difficulty: 'STANDARD', skills: false });
  });

  it('hides the toggle and sends skills false when the server has skills disabled', () => {
    features = { skills: false };
    renderRoom();
    expect(screen.queryByRole('switch', { name: 'Skill power-ups' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Create room' }));
    expect(emit).toHaveBeenCalledWith('room.create', expect.objectContaining({ skills: false }));
  });

  it('joins with the plain code when the player types it with a dash and lower case', () => {
    renderRoom();
    fireEvent.change(screen.getByLabelText('Enter a room code'), { target: { value: 'k7m-42q' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join room' }));
    expect(emit).toHaveBeenCalledWith('room.join', { roomCode: 'K7M42Q' });
  });

  it('keeps Join disabled until the code has 6 characters', () => {
    renderRoom();
    fireEvent.change(screen.getByLabelText('Enter a room code'), { target: { value: 'K7M4' } });
    expect(screen.getByRole('button', { name: 'Join room' }).disabled).toBe(true);
  });

  it('lists the four skills in the waiting room only when the room has skills', () => {
    const { rerender } = renderRoom();
    const { act } = require('react');
    act(() => listeners['room.playerJoined']({ payload: { room: room() } }));
    expect(screen.getByRole('heading', { name: 'Skill slots' })).toBeTruthy();
    expect(screen.getByText('Reveal Position')).toBeTruthy();
    expect(screen.getByText('X-Ray Vision')).toBeTruthy();

    act(() => listeners['room.playerJoined']({ payload: { room: room({ skills: false }) } }));
    expect(screen.queryByRole('heading', { name: 'Skill slots' })).toBeNull();
    expect(screen.getByText(/Skills off/)).toBeTruthy();
    rerender(<div />);
  });
});
