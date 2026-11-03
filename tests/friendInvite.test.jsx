import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const emit = vi.fn();
let listeners = {};
const socket = {
  connected: true,
  on: (event, fn) => { listeners[event] = fn; },
  off: (event) => { delete listeners[event]; },
};
const fire = (event, payload) => act(() => listeners[event]?.({ event, payload }));

vi.mock('../src/sockets/socketClient', () => ({
  emit: (...args) => emit(...args),
  getSocket: () => socket,
  connectSocket: () => socket,
}));
vi.mock('../src/hooks/useMatchSocket', () => ({ useMatchSocket: () => {} }));
vi.mock('../src/hooks/useReconnectGate', () => ({ useReconnectGate: () => ({ exhausted: false, retry: vi.fn() }) }));
let features = { skills: false, friendInvites: true };
vi.mock('../src/hooks/useFeatures', () => ({ useFeatures: () => features }));

import PrivateRoom from '../src/screens/play/PrivateRoom';
import InvitePrompt from '../src/components/social/InvitePrompt';
import { useAuthStore } from '../src/stores/authStore';
import { useMatchStore } from '../src/stores/matchStore';

const FRIEND = { userId: 'friend-id', name: 'Dex' };
const roomPayload = (overrides = {}) => ({
  roomId: 'r1', roomCode: 'K7M42Q', hostUserId: 'host',
  players: [{ userId: 'host', username: 'Host', avatarUrl: null, ready: true }],
  playerCount: 2, difficulty: 'STANDARD', skills: false, status: 'WAITING', ...overrides,
});

function Where() { const l = useLocation(); return <p data-testid="where">{l.pathname}</p>; }
function renderAt(entry, element) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes><Route path="*" element={<>{element}<Where /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
const challenge = () => renderAt({ pathname: '/private-room', search: '?difficulty=STANDARD&playerCount=2', state: { invite: FRIEND } }, <PrivateRoom />);

beforeEach(() => {
  emit.mockReset();
  listeners = {};
  features = { skills: false, friendInvites: true };
  useAuthStore.setState({ accessToken: 't', user: { id: 'host', username: 'Host' } });
  useMatchStore.getState().reset();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('challenging a friend', () => {
  it('creates the room naming the friend, and shows the invite state with a countdown', () => {
    challenge();
    expect(screen.getByRole('heading', { name: 'Challenge Dex' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create room and invite' }));
    expect(emit).toHaveBeenCalledWith('room.create', { playerCount: 2, difficulty: 'STANDARD', skills: false, inviteUserId: 'friend-id' });

    fire('room.playerJoined', { room: roomPayload() });
    fire('room.inviteResult', { sent: true, inviteId: 'i1', expiresAt: new Date(Date.now() + 45_000).toISOString() });
    expect(screen.getByText(/Invite sent to Dex/)).toBeTruthy();
    expect(screen.getByTestId('invite-status').textContent).toMatch(/\(4\ds\)/);
  });

  it.each([
    ['OFFLINE', 'Dex is offline. Share the room code instead.'],
    ['BUSY', 'Dex is in a match.'],
    ['NOT_AVAILABLE', 'Could not invite Dex.'],
  ])('says why when the invite was not sent (%s) and keeps the room', (reason, text) => {
    challenge();
    fireEvent.click(screen.getByRole('button', { name: 'Create room and invite' }));
    fire('room.playerJoined', { room: roomPayload() });
    fire('room.inviteResult', { sent: false, reason });
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.getByText('K7M-42Q')).toBeTruthy(); // the code can still be shared
  });

  it('shows a decline and offers to invite again', () => {
    challenge();
    fireEvent.click(screen.getByRole('button', { name: 'Create room and invite' }));
    fire('room.playerJoined', { room: roomPayload() });
    fire('room.inviteResult', { sent: true, inviteId: 'i1', expiresAt: new Date(Date.now() + 60_000).toISOString() });
    fire('room.inviteDeclined', { inviteId: 'i1' });
    expect(screen.getByText('Dex declined the invite.')).toBeTruthy();
    emit.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Invite again' }));
    expect(emit).toHaveBeenCalledWith('room.create', expect.objectContaining({ inviteUserId: 'friend-id' }));
  });

  it('shows expiry once the time runs out, and offers Invite again', () => {
    vi.useFakeTimers();
    challenge();
    fireEvent.click(screen.getByRole('button', { name: 'Create room and invite' }));
    fire('room.playerJoined', { room: roomPayload() });
    fire('room.inviteResult', { sent: true, inviteId: 'i1', expiresAt: new Date(Date.now() + 3_000).toISOString() });
    act(() => { vi.advanceTimersByTime(4_000); });
    expect(screen.getByText('The invite to Dex expired.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Invite again' })).toBeTruthy();
  });

  it('hides the invite state once the friend has joined', () => {
    challenge();
    fireEvent.click(screen.getByRole('button', { name: 'Create room and invite' }));
    fire('room.playerJoined', { room: roomPayload() });
    fire('room.inviteResult', { sent: true, inviteId: 'i1', expiresAt: new Date(Date.now() + 60_000).toISOString() });
    fire('room.playerJoined', { room: roomPayload({ players: [
      { userId: 'host', username: 'Host', ready: true }, { userId: 'friend-id', username: 'Dex', ready: true },
    ] }) });
    expect(screen.queryByTestId('invite-status')).toBeNull();
  });

  it('plain room creation sends no inviteUserId', () => {
    renderAt('/private-room?difficulty=STANDARD&playerCount=2', <PrivateRoom />);
    fireEvent.click(screen.getByRole('button', { name: 'Create room' }));
    expect(emit.mock.calls[0][1]).not.toHaveProperty('inviteUserId');
  });

  it('joins by code with the invite id when arriving from an accepted invite, once', () => {
    renderAt({ pathname: '/private-room', state: { joinInvite: { roomCode: 'K7M42Q', inviteId: 'i1' } } }, <PrivateRoom />);
    expect(emit).toHaveBeenCalledWith('room.join', { roomCode: 'K7M42Q', inviteId: 'i1' });
    expect(emit.mock.calls.filter(([e]) => e === 'room.join')).toHaveLength(1);
  });

  it('shows the server refusal when the invite is no longer available', () => {
    renderAt({ pathname: '/private-room', state: { joinInvite: { roomCode: 'K7M42Q', inviteId: 'i1' } } }, <PrivateRoom />);
    fire('guess.rejected', { code: 'INVITE_EXPIRED', message: 'This invite is no longer available.' });
    expect(screen.getByText('This invite is no longer available.')).toBeTruthy();
  });
});

describe('receiving an invite', () => {
  const invite = (over = {}) => ({
    inviteId: 'i1', roomCode: 'K7M42Q', from: { userId: 'host', username: 'Ada', avatarUrl: null },
    difficulty: 'HARDCORE', playerCount: 2, expiresAt: new Date(Date.now() + 60_000).toISOString(), ...over,
  });

  it('shows who challenged, the setup and a countdown, and Decline tells the server', () => {
    renderAt('/dashboard', <InvitePrompt />);
    fire('room.invited', invite());
    expect(screen.getByText('Ada challenged you to a private match')).toBeTruthy();
    expect(screen.getByText(/Hardcore/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(emit).toHaveBeenCalledWith('room.invite.decline', { inviteId: 'i1' });
    expect(screen.queryByText(/challenged you/)).toBeNull();
  });

  it('Accept goes to the private room carrying the code and invite id', () => {
    renderAt('/friends', <InvitePrompt />);
    fire('room.invited', invite());
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(screen.getByTestId('where').textContent).toBe('/private-room');
  });

  it('shows only the latest invite and ignores a repeat of the same one', () => {
    renderAt('/dashboard', <InvitePrompt />);
    fire('room.invited', invite());
    fire('room.invited', invite({ inviteId: 'i2', from: { userId: 'x', username: 'Bo', avatarUrl: null } }));
    expect(screen.queryByText('Ada challenged you to a private match')).toBeNull();
    expect(screen.getByText('Bo challenged you to a private match')).toBeTruthy();
    fire('room.invited', invite({ inviteId: 'i2', from: { userId: 'x', username: 'Cy', avatarUrl: null } }));
    expect(screen.getByText('Bo challenged you to a private match')).toBeTruthy();
  });

  it('is dismissed when the server cancels that invite, but not by a cancel for another one', () => {
    renderAt('/dashboard', <InvitePrompt />);
    fire('room.invited', invite());
    fire('room.inviteCancelled', { inviteId: 'other', reason: 'EXPIRED' });
    expect(screen.getByText(/challenged you/)).toBeTruthy();
    fire('room.inviteCancelled', { inviteId: 'i1', reason: 'HOST_LEFT' });
    expect(screen.queryByText(/challenged you/)).toBeNull();
  });

  it('disappears when its time runs out', () => {
    vi.useFakeTimers();
    renderAt('/dashboard', <InvitePrompt />);
    fire('room.invited', invite({ expiresAt: new Date(Date.now() + 2_000).toISOString() }));
    expect(screen.getByText(/challenged you/)).toBeTruthy();
    act(() => { vi.advanceTimersByTime(3_000); });
    expect(screen.queryByText(/challenged you/)).toBeNull();
  });

  it('is ignored during a match, a search or in a room', () => {
    for (const path of ['/gameplay', '/matchmaking?matchType=RANKED', '/private-room']) {
      cleanup();
      listeners = {};
      renderAt(path, <InvitePrompt />);
      fire('room.invited', invite({ inviteId: `i-${path}` }));
      expect(screen.queryByText(/challenged you/)).toBeNull();
    }
    cleanup();
    listeners = {};
    useMatchStore.setState({ status: 'ACTIVE' });
    renderAt('/dashboard', <InvitePrompt />);
    fire('room.invited', invite({ inviteId: 'in-match' }));
    expect(screen.queryByText(/challenged you/)).toBeNull();
  });

  it('does nothing when the feature is off or the player is signed out', () => {
    features = { friendInvites: false };
    renderAt('/dashboard', <InvitePrompt />);
    expect(listeners['room.invited']).toBeUndefined();
    cleanup();
    features = { friendInvites: true };
    useAuthStore.setState({ accessToken: null });
    renderAt('/dashboard', <InvitePrompt />);
    expect(listeners['room.invited']).toBeUndefined();
  });
});
